<?php
/**
 * Plugin Name: KAVAQ Platform Plugin
 * Description: Plugin to implement necessary integration functionaly of the KAVAQ platform with Wordpress
 * Version: 0.0.1
 * Author: Developers of KMI-KPZ/kavaq
 * Author URI: https://github.com/KMI-KPZ/kavaq
 * License: GPL2
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 */

 if( !defined('ABSPATH')){
     echo "No direct access please";
     exit();
}

include 'discussion_button_injector.php';
include 'custom_metadata.php';
include 'settings.php';

?>