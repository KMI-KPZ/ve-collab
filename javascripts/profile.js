var name

$(document).ready(function () {
  setTimeout(function () {
    name = currURL.substring(currURL.lastIndexOf('/') + 1);
    document.title = name + ' - Lionet';
    getUserInfo(name);
    getFollows(name);
    updateProfileContainer();
  }, 200);
});

/**
 * updateProfileContainer - update profile container with data from user
 */
function updateProfileContainer() {
  user["isFollowed"] = (currentUser.follows.includes(name)) ? true : false;
  var follows_list = []
  var follower_list = []
  var timeout = setInterval(function () {
    if (users != undefined) {
      $.each(user["follows"], function (entry) {
        var pic_url = baseUrl + '/uploads/' + users[user["follows"][entry]]["profile_pic"]
        follows_list.push({
          user_name: user["follows"][entry], user_picture: pic_url
        })
        clearInterval(timeout);
      })
      $.each(user["followers"], function (entry) {
        var pic_url = baseUrl + '/uploads/' + users[user["followers"][entry]]["profile_pic"]
        follower_list.push({
          user_name: user["followers"][entry], user_picture: pic_url
        })
        clearInterval(timeout);
      })
    }
  }, 100)
  user['follows_list'] = follows_list
  user['follower_list'] = follower_list
  if (!document.body.contains(document.getElementById('profilePanel'))) {
    setTimeout(function () {
      $('#profileContainer').empty()
      $('#profileContainer').prepend(Mustache.render(profileTemplate, user));
    }
      , 1000);
  } else {
    Mustache.parse(profileTemplate);
    var render = Mustache.to_html(template, user);
    $("#profileContainer").empty().html(render);
  }
}
/**
 * getUserInfo - get basic information about a user
 * because we dont get every information right now, we need to call getFollows
 * store user information in "user"
 * @param  {String} name username
 */
function getUserInfo(name) {
  $.ajax({
    type: 'GET',
    url: '/users/user_data?username=' + name,
    dataType: 'json',
    async: false,
    success: function (data) {
      //console.log(data)
      user = data;
      user["profile_pic_URL"] = baseUrl + '/uploads/' + user.profile_pic;
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
        alert('error get user info');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * getFollows - get JSON of who the user is following
 * @param  {String} name username
 */
function getFollows(name) {
  $.ajax({
    type: 'GET',
    url: '/follow?user=' + name,
    dataType: 'json',
    async: false,
    success: function (data) {
      user['follows'] = data.follows;
      user['followSize'] = data.follows.length;
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
        alert('error get user follows');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * postFollow - follow the user
 *
 * @param  {String} name username
 */
function postFollow(name) {
  $.ajax({
    type: 'POST',
    url: '/follow?user=' + name,
    success: function (data) {
      console.log("followed" + name);
      currentUser.follows.push(name);
      updateProfileContainer();
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
        alert('error post follow');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * removeA - removes elements by names in a given array
 *
 * @param  {array} arr array
 * @return {array}     array with deleted elements
 */
function removeA(arr) {
  var what, a = arguments, L = a.length, ax;
  while (L > 1 && arr.length) {
    what = a[--L];
    while ((ax = arr.indexOf(what)) !== -1) {
      arr.splice(ax, 1);
    }
  }
  return arr;
}

/**
 * deleteFollow - unfollow the user
 *
 * @param  {String} name username
 */
function deleteFollow(name) {
  $.ajax({
    type: 'DELETE',
    url: '/follow?user=' + name,
    success: function (data) {
      console.log("unfollowed" + name);
      removeA(currentUser.follows, name);
      updateProfileContainer();
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
        alert('error post follow');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}
