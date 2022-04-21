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

            // fill the select of all distinct roles in the Global ACL tab
            render_global_acl_role_select(roles_response);
        });
    });

    get_all_acl_entries().done(function(acl_response){
        console.log(acl_response);
        $("#global_acl_rules").append(Mustache.render($("#global_acl_entry_template").html(), {acl_entries: acl_response.acl_entries}));
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

function get_all_acl_entries(){
    return $.ajax({
        type: "GET",
        url: "/global_acl/get_all",
        dataType: "json"
    });
}

function render_role_table(users_response, roles_response) {
    let user_role_table = $('#user_role_table_list');
    let user_role_table_template = $('#user_role_table_template').html()
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
                post_update_userrole(username, role);
            }
        });
    });
}

function render_global_acl_role_select(roles_response) {
    $.each(roles_response.existing_roles, function (idx, role) {
        $('#global_role_list').append(Mustache.render($('#select_item').html(), {item: role}))
    });
}

function get_user_roles() {

}

function update_user_role(username) {
    let updated_role = $(jquery_id_selector('user_role_' + username)).val()
    post_update_userrole(username, updated_role);
}

function post_update_userrole(username, role) {
    $.ajax({
        type: 'POST',
        url: '/role/update',
        data: JSON.stringify({"username": username, "role": role}),
        dataType: 'json',
        success: function (response) {

        },
        error: function (xhr, status, error) {
            if (xhr.status === 400) {
                window.createNotification({
                    theme: 'error',
                    showDuration: 5000
                })({
                    title: 'Error!',
                    message: 'Missing Key in HTTP Body'
                });
            } else if (xhr.status === 401) {
                window.location.href = routingTable.platform;
            } else if (xhr.status === 403) {
                window.createNotification({
                    theme: 'error',
                    showDuration: 5000
                })({
                    title: 'Error!',
                    message: 'Insufficient Permission, you are not an admin!'
                });
            } else {
                window.createNotification({
                    theme: 'error',
                    showDuration: 5000
                })({
                    title: 'Server error!',
                    message: 'The Server encountered an unexpected Error'
                });
            }
        }
    });
}

function update_global_acl_entry(permission_key, role) {
    let val = $("#toggle_" + role).is(":checked");
    console.log(val);
    console.log(permission_key);
    console.log(role);

    let payload = {role: role}
    payload[permission_key] = val

    $.ajax({
        type: "POST",
        url: "/global_acl/update",
        data: JSON.stringify(payload)
    })
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
};
