<?php

class kavaq_Settings
{

    public function __construct()
    {
        add_action('admin_menu', array($this, 'kavaq_add_settings_page'));
        add_action('admin_init', array($this, 'kavaq_settings_init'));
    }

    public function kavaq_add_settings_page()
    {
        add_menu_page(
            'KAVAQ Settings',
            //tab page title
            'KAVAQ',
            //WP menu title
            'manage_options',
            // capability of user needed to display this page
            'kavaq_options',
            //menu slug
            array($this, 'kavaq_options_page') //page callback
        );
    }

    public function kavaq_options_page()
    {
        do_settings_sections('kavaq_options_g');
    }

    public function kavaq_settings_init()
    {
        register_setting(
            'kavaq_general_group',
            //group
            'kavaq_options' //name
        );

        add_settings_section(
            'kavaq_options_general',
            'Settings',
            array($this, 'kavaq_print_general_info'),
            'kavaq_options_g'
        );

        add_settings_field(
            'kavaq_base_url_field',
            'Base URL',
            array($this, 'kavaq_base_url_callback'),
            'kavaq_options_g',
            'kavaq_options_general'
        );
    }

    public function kavaq_base_url_callback()
    {
?>
<form method='post'>
    <label for="kavaq_base_url_field">Please supply the base URL of the KAVAQ Platform, e.g.
        http://www.example.com:12345</label><br />
    <input type='text' id='kavaq_base_url_field' name='kavaq_base_url_field'>
    <?php submit_button('Save', 'primary', 'kavaq_save_btn'); ?>
</form>
<?php
        if (isset($_POST['kavaq_base_url_field'])) {
            $base_url = sanitize_text_field($_POST['kavaq_base_url_field']);
            //empty field means "reset" to non-existent
            if ($base_url == "") {
                delete_option('kavaq_base_url');
            }
            // if protocol is missing, set https as default --> explicit http will remain http
            else if (!str_starts_with($base_url, 'http')) {
                $base_url = 'https://' . $base_url;
                update_option('kavaq_base_url', $base_url);
            } else {
                update_option('kavaq_base_url', $base_url);
            }
        }
        echo 'Stored value: ' . get_option('kavaq_base_url', null);
    }

    public function kavaq_print_general_info()
    {
        echo "Please supply the necessary information below.";
    }
}


if (is_admin()) {
    $kavaq_settings = new kavaq_Settings();
}
?>