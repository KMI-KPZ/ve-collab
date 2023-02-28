var currentSpaceTab;
var currentSpaceRole;

function jquery_id_selector(myid) {
    return "#" + myid.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1");
}

/**
 * On document access do several things
 * 1. Add acl button if admin
 * 2. initiate all tabs in container
 *  a) roles table -> gets all roles and users, renders role table
 *  b) get global acl entries and renders global acl table
 *  c) get space acl entries and renders space acl table
 */
$(document).ready(function () {
    add_acl_and_wordpress_button();

    //fill the table in the role tab containing all users and their roles
    get_all_roles_and_users().done(function (users_response) {
        get_distinct_roles().done(function (roles_response) {
            //render the template with username and a select of all possible distinct roles
            render_role_table(users_response, roles_response);

            update_space_acl_roles_select(roles_response);
            //get_all_spaces()
            currentSpaceRole = roles_response.existing_roles[0]
            $("#space_role_list").val(currentSpaceRole).change()
        });
    });

    //fill the global acl table
    get_all_acl_entries().done(function (acl_response) {
        render_global_acl_table(acl_response);
    });

    //fill the space acl table
    get_all_spaces().done(function (space_response) {
        currentSpaceTab = space_response.spaces[0].name
        get_all_space_acl_entries(currentSpaceTab, currentSpaceRole).done(function (acl_response) {
            render_space_acl_table(acl_response)
        })
    })



})

/**
 * getAllUsers - stores all Users in "users" and fills user selection in space acl tab
 */
function get_all_users() {
    // TODO clean up this request just as the others
    $.ajax({
        type: 'GET',
        url: '/users/list',
        dataType: 'json',
        success: function (data) {
            users = data;

            // add all users to user selection in space acl tab
            $.each(users, function (entry) {
                Users.push(users[entry])
                $('#space_user_list').append(Mustache.render($('#select_item').html(), { item: users[entry].username }))
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

/**
 * get_all_spaces - gets a list of all Spaces from Server
 * adds all spaces to space selector on space acl tab
 */
function get_all_spaces() {
    return $.ajax({
        type: 'GET',
        url: '/spaceadministration/list',
        dataType: 'json',
        success: function (data) {
            $('#space_space_list').empty()
            $.each(data.spaces, function (entry) {
                $('#space_space_list').append(Mustache.render($('#select_item').html(), { item: data.spaces[entry].name }))
            })
        }
    })


}

/**
 * returns list of all distinct roles from Server
 */
function get_distinct_roles() {
    return $.ajax({
        type: "GET",
        url: "/role/distinct",
        dataType: "json",
    });
}

/**
 * returns users and their role
 */
function get_all_roles_and_users() {
    return $.ajax({
        type: "GET",
        url: "/role/all",
        dataType: "json",
    });
}

/**
 * returns all roles and their global acl permissions
 */
function get_all_acl_entries() {
    return $.ajax({
        type: "GET",
        url: "/global_acl/get_all",
        dataType: "json"
    });
}

/**
 * returns acl permissions of a role in a specific space
 * @param  {String} name space
 * @param  {String} name role
 */
function get_all_space_acl_entries(space, role) {
    return $.ajax({
        type: "GET",
        url: "/space_acl/get?space=" + space + "&role=" + role,
        dataType: "json"
    });
}

/**
 * render role table in roles tab by processing users_response and roles_response
 * @param  {JSON} name users_response - respons, typically from function get_all_roles_and_users()
 * @param  {JSON} name roles_response - respons, typically from function get_distinct_roles()
 */
function render_role_table(users_response, roles_response) {
    let user_role_table = $('#user_role_table_list');
    let user_role_table_template = $('#user_role_table_template').html();

    //emtpy table first (need to do this because this function is also called from hot reload
    user_role_table.empty();

    //render template
    user_role_table.append(Mustache.render(user_role_table_template, { users: users_response.users, options: roles_response.existing_roles }));

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

/**
 * renders global acl table in global acl tab with acl response
 * @param  {JSON} name acl_response - respons, typically from function get_all_acl_entries()
 */
function render_global_acl_table(acl_response) {
    //empty first and then append new, because of hot reload there might be old data that would be duplicated if not emptied before
    $("#global_acl_rules").empty().append(Mustache.render($("#global_acl_entry_template").html(), { acl_entries: acl_response.acl_entries }));
}

/**
 * renders space acl table in space acl tab with acl response
 * @param  {JSON} name acl_response - respons, typically from function get_all_space_acl_entries()
 */
function render_space_acl_table(acl_response) {
    var permissions = [];
    $.each(acl_response.acl_entry, function (key, value) {
        if (key != "space" && key != "role") {
            permissions.push({ "permission": key, "value": value })
        }
    })
    $("#space_acl_rules").empty().append(Mustache.render($("#space_acl_entry_template").html(), { acl_entries: permissions }));
}

/*
 * updates user role by changing selector of specific user in the roles table
 */
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

/**
 * POST request to update role of user with username
 * @param  {String} name username
 * @param  {String} name role
 */
function post_update_userrole(username, role) {
    return $.ajax({
        type: 'POST',
        url: '/role/update',
        data: JSON.stringify({ "username": username, "role": role }),
        dataType: 'json',
    });
}


/**
 * POST request to update global acl permission entry for specific role
 * @param  {String} name permission key
 * @param  {String} name role
 */
function update_global_acl_entry(permission_key, role) {
    let val = $("#toggle_" + role).is(":checked");

    //construct : {"role": <role, "create_space": <bool>}
    let payload = { role: role }
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

/**
 * POST request to update space acl permissionentry for specific role in a specific space
 * gets space and role from selectors in space acl tab
 * @param  {String} name permission_key
 */
function update_space_acl_entry(permission_key) {
    let val = $("#toggle_" + permission_key).is(":checked")
    let space = $("#space_space_list").val()
    let role = $("#space_role_list").val()
    let payload = { role: role, space: space }
    payload[permission_key] = val
    $.ajax({
        type: "POST",
        url: "/space_acl/update",
        data: JSON.stringify(payload)
    }).done(function () {
        //re-render the table
        get_all_spaces().done(function (space_response) {
            get_all_space_acl_entries(currentSpaceTab, currentSpaceRole).done(function (acl_response) {
                render_space_acl_table(acl_response)
                $("#space_space_list").val(currentSpaceTab).change()
                $("#space_role_list").val(currentSpaceRole).change()
            })
        })

    });
}

/**
 * updates role selector in space acl tab with current roles
 * @param {JSON} name acl_response - respons, typically from function get_distinct_roles()
 */
function update_space_acl_roles_select(roles_response) {
    $.each(roles_response.existing_roles, function (entry) {
        $('#space_role_list').append(Mustache.render($('#select_item').html(), { item: roles_response.existing_roles[entry] }))
    })
}

/**
 * updates space acl container
 * sets variables currentSpaceTab and currentSpaceRole to correctly set selector values on update
 */
function update_space_acl_container() {
    let spacename = $("#space_space_list").val()
    let role = $("#space_role_list").val()
    currentSpaceTab = spacename
    currentSpaceRole = role
    get_all_space_acl_entries(spacename, role).done(function (acl_response) {
        render_space_acl_table(acl_response)
    })
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
