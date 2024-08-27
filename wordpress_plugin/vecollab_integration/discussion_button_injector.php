<?php

/*
 * Callback for shortcode [kavaq_discussion_button]
 * Adds a "Discuss this Post"- button on the given shortcode that forwards the user
 * to the post's discussion space in the social network of KAVAQ
 * 
 */
function kavaq_inject_discussion_button($atts = [], $content = null)
{
    $base_url = get_option('kavaq_base_url', 'http://you_forgot_to_set_base_url.com');
    $url = $base_url . "/spaceadministration/join_discussion?wp_post_id=" . get_the_ID();
    $html = "<button onclick=\"window.open('" . $url . "', '_blank')\">Discuss this post</button>";
    return $html;
}

add_shortcode('kavaq_discussion_button', 'kavaq_inject_discussion_button');

?>