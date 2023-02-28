/**
 *  getUserRole - returns role of the current user
 */
function getUserRole() {
  $.ajax({
    type: 'GET',
    url: '/role/my',
    dataType: 'json',
    async: false,
    success: function (data) {
      userRole = data.role;
      if (userRole != 'admin') $('#adminLink').attr("href", baseUrl + '/main');
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
          message: 'Request current user information'
        });
      }
    }
  });
}

/**
 * getAllUsers - stores all Users in "users" and calls searchUser
 */
function getAllUsers() {
  $.ajax({
    type: 'GET',
    url: '/users/list',
    dataType: 'json',
    success: function (data) {
      users = data;
      //searchUser(users);
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
          message: 'Request all user information'
        });
      }
    },
  });
}
