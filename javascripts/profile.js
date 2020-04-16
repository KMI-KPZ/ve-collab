

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
      setTimeout(function () {
        getCurrentUserInfo();
      }, 1000);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error post follow');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
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
      setTimeout(function () {
        getCurrentUserInfo();
      }, 1000);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error post follow');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}
