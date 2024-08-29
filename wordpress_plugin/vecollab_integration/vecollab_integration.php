<?php

/**
 * Plugin Name: VE-Collab Platform Plugin
 * Description: Plugin to implement necessary integration functionaly of the VE-Collab platform with Wordpress
 * Version: 0.0.1
 * Author: Developers of KMI-KPZ/ve-collab
 * Author URI: https://github.com/KMI-KPZ/ve-collab
 * License: GPL2
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 */

if (!defined('ABSPATH')) {
    echo "No direct access please";
    exit();
}

/*
* enable jQuery and load js and css
*/
function vecollab_enqueue_scripts()
{
    wp_enqueue_script('jquery');
    wp_enqueue_style('vecollab-styles', plugin_dir_url(__FILE__) . 'style.css');
}
add_action('wp_enqueue_scripts', 'vecollab_enqueue_scripts');

/*
* when the plugin is activated, create a table in the db to store responses
* and start the cron job to periodically clean up the responses
*/
register_activation_hook(__FILE__, 'vecollab_activation_hook');
function vecollab_activation_hook()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'vecollab_responses';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE " . $table_name . " (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        response text NOT NULL,
        question_id varchar(255) DEFAULT '' NOT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);

    // schedule the cron job to clean up the responses (only keep 1000 most recent responses)
    if (! wp_next_scheduled('vecollab_clean_up_responses')) {
        wp_schedule_event(time(), 'five_seconds', 'vecollab_clean_up_responses');
    }
}

/*
* callback handler that is invoked by the daily cronjob (started in the activation hook)
* Cleans up the responses table by deleting all but the 1000 most recent responses
* quick and easy way to prevent the table from growing too large
* TODO: also clean up semantically (--> difficult: how to determine which responses are important?)
*/
function vecollab_clean_up_responses_handler()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'vecollab_responses';
    $sql = "DELETE FROM " . $table_name . " WHERE id NOT IN (SELECT id FROM (SELECT id FROM " . $table_name . " ORDER BY id DESC LIMIT 1000) foo)";
    $wpdb->query($sql);
    echo '<pre>'.print_r( "cleaned up", true ).'</pre>';
}
add_action('vecollab_clean_up_responses', 'vecollab_clean_up_responses_handler');


/*
* when the plugin is deactivated, stop the cleanup cron job
*/
register_deactivation_hook(__FILE__, 'vecollab_deactivation_hook');
function vecollab_deactivation_hook()
{
    wp_clear_scheduled_hook('vecollab_clean_up_responses');
}

add_filter('cron_schedules', 'example_add_cron_interval');
function example_add_cron_interval($schedules)
{
    $schedules['five_seconds'] = array(
        'interval' => 5,
        'display'  => esc_html__('Every Five Seconds'),
    );
    return $schedules;
}


include 'functions.php';
