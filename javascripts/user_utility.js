/**
 *  getUserRole - returns role of the current user
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
