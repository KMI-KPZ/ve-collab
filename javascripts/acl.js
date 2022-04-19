var Users = []
var Roles = []
var Spaces = []

function jquery_id_selector(myid) {
    return "#" + myid.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1");
}


$(document).ready(function () {
    get_all_users()
    get_all_spaces()
    get_all_roles()

})


function get_all_users() {
    $.ajax({
        type: 'GET',
        url: '/users/list',
        dataType: 'json',
        success: function (data) {
            users = data;

            $.each(users, function (entry) {
                Users.push(users[entry])
                $('#space_user_list').append(Mustache.render($('#select_item').html(), {item: users[entry].username}))
                addUser_role_table(users[entry].username, users[entry].role)
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

function get_all_roles() {
    Roles = ["admin", "user", "guest"]

    $.each(Roles, function (entry) {
        $('#global_role_list').append(Mustache.render($('#select_item').html(), {item: Roles[entry]}))
    })
}

/**
 * add table rows in user_role_table
 */
function addUser_role_table(username, userrole) {
    var user_role_table = $('#user_role_table_list');
    var user_role_table_template = $('#user_role_table_template').html()

    user_role_table.append(Mustache.render(user_role_table_template, {username: username, user_role: userrole}));

    //punctuation in jquery selectors breaks, see https://learn.jquery.com/using-jquery-core/faq/how-do-i-select-an-element-by-an-id-that-has-characters-used-in-css-notation/
    //gotta escape the point in the username
    $(jquery_id_selector('user_role_' + username)).find('option[value=' + userrole + ']').attr('selected', 'selected');
}

function get_user_roles() {

}

function update_user_role(username) {
    var updated_role = $(jquery_id_selector('user_role_' + username)).val()

    $.ajax({
        type: 'POST',
        url: '/role',
        data: JSON.stringify({"username": username, "role": updated_role}),
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

function update_global_acl_container() {

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
