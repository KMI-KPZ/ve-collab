<?php

/*
* send the height of the document to the parent window 
* used to make the iframe full size in the parent when embedded
*/
function send_doc_height() {
    echo '<script type="text/javascript">
            let lastSize = 0
            function sendDocHeight(event) {
                const el = document.querySelector("html");
                const styles = window.getComputedStyle(el);
                const margin = parseFloat(styles["marginTop"]) + parseFloat(styles["marginBottom"]);

                const height = Math.ceil(el.offsetHeight + margin);
                if (height != lastSize) {
                    window.parent.postMessage({
                        type: "resize",
                        value: height
                    }, "*");
                }

            }
            window.addEventListener("load", sendDocHeight);
            window.addEventListener("resize", sendDocHeight);
        </script>';
}
add_action( 'wp_footer', 'send_doc_height' );

/*
 * Callback for shortcode [vecollab_response_form id="" show_others_responses=<true|false>]
 * Adds a text area and submit to the page to gather responses to questions
 * The shortcode expects an id to be passed as a parameter to identify the question.
 * Optionally, the shortcode can be set to show other responses to the question. It will display
 * 5 random responses to the question.
 */
function vecollab_inject_response_form($atts = [], $content = null)
{
    // normalize attribute keys, lowercase
	$atts = array_change_key_case( (array) $atts, CASE_LOWER );

    // set parameters
	$shortcode_atts = shortcode_atts(
		array(
			'id' => NULL,
            'show_others_responses' => false
		), $atts, 'vecollab_response_form'
	);

    $admin_url = esc_url( admin_url('admin-post.php') );
    $admin_ajax_url = esc_url( admin_url('admin-ajax.php') );

    $html = '
        <form action="' . $admin_url . '" method="POST">
            <textarea
                class="responseTextarea"
                rows="5"
                placeholder="Tippen Sie Ihre Antwort hier ein"
                id="' . $shortcode_atts['id'] . '"
            ></textarea>
            <div class="btnWrapper">
                <button
                    type="submit"
                    class="orangeBtn"
                    onclick="saveInCookie();"
                >
                    Speichern
                </button>';
    if($shortcode_atts['show_others_responses']){
        $html .= '<button
                    type="button"
                    class="orangeBtn"
                    id="show_other_answers"
                >
                    Was haben andere geantwortet?
                </button>';
    }
    $html .='</div>
            <input type="hidden" name="action" value="vecollab_response_form">
            <div id="other_answers" style="display: none; margin-top: 8px;">
                <span>Andere Nutzende antworteten:</span>
                <ul id="other_answers_list"></ul>
            </div>
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
                    
                $("#show_other_answers").click(function(){
                    $.ajax({
                        type: "POST",
                        url: "'. $admin_ajax_url . '",
                        data: {
                            action: "vecollab_get_random_responses",
                            id: "' . $shortcode_atts['id'] . '"
                        },
                        success: function(data){
                            // render the responses
                            console.log(data);
                            $("#other_answers_list").empty();
                            data.responses.forEach(function(response){
                                $("#other_answers_list").append("<li>" + response.response + "</li>");
                            });
                            $("#other_answers").show();
                        },
                        error: function(data){
                            console.log(data);
                        }
                    });
                });

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

    $response = sanitize_textarea_field($_POST['response']);
    $question_id = sanitize_text_field($_POST['id']);

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

/*
* Ajax callback function to get random responses from the db
*/
function vecollab_get_random_responses(){
    $id = sanitize_text_field($_POST['id']);
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'vecollab_responses';

    // get 5 random responses
    $responses = $wpdb->get_results(
        $wpdb->prepare("SELECT * FROM $table_name WHERE question_id = %s ORDER BY RAND() LIMIT 5", $id)
    );

    $return = array(
        "responses" => $responses
    );

    wp_send_json($return);
}
add_action('wp_ajax_vecollab_get_random_responses', 'vecollab_get_random_responses');
add_action('wp_ajax_nopriv_vecollab_get_random_responses', 'vecollab_get_random_responses');


/*
* Callback for shortcode [vecollab_my_response id=""]
* Renders the response of the current user to the question with the given id that is stored
* in the browser cookie
*/
function vecollab_inject_my_response($atts = [], $content = null){
    // normalize attribute keys, lowercase
	$atts = array_change_key_case( (array) $atts, CASE_LOWER );

    // set parameters
	$shortcode_atts = shortcode_atts(
		array(
			'id' => NULL,
            'show_others_responses' => false
		), $atts, 'vecollab_response_form'
	);

    $cookie_name = $shortcode_atts['id'];
    $answer = $_COOKIE[$cookie_name];

    $html = '<p>' . $answer . '</p>';

    if($shortcode_atts['show_others_responses']){
        $admin_ajax_url = esc_url( admin_url('admin-ajax.php') );
        $html .= 
            '<button
                type="button"
                class="orangeBtn"
                id="show_other_answers"
            >
                Was haben andere geantwortet?
            </button>
            <div id="other_answers" style="display: none; margin-top: 8px;">
                <span>Andere Nutzende antworteten:</span>
                <ul id="other_answers_list"></ul>
            </div>
            <script>
                jQuery(document).ready(function($){
                    $("#show_other_answers").click(function(){
                        $.ajax({
                            type: "POST",
                            url: "'. $admin_ajax_url . '",
                            data: {
                                action: "vecollab_get_random_responses",
                                id: "' . $shortcode_atts['id'] . '"
                            },
                            success: function(data){
                                // render the responses
                                console.log(data);
                                $("#other_answers_list").empty();
                                data.responses.forEach(function(response){
                                    $("#other_answers_list").append("<li>" + response.response + "</li>");
                                });
                                $("#other_answers").show();
                            },
                            error: function(data){
                                console.log(data);
                            }
                        });
                    });
                });
            </script>
            ';
    }

    return $html;
}
add_shortcode('vecollab_my_response', 'vecollab_inject_my_response');

?>