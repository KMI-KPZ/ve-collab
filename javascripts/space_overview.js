//URL's
var loc = new URL(window.location.href);
var baseUrl = window.location.origin; // Returns base URL (https://example.com)
var loginURL = baseUrl + '/login';
var currURL = window.location.href; // Returns full URL (https://example.com/path/example.html)

//Datetimes
var today = new Date();
var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)); //24 hours ago
var now = today.toISOString();
var from = yesterday.toISOString();
var daysAgo = 0;

//HTML & JQuery
var $body = $('body');
var $feedContainer = $('#feedContainer');

/**
 * Gets spaceTemplate and acl button for navbar
 */
var spaceTemplate
var acl_button

$.get("/template", function (template, textStatus, jqXhr) {
  spaceTemplate = $(template).filter('#spaceTemplate').html();
  acl_button = $(template).filter('#acl_button').html();
  wordpress_button = $(template).filter("#wordpress_button").html();
})

var Spaces = [];
var spacename;
var currentUser = {};

$(document).ready(function () {
  getCurrentUserInfo();
  getUserRole();
  getAllUsers();
  getSpaces()
  //addPendingInvitesButton()
  getPendingInvites()
  add_acl_and_wordpress_button();
})

/**
 * getSpaces - gets a list of all Spaces from Server
 * renders Space-Dropdown and Select Space at new Post (spaceTemplate & spaceTemplateSelect)
 * store to localStorage key:spacename, value: [members]
 */
function getSpaces() {
  $.ajax({
    type: 'GET',
    url: '/spaceadministration/list',
    dataType: 'json',
    //important for upload
    success: function (data) {
      console.log("get Spaces success");
      var $dropdown = $body.find('#spaceDropdown');

      $('#spaceOverviewEntries').empty();

      $.each(data.spaces, function (i, space) {
        //return if already rendered
        if (document.body.contains(document.getElementById(space._id))) return;
        // inSpace as local var (not the global)
        var inSpace = (currentUser.spaces.indexOf(space.name) > -1) ? true : false;
        var isRequested = false
        // needed for displaying "join" button
        if (inSpace != false) {
          space['inSpace'] = inSpace;
          $dropdown.prepend(Mustache.render(spaceTemplate, space));
          localStorage.setItem(space.name, space.members);
        } else {
          if (space["requests"].includes(currentUser.username)) {
            isRequested = true
          }
        }
        var space_pic = 'default_group_pic.jpg';
        if (space.hasOwnProperty('space_pic')) {
          space_pic = space["space_pic"];
        }
        $('#spaceOverviewEntries').prepend(Mustache.render($('#spaceOverviewEntry').html(), { project_id: space._id, space_description: space.space_description, project_name: space.name.replace(" ", "%20"), display_name: space.name, space_pic: space_pic, members: space.members, inSpace: inSpace, isRequested: isRequested }))
        // if not in Space render spaceTemplateSelect
        if (currURL.indexOf(baseUrl + '/space') == -1) {
          $('#selectSpace').append(Mustache.render(spaceTemplateSelect, space));
        }
      });
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
          message: 'Request all spaces failed.'
        });
      }
    },
  });
}

/**
 * on join Space button - click - get name and call joinSpace
 */
$body.delegate('button[id="joinSpace"]', 'click', function () {
  var name = $(this).attr('name');
  joinSpace(name);
  $(this).replaceWith("<p>Anfrage geschickt!</p>")
});

/**
 * on leave Space button - click - get name and call leaveSpace
 */
$body.delegate('button[id="leaveSpace"]', 'click', function () {
  var name = $(this).attr('name');
  leaveSpace(name);

});

/**
 * joinSpace - joins Space
 *
 * @param  {String} name Spacename
 */
function joinSpace(name) {
  console.log(name)
  // Replace spaces with %20 for better processing on backend
  name = name.replace(" ", "%20")
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/join?name=' + name,
    success: function (data) {
      console.log("joined space " + name);
      console.log(data)
      //location.reload()
      if (data.join_type == "joined") {
        location.reload()
      } else {

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
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Server error!',
          message: 'Request to join a space'
        });
      }
    },
  });
}

/**
* leaveSpace - leaves Space
*
* @param  {String} name Spacename
*/
function leaveSpace(name) {
  $.ajax({
    type: 'DELETE',
    url: '/spaceadministration/leave?name=' + name,
    success: function (data) {
      //console.log("leaved space " + name);
      //reloads page to update table
      location.reload();
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
          message: 'Request to join a space'
        });
      }
    },
  });
}

/**
 * on create Space button - click - get name and call createSpace if not empty
 */
$body.delegate('#createSpace', 'click', function () {
  var name = $body.find('#newSpaceName').val();
  var invisible = $("#newSpaceInvisibility").is(":checked");
  var joinable = $("#newSpaceJoinability").is(":checked");
  if (name != '') createSpace(name, invisible, joinable);
});

/**
 * createSpace - creates new Space
 * resets input value and calls getSpaces for update
 * @param  {String} name name of new Space
 */
function createSpace(name, visibilty, joinability) {
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/create?name=' + name + '&invisible=' + visibilty + '&joinable=' + joinability,
    success: function (data) {
      //console.log("created space " + name);
      $body.find('#newSpaceName').val('');
      getSpaces();
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
          message: 'Request to create a space failed.'
        });
      }
    },
  });
}

function getPendingInvites() {
  console.log("Hallo")
  $.ajax({
    type: 'GET',
    url: "/spaceadministration/pending_invites",
    success: function (data) {
      console.log(data)

      if (!document.body.contains(document.getElementById('pending_invite_button'))) {
        $('#space_overview_utils').append(Mustache.render($("#pending_invite_modal").html(), { number_of_invites: data.pending_invites.length }))
      }

      $('#pending_invites').empty()
      $.each(data.pending_invites, function (invite) {
        $('#pending_invites').append(Mustache.render($("#space_pending_invite").html(), { spacename: data.pending_invites[invite], username: currentUser.username }))
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
        window.createNotification({
          theme: 'error',
          showDuration: 5000
        })({
          title: 'Server error!',
          message: 'Request to create a space failed.'
        });
      }
    },
  })
}

function acceptInvite(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)

  $.ajax({
    type: 'POST',
    url: "/spaceadministration/accept_invite",
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      console.log("Success")
      getSpaces()
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
          message: 'Request to create a space failed.'
        });
      }
    },
  })
}

function declineInvite(spacename, user) {
  var formData = new FormData();
  formData.append("name", spacename)

  $.ajax({
    type: 'POST',
    url: "/spaceadministration/decline_invite",
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      console.log("Success")
      getSpaces()
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
          message: 'Request to create a space failed.'
        });
      }
    },
  })
}

function addPendingInvitesButton() {
  var number_pending_invites = getPendingInvites()
  console.log(number_pending_invites)
  number_pending_invites.then((response) => {

  })

}