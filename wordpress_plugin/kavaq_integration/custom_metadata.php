<?php

$KAVAQ_METADATA_REST_ROUTE = "kavaq/v1";
$KAVAQ_METADATA_REST_ENDPOINT = "metadata";

/*
 * Register the custom KAVAQ metadata boxes to the post edit
 * screen
 */
function kavaq_add_post_metadata_boxes()
{
    add_meta_box(
        'kavaq_metadata_box',
        'KAVAQ Metadaten',
        'kavaq_metadata_box_html',
        'post'
    );
}

/*
 * Callback that contains the HTML that will be rendered inside
 * the KAVAQ metadata box
 */
function kavaq_metadata_box_html($post)
{
    $value = get_post_meta($post->ID, 'kavaq_learning_resource_author', true);
    // TODO internationalization
    ?>
    <label for="kavaq_author_field">Author of this learning resource</label>
    <input type="text" name="kavaq_author_field" id="kavaq_author_field" value="<?php echo $value ?>">

<?php
}
add_action('add_meta_boxes', 'kavaq_add_post_metadata_boxes');


/*
 * Callback to save the metadata in the post_meta table whenever
 * the post is saved by the user
 */
function kavaq_save_metadata($post_id)
{
    if (array_key_exists('kavaq_author_field', $_POST)) {
        // TODO check user capabilities
        update_post_meta(
            $post_id,
            'kavaq_learning_resource_author',
            sanitize_text_field($_POST['kavaq_author_field'])
        );
    }
}
add_action('save_post', 'kavaq_save_metadata');

/*
 * add the metadata fields to the post meta-key (== to the post api response)
 */
$kavaq_author_field_meta_args = array(
    'type' => 'string',
    'description' => 'the author of the learning resource',
    'single' => true,
    'show_in_rest' => true,
);
register_post_meta('post', 'kavaq_learning_resource_author', $kavaq_author_field_meta_args);



/*
 * generate metadata of posts (==learning resources)
 * for now, this is a proof of concept containing rather irrelevant information
 */
function kavaq_generate_metadata_xml()
{
    // get all posts
    $posts = get_posts(array('numberposts' => -1));

    // build xml on top of the post metadata
    $xml = new SimpleXMLElement('<xml/>');
    foreach ($posts as $post) {
        $learning_resource = $xml->addChild('learningResource');
        $learning_resource->addAttribute('title', $post->post_title);
        $learning_resource->addAttribute('creationDate', $post->post_date);
        $meta_attributes = $learning_resource->addChild('metadata');
        $meta_attributes->addChild('resourceAuthor', get_post_meta($post->ID, 'kavaq_learning_resource_author', true));
        $categories = $meta_attributes->addChild('categories');
        foreach (get_the_category($post->ID) as $category) {
            $categories->addChild('category', $category->name);
        }
        $tags = $meta_attributes->addChild('tags');
        $post_tags = get_the_tags($post->ID);
        if ($post_tags !== false) {
            foreach (get_the_tags($post->ID) as $tag) {
                $tags->addChild('tag', $tag->name);
            }
        }
    }

    return $xml->asXML();
}


/*
 * register custom route /wp-json/kavaq/v1/metadata/ to serve our metadata
 */
function kavaq_register_metadata_rest_route()
{
    global $KAVAQ_METADATA_REST_ROUTE;
    global $KAVAQ_METADATA_REST_ENDPOINT;

    register_rest_route(
        $KAVAQ_METADATA_REST_ROUTE,
        $KAVAQ_METADATA_REST_ENDPOINT,
        array(
            'methods' => 'GET',
            'callback' => 'kavaq_generate_metadata_xml',
            'permission_callback' => '__return_true',
        )
    );
}
add_action('rest_api_init', 'kavaq_register_metadata_rest_route');

/*
 * hook into the wordpress api request serving to change the Content-Type Header
 * of the metadata endpoint to 'text/xml' instead of the default 
 * 'application/json', because the xml woudl be misformatted with JSON
 */
function send_metadata_as_xml_content_type($served, $result, $request, $server)
{
    global $KAVAQ_METADATA_REST_ROUTE;
    global $KAVAQ_METADATA_REST_ENDPOINT;

    // bail if the route of the current REST API request is not our custom metadata route
    if (
        $request->get_route() !== '/' . $KAVAQ_METADATA_REST_ROUTE . '/' . $KAVAQ_METADATA_REST_ENDPOINT ||
        // also check that the callback is kavaq_generate_metadata_xml()
        $request->get_attributes()['callback'] !== 'kavaq_generate_metadata_xml'
    ) {
        return $served;
    }

    // Send headers.
    $server->send_header('Content-Type', 'text/xml');

    // Echo the XML that's returned by kavaq_generate_metadata_xml().
    echo $result->get_data();

    // And then exit.
    exit;
}
add_filter('rest_pre_serve_request', 'send_metadata_as_xml_content_type', 10, 4);

?>