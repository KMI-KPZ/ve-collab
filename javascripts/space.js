var spacename = currURL.substring(currURL.lastIndexOf('/') + 1).replaceAll("%20", " ");

// On document ready get routing
$(document).ready(function () {
  document.title = spacename + ' - Social Network';

  setTimeout(function () {
    //alert(Object.keys(users).length === 0)
    console.log(!jQuery.isEmptyObject(users))
    if (!jQuery.isEmptyObject(users)) {

      searchUserInvites(users)
    }
  }, 3000);

});

/**
 * triggers on tab change in space view based on index variable
 * empties feed if selected tab is not dashboard (index != 0)
 * else reinitiate feed on dashboard tab if selected (index = 0)
 * @param  {String} name index
 */
function triggerDisplay(index) {
  if (index != 0) {
    $("#feedRow").empty()
    if (index == 1) {
      //alert("Hallo")
      $('#space_members').empty()
      $.each(Spaces, function (entry) {
        if (Spaces[entry].name == spacename.replaceAll("%20", " ")) {
          $.each(users, function (user) {
            if (Spaces[entry].members.includes(users[user].username)) {
              $('#space_members').append(Mustache.render($('#space_member').html(), { username: users[user].username, memberRole: users[user].role, profilePic: users[user].profile_pic }))
            }
          })


        }
      })
    }
  } else {
    async function addContainer() {
      if ($('#feedRow').is(':empty')) {
        $('#feedRow').append('<div class="container mx-auto w-3/5 px-4 mt-2 text-base" id="feedContainer" style="sans-serif;max-width: 50%;"></div>')
        $feedContainer = $('#feedContainer');
      }
    }
    addContainer().then(function () {
      initNewsFeed();
    })
  }
}

function handleSpaceAdministrationTabChange(tab) {
  //depending on which tab we are jumping to, render their data accordingly
  switch (tab) {
    case "User Management":
      renderUserManagementModal()
      console.log("User Management")
      break;
    case "Anfragen":
      console.log("Anfragen")
      getPendingJoinRequests(spacename)
      break;
    case "Einladungen":
      console.log("Einladungen")
      $('#invite_select').empty()
      var currentSpace = "";
      $.each(Spaces, function (entry) {
        if (Spaces[entry].name == spacename.replaceAll("%20", " ")) {
          currentSpace = Spaces[entry]
        }
      })
      $.each(users, function (entry) {
        if (!currentSpace.members.includes(users[entry].username)) {
          $('#invite_select').append("<option>" + users[entry].username + "</option>")
        }
      })
      update_invite_change_select()
      break;
    case "Space ACL":
      //alert("HALLO")
      $('#space_role_list').empty()
      get_distinct_roles().done(function (roles_response) {
        $.each(roles_response.existing_roles, function (entry) {
          $('#space_role_list').append(Mustache.render($('#select_item').html(), { item: roles_response.existing_roles[entry] }))
        })
      })
      display_space_acl_permissions();
      break;
    default:
      console.log("unrecognised Tab Name @TabChange: " + tab);
      break;
  }
}

/**
 * Populates space information in editing space modal
 */
function populateSpaceInformationModal() {
  $.each(Spaces, function (entry) {
    if (Spaces[entry].name == spacename.replaceAll("%20", " ")) {
      if (Spaces[entry].space_description) {
        $("#space_description").val(Spaces[entry].space_description)
      }
    }
  })
}

/**
 * Sends POST request to update current space information with params from space update modal
 * @param  {String} name name
 */
