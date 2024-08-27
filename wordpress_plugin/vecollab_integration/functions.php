<?php

/*
* enable jQuery
*/
function vecollab_enqueue_scripts()
{
    wp_enqueue_script('jquery');
}
add_action('wp_enqueue_scripts', 'vecollab_enqueue_scripts');

/*
 * Callback for shortcode [vecollab_response_form id=""]
 * Adds a text area and submit to the page to gather responses to questions
 * The shortcode expects an id to be passed as a parameter to identify the question.
 */
function vecollab_inject_response_form($atts = [], $content = null)
{
    // normalize attribute keys, lowercase
	$atts = array_change_key_case( (array) $atts, CASE_LOWER );

    // set parameters
	$shortcode_atts = shortcode_atts(
		array(
			'id' => NULL,
		), $atts, 'vecollab_response_form'
	);

    $admin_url = esc_url( admin_url('admin-post.php') );

    $html = '
        <form action="?><?php echo esc_url( admin_url(\'admin-post.php\') ); ?><?php" method="POST">
            <textarea
                style="width: 100%; border: 1px solid #a0a0a0; border-radius: 0.25rem; padding: 0.5rem 0.25rem;"
                rows="5"
                placeholder="Tippen Sie Ihre Antwort hier ein"
                value=""
                onchange=""
                id="' . $shortcode_atts['id'] . '"
            ></textarea>
            <button
                type="submit"
                style="background-color: #c4560b; color: #fff; padding: 0.5rem 1rem; border-radius: 0.25rem;"
                onclick="saveInCookie();"
            >
                Speichern
            </button>
            <input type="hidden" name="action" value="vecollab_response_form">
        </form>
        <script>
            function saveInCookie(){
                let text = document.getElementById("' . $shortcode_atts['id'] . '").value;
                let d = new Date();
                d.setTime(d.getTime() + (365*24*60*60*1000));
                let expires = "expires="+ d.toUTCString();
                document.cookie = "' . $shortcode_atts['id'] . '" + "=" + text + "; " + expires;
            }
            
            function getCookie(name) {
                const nameEQ = name + "=";
                for (const cookie of document.cookie.split("; ")) {
                    if (cookie.indexOf(nameEQ) === 0) {
                        const value = cookie.substring(nameEQ.length);
                        return decodeURIComponent(value); // returns first found cookie
                    }
            
                }
                return null;
            }

            jQuery(document).ready(function($){
                $("form").submit(function(e){
                    e.preventDefault();
                    $.ajax({
                        type: "POST",
                        url: "'. $admin_url . '",
                        data: {
                            action: "vecollab_response_form",
                            id: "' . $shortcode_atts['id'] . '",
                            response: document.getElementById("' . $shortcode_atts['id'] . '").value
                        },
                        success: function(data){
                            console.log(data);
                        }
                    });
                });

                const cookieToRead = "' . $shortcode_atts['id'] . '";
                const cookie = getCookie(cookieToRead);
                if(cookie !== null){
                    console.log(cookie);
                    document.getElementById("' . $shortcode_atts['id'] . '").value = cookie;
                }   
            });    
        </script>
    ';

    return $html;
}
add_shortcode('vecollab_response_form', 'vecollab_inject_response_form');

function echo_log( $what )
{
    echo '<pre>'.print_r( $what, true ).'</pre>';
}

/*
* Callback for the form submission in the shortcode [vecollab_response_form]
* to save the response in the db.
*/
function vecollab_response_form_handler(){
    echo_log( $_POST );

    global $wpdb;
    $table_name = $wpdb->prefix . 'vecollab_responses';

    $response = $_POST['response'];
    $question_id = $_POST['id'];

    $wpdb->insert(
        $table_name,
        array(
            'response' => $response,
            'question_id' => $question_id
        )
    );
}
add_action( 'admin_post_nopriv_vecollab_response_form', 'vecollab_response_form_handler' );
add_action( 'admin_post_vecollab_response_form', 'vecollab_response_form_handler' );

?>