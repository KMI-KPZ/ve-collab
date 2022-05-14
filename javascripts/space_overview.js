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

$.get("/template", function(template, textStatus, jqXhr) {
  spaceTemplate = $(template).filter('#spaceTemplate').html()
  acl_button = $(template).filter('#acl_button').html()
})

var Spaces = [];
var spacename;
var currentUser = {};

$(document).ready(function () {
  getRouting();
  getCurrentUserInfo();
  getUserRole();
  getAllUsers();
  getSpaces()

  add_acl_button()
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
    success: function (data) {
      console.log("get Spaces success");
      var $dropdown = $body.find('#spaceDropdown');
      console.log(data.spaces)
      $.each(data.spaces, function (i, space) {
        //return if already rendered
        if(document.body.contains(document.getElementById(space._id))) return;
        // inSpace as local var (not the global)
        var inSpace = (currentUser.spaces.indexOf(space.name) > -1) ? true : false;
        // needed for displaying "join" button
        if(inSpace != false) {
          space['inSpace'] = inSpace;
          $dropdown.prepend(Mustache.render(spaceTemplate, space));
          localStorage.setItem(space.name, space.members);
          Spaces.push(space);
        }
        $('#spaceOverviewEntries').prepend(Mustache.render($('#spaceOverviewEntry').html(), {project_id: space._id, space_description: space.space_description, project_name: space.name.replace(" ", "%20"), display_name: space.name, space_pic: space.space_pic, members: space.members, inSpace: inSpace}))
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
      else if(xhr.status === 403){
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
 * Gets current user roles
 */
function getUserRole(){
  $.ajax({
    type: 'GET',
    url: '/permissions',
    dataType: 'json',
    async: false,
    success: function (data) {
      userRole = data.role;
      if(userRole != 'admin') $('#adminLink').attr("href", baseUrl + '/main');
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if(xhr.status === 403){
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
            message: 'Request users role'
        });
      }
    },
  });
}

/**
 * getCurrentUserInfo - saves currenUser information
 * first time calling InitNewsFeed (on document load)
 * calls getAllUser for Search
 */
function getCurrentUserInfo() {
  $.ajax({
    type: 'GET',
    url: '/profileinformation',
    dataType: 'json',
    async: false,
    success: function (data) {
      currentUser = data;
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if(xhr.status === 403){
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
            message: 'Request current user information'
        });
      }
    }
  });
}

/**
 * searchUser - search for a username or email in users JSON
 * renders search results
 * @param  {JSON} users all Users from getAllUsers()
 */
function searchUser(users) {
  $.ajaxSetup({ cache: false });
  //triggers if a char is changed at input
  $('#search').keyup(function(){
    $('#result').html('');
    $('#state').val('');
    var searchField = $('#search').val();
    var expression = new RegExp(searchField, "i");
    //only search if input isn't empty
    if(searchField != '') {
     $.each(users, function(key, user){
      if (user.username.search(expression) != -1 || user.email.search(expression) != -1)
        {
          user["profile_pic_URL"] = baseUrl + '/uploads/' + user["profile_pic"];
          $('#result').append('<li class=""><img src="' + user["profile_pic_URL"] + '" height="40" width="40" class="img-thumbnail" /> '+user.username+' | <span class="text-muted">'+user.email+'</span></li>');
        }
      });
    }
  });
}

/**
 * getAllUsers - stores all Users in "users" and calls searchUser
 *
 */
function getAllUsers(){
  $.ajax({
    type: 'GET',
    url: '/users/list',
    dataType: 'json',
    success: function (data) {
      users = data;
      searchUser(users);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if(xhr.status === 403){
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
            message: 'Request all user information'
        });
      }
    },
  });
}

/**
 * Gets routing table from server
 */
function getRouting(){
  $.ajax({
    type: "GET",
    url: "/routing",
    success: function(response){
      routingTable = response.routing;
    },
    error: function(){
      alert("Critical Server Error, Please visit the Platform Page!");
    }
  })
}

/**
 * on join Space button - click - get name and call joinSpace
 */
$body.delegate('button[id="joinSpace"]', 'click', function () {
    var name = $(this).attr('name');
    joinSpace(name);

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
      location.reload()
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if(xhr.status === 403){
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
      location.reload()
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if(xhr.status === 403){
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
    if (name != '') createSpace(name);
});

/**
 * createSpace - creates new Space
 * resets input value and calls getSpaces for update
 * @param  {String} name name of new Space
 */
function createSpace(name) {
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/create?name=' + name,
    success: function (data) {
      //console.log("created space " + name);
      $body.find('#newSpaceName').val('');
      getSpaces();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      }
      else if(xhr.status === 403){
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

/**
 * if user role is admin, adds button to navbar to access acl tables
 */
function add_acl_button() {
  $.ajax({
      type: 'GET',
      url: '/role/my',
      dataType: 'json',
      success: function (data) {
          if(data.role == "admin") {
            $("#navbar_items").append(Mustache.render(acl_button))
          }

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
