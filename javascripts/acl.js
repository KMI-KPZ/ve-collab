var Users = []
var Roles = []
var Spaces = []

function jquery_id_selector(myid) {
    return "#" + myid.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1");
}

$(document).ready(function () {
    //fill the table in the role tab containing all users and their roles
    get_all_roles_and_users().done(function (users_response) {
        get_distinct_roles().done(function (roles_response) {
            //render the template with username and a select of all possible distinct roles
            render_role_table(users_response, roles_response);
        });
    });

    //fill the global acl table
    get_all_acl_entries().done(function (acl_response) {
        render_global_acl_table(acl_response);
    });

    get_all_users()
    get_all_spaces()

})


function get_all_users() {
    // TODO clean up this request just as the others
    $.ajax({
        type: 'GET',
        url: '/users/list',
        dataType: 'json',
        success: function (data) {
            users = data;

            $.each(users, function (entry) {
                Users.push(users[entry])
                $('#space_user_list').append(Mustache.render($('#select_item').html(), {item: users[entry].username}))
            })
        },

        error: function (xhr, status, error) {
            if (xhr.status == 401) {
                window.location.href = routingTable.platform;
            } else if (xhr.status === 403) {
                window.createNotification({
                    theme: 'error',
                    showDuration: 5000
                })({
                    title: 'Error!',
                    message: 'Insufficient Permission'
                });
            } else {
                window.createNotification({
                    theme: 'error',
                    showDuration: 5000
                })({
                    title: 'Server error!',
                    message: 'Request all user information'
                });
            }
        },
    });


}

function get_all_spaces() {
    Spaces = ["Testspace1", "Testspace2"]
    $.each(Spaces, function (entry) {
        $('#space_space_list').append(Mustache.render($('#select_item').html(), {item: Spaces[entry]}))
    })
}

function get_distinct_roles() {
    return $.ajax({
        type: "GET",
        url: "/role/distinct",
        dataType: "json",
    });
}

function get_all_roles_and_users() {
    return $.ajax({
        type: "GET",
        url: "/role/all",
        dataType: "json",
    });
}

function get_all_acl_entries() {
    return $.ajax({
        type: "GET",
        url: "/global_acl/get_all",
        dataType: "json"
    });
}

function render_role_table(users_response, roles_response) {
    let user_role_table = $('#user_role_table_list');
    let user_role_table_template = $('#user_role_table_template').html();

    //emtpy table first (need to do this because this function is also called from hot reload
    user_role_table.empty();

    //render template
    user_role_table.append(Mustache.render(user_role_table_template, {users: users_response.users, options: roles_response.existing_roles}));

    $.each(users_response.users, function (idx, user) {
        //set the correct role to be select for each user
        $(jquery_id_selector('user_role_' + user.username)).find('option[value=' + user.role + ']').attr('selected', 'selected');

        //init the editable combobox (can choose roles from dropdown or type new roles into the input)
        $(jquery_id_selector('user_role_' + user.username)).combobox({
            //the widget is a little flimsy, need to distinguish if the role was chosen from the select or typed in the input field
            select: function (event, role) {
                $(this).trigger("change");
            },
            select_typed: function (event, role) {
                let username = $(this).attr("id").replace("user_role_", "");
                post_update_userrole(username, role).done(function () {
                    //re-render the table
                    get_all_roles_and_users().done(function (users_response) {
                        get_distinct_roles().done(function (roles_response) {
                            //render the template with username and a select of all possible distinct roles
                            render_role_table(users_response, roles_response);
                        });
                    });
                });
            }
        });
    });
}

function render_global_acl_table(acl_response) {
    //empty first and then append new, because of hot reload there might be old data that would be duplicated if not emptied before
    $("#global_acl_rules").empty().append(Mustache.render($("#global_acl_entry_template").html(), {acl_entries: acl_response.acl_entries}));
}

function get_user_roles() {

}

function update_user_role(username) {
    let updated_role = $(jquery_id_selector('user_role_' + username)).val();
    post_update_userrole(username, updated_role).done(function () {
        //re-render the table
        get_all_roles_and_users().done(function (users_response) {
            get_distinct_roles().done(function (roles_response) {
                //render the template with username and a select of all possible distinct roles
                render_role_table(users_response, roles_response);
            });
        });
    });
}

function post_update_userrole(username, role) {
    return $.ajax({
        type: 'POST',
        url: '/role/update',
        data: JSON.stringify({"username": username, "role": role}),
        dataType: 'json',
    });
}

function update_global_acl_entry(permission_key, role) {
    let val = $("#toggle_" + role).is(":checked");

    //construct : {"role": <role, "create_space": <bool>}
    let payload = {role: role}
    payload[permission_key] = val

    $.ajax({
        type: "POST",
        url: "/global_acl/update",
        data: JSON.stringify(payload)
    }).done(function () {
        //re-render the table
        get_all_acl_entries().done(function (acl_response) {
            render_global_acl_table(acl_response);
        });
    });
}

function update_space_acl_container() {

}

/**
 * Setup for tab system
 * to add tabs, add entry in tabs array and div in acl_main div with id="tabs"
 * with corresponding id and its contents
 */
function setup() {
    return {
        activeTab: 0,
        tabs: [
            "Rollen",
            "Globales ACL",
            "Space ACL"
        ]
    };
}

/**
 * callback for alpine.js when clicking on the tabs to reload the data
 * @param tab tab name (see setup() function above)
 */
function handleTabChange(tab) {
    //depending on which tab we are jumping to, render their data accordingly
    switch (tab) {
        case "Rollen":
            get_all_roles_and_users().done(function (users_response) {
                get_distinct_roles().done(function (roles_response) {
                    //render the template with username and a select of all possible distinct roles
                    render_role_table(users_response, roles_response);
                });
            });
            break;
        case "Globales ACL":
            get_all_acl_entries().done(function (acl_response) {
                render_global_acl_table(acl_response);
            });
            break;
        case "Space ACL":
            // TODO fill when done
            break;
        default:
            console.log("unrecognised Tab Name @TabChange: " + tab);
            break;
    }
}