function updateSpaceInformation(name) {
  var spaceDescription = String($('#space_description').val());
  var photoFile = document.getElementById('photoFile');
  var photo = null;
  console.log(photoFile)
  if (photoFile === null) {
    console.log("Error photo file")
  } else if (photoFile.files.length > 0) {
    photo = (isImage(photoFile.files[0].name)) ? photoFile.files[0] : null;
  } else {
    console.log("Error photo file")
  }
  var formData = new FormData();
  formData.append("space_pic", photo);
  formData.append("space_description", spaceDescription);
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/space_picture?name=' + name,
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      $("#saveAlert").html('Successfully updated!');
      $("#saveAlert").addClass("alert alert-success");
      $('#settingsModal').modal('toggle');
      console.log("Success")
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function update_invite_change_select() {
  $('#invite_profile_display div').remove()
  var selected = $('#invite_select').val()
  var this_user = new Object();
  $.each(users, function (entry) {
    if (users[entry].username == selected) {
      this_user = users[entry]
    }
  })
  $('#invite_profile_display').append(Mustache.render($("#invite_profile_card").html(), { profile_pic_URL: this_user.profile_pic, username: this_user.username, spacename: spacename }))
}

/**
 * on leave Space button - click - get name and call leaveSpace
 */
$body.delegate('button[id="leaveSpace"]', 'click', function () {
  leaveSpace(spacename);
});

function addAdmin(spacename, user) {
  spacename = spacename.replaceAll("%20", " ");
  var formData = new FormData();
  formData.append("name", spacename)
  formData.append("user", user)
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/add_admin',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      console.log("Success")
      renderUserManagementModal()
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  });
}

function removeAdmin(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)
  formData.append("user", user)
  $.ajax({
    type: 'DELETE',
    url: '/spaceadministration/remove_admin',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      console.log("Success")
      renderUserManagementModal()
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  });
}

function kick(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)
  formData.append("user", user)
  $.ajax({
    type: 'DELETE',
    url: '/spaceadministration/kick',
    data: formData,
    contentType: false,
    processData: false,
    success: function (data) {
      console.log("Success")
      renderUserManagementModal()
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  })
}

function sendInvitation(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)
  formData.append("user", user)
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/invite',
    data: formData,
    contentType: false,
    processData: false,
    success: function (data) {
      //TODO
      $('#invitation_btn_' + user.replace('.', '\\.')).replaceWith("<p class='s'>Invitation send!</p>")
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  })
}

function getPendingJoinRequests(spacename) {
  var formData = new FormData();
  formData.append("name", spacename)
  $.ajax({
    type: 'GET',
    url: '/spaceadministration/join_requests?name=' + spacename,
    //data: formData,
    contentType: false,
    processData: false,
    success: function (data) {
      console.log("Success")
      $("#join_request_list div").remove()
      console.log(data['join_requests'])
      if (!data['join_requests'].length == 0) {
        $.each(data['join_requests'], function (entry) {
          if (data['join_requests'][entry] != "") {
            $('#join_request_list').append(Mustache.render($("#space_join_request_template").html(), { username: data['join_requests'][entry], spacename: spacename }))
          }
        })
      } else {
        $('#join_request_list').append('<div class="text-sm text-gray-900 font-light px-6 py-4 whitespace-nowrap"><p>Keine Anfragen für diesen Space vorhanden!</p></div>')
      }
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  })
}

function acceptJoinRequest(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)
  formData.append("user", user)
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/accept_request',
    data: formData,
    contentType: false,
    processData: false,
    success: function (data) {
      $('#join_request_' + user.replace(".", "\\.")).remove()
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  })
}

function declineJoinRequest(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)
  formData.append("user", user)
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/reject_request',
    data: formData,
    contentType: false,
    processData: false,
    success: function (data) {
      $('#join_request_' + user.replace(".", "\\.")).remove()
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  })
}

function getPendingInvites(space_name) {
  $.ajax({
    type: 'GET',
    url: '/spaceadministration/invites?name=' + space_name,
    dataType: "json",
    contentType: false,
    processData: false,
    success: function (data) {
      console.log(data["invites"])
      $.each(data["invites"], function (entry) {
        $('#user_management_table').append(Mustache.render($("#user_management_entry").html(), { isInvite: true, username: data["invites"][entry], role: "Eingeladen", spacename: spacename }))
      })
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    }
  })
}

function renderUserManagementModal() {
  getSpaces()
  $("#user_management_table tr").remove()
  $.each(Spaces, function (space_entry) {
    if (Spaces[space_entry].name == spacename.replaceAll("%20", " ")) {
      $.each(Spaces[space_entry].members, function (member_entry) {
        var role = "member"
        var isAdmin = false
        if (Spaces[space_entry].admins.includes(Spaces[space_entry].members[member_entry])) {
          role = "admin"
          isAdmin = true
        }
        $('#user_management_table').append(Mustache.render($("#user_management_entry").html(), { username: Spaces[space_entry].members[member_entry], role: role, isAdmin: isAdmin, spacename: spacename }))
      })
    }
  })
  getPendingInvites(spacename)
}

