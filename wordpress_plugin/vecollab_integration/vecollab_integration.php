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

 if( !defined('ABSPATH')){
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
*/
function vecollab_create_table_on_plugin_install(){
    global $wpdb;
    $table_name = $wpdb->prefix . 'vecollab_responses';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE " . $table_name . " (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        response text NOT NULL,
        question_id varchar(255) DEFAULT '' NOT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    dbDelta( $sql );
}
register_activation_hook( __FILE__, 'vecollab_create_table_on_plugin_install' );

include 'functions.php';

?>