// tooltip trigger
var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new Tooltip(tooltipTriggerEl);
});

// search User
function searchUserInvites(users) {
  var currentSpace;
  $.each(Spaces, function (space_entry) {
    if (Spaces[space_entry].name == spacename.replaceAll("%20", " ")) {
      currentSpace = Spaces[space_entry]
    }
  })

  //triggers if a char is changed at input
  $('#invite_search').keyup(function () {
    $('#invite_list').html('');
    $('#state').val('');
    var searchField = $('#invite_search').val();
    var expression = new RegExp(searchField, "i");
    //only search if input isn't empty
    if (searchField != '') {
      $.each(users, function (key, user) {
        if (!currentSpace.members.includes(user.username) && !currentSpace.invites.includes(user.username) && (user.username.search(expression) != -1 || user.email.search(expression) != -1)) {
          user["profile_pic_URL"] = baseUrl + '/uploads/' + user["profile_pic"];
          //$('#invite_list').append('<li class="link-class"><img src="' + user["profile_pic_URL"] + '" height="40" width="40" class="img-thumbnail" /> '+user.username+' | <span class="text-muted">'+user.email+'</span></li>');
          $('#invite_list').append(Mustache.render($("#user_invite_card").html(), { spacename: spacename, user: user }))
        }
      });
    }
  });
}
// search trigger
$('body').delegate('.link-class', 'click', function () {
  var click_text = $(this).text().split('|');
  var selected = $.trim(click_text[0]);
  var type = $(this).parent().last().text().split(' ')[0]
  $('#invite_search').val(selected);
  $("#invite_list").html('');
  if (type === 'Userprofile') {
    window.location.href = baseUrl + '/profile/' + selected;
  }
  if (type === "Spaces") {
    window.location.href = baseUrl + '/space/' + selected;
  }
})

function display_space_acl_permissions() {
  $.ajax({
    type: 'GET',
    url: '/space_acl/get_all' + '?space=' + spacename.replace("%20", " "),
    dataType: 'json',
    success: function (acl_response) {
      console.log(acl_response)
      $("#space_acl_rules").empty()
      var permissions = []
      $.each(acl_response.acl_entries, function (entry) {
        if (acl_response.acl_entries[entry].role == $('#space_role_list').val()) {
          for (let [key, value] of Object.entries(acl_response.acl_entries[entry])) {
            if (key != "space" && key != "role") {
              permissions.push({ "permission": key, "value": value })
            }
          }
        }
      })
      $("#space_acl_rules").empty().append(Mustache.render($("#space_acl_entry_template").html(), { acl_entries: permissions }));
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Server error!',
          message: 'Request for Permissions failed.'
        });
      }
    },
  });
}

function update_space_acl_permission(permission_key) {
  let val = $("#toggle_" + permission_key).is(":checked")
  let space = spacename.replaceAll("%20", " ");
  let role = $("#space_role_list").val()
  let payload = { role: role, space: space }
  payload[permission_key] = val
  $.ajax({
    type: "POST",
    url: "/space_acl/update",
    data: JSON.stringify(payload),
    dataType: "json",
    contentType: "application/json",
    success: function (acl_response) {
      console.log("Succesfully updated permission!")
    },
    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Server error!',
          message: 'Request for Permissions failed.'
        });
      }
    }
  })
}

function handle_space_acl_selection() {
  $("#space_acl_rules").empty()
  $.ajax({
    type: 'GET',
    url: '/space_acl/get_all' + '?space=' + spacename.replace("%20", " "),
    dataType: 'json',
    success: function (acl_response) {
      console.log(acl_response)
      var permissions = []
      $.each(acl_response.acl_entries, function (entry) {
        if (acl_response.acl_entries[entry].role == $('#space_role_list').val()) {
          for (let [key, value] of Object.entries(acl_response.acl_entries[entry])) {
            if (key != "space" && key != "role") {
              permissions.push({ "permission": key, "value": value })
            }
          }
        }
      })
      $("#space_acl_rules").empty().append(Mustache.render($("#space_acl_entry_template").html(), { acl_entries: permissions }));
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if (xhr.status === 403) {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Error!',
          message: 'Insufficient Permission'
        });
      }
      else {
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Server error!',
          message: 'Request for Permissions failed.'
        });
      }
    },
  });
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