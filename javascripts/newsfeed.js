baseUrl = 'http://localhost:8889';
var $modules = $('#row');

$(document).ready(function () {
  var now = new Date().toLocaleString();
  var from = new Date(2016).toLocaleString();
  //getTimeline(new Date().toLocaleString(), now);
  getSpaces();
});

function getTimeline(from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      console.log("get timeline success");
      console.log(timeline);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error get timeline');
        console.log(error);
        console.log(status);
        console.log(xhr);
    }
    },
  });
}

function getTimelineSpace(spacename, from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline/space/' + spacename + '?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      console.log("get timeline Space success");
      console.log(timeline);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error get timeline space');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function getTimelineUser(userid, from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline/user/' + userid + '?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      console.log("get timeline User success");
      console.log(timeline);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error get timeline user');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function post(text, tags, space) {
  dataBody = {
    'text': text,
    'tags': tags,
    'space': space,
  };
  $.ajax({
    type: 'POST',
    url: baseUrl + '/posts',
    data: dataBody,
    success: function (data) {
      console.log("posted " + text)
      console.log(data);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error posting');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function postComment(text, id) {
  dataBody = {
    'text': text,
    'post_id': id,
  };
  $.ajax({
    type: 'POST',
    url: baseUrl + '/comment',
    data: dataBody,
    success: function (data) {
      console.log("posted " + text);
      console.log(data);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error posting comment');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function postLike(id) {
  dataBody = {
    'post_id': id,
  };
  $.ajax({
    type: 'POST',
    url: baseUrl + '/like',
    data: dataBody,
    success: function (data) {
      console.log("posted like");
      console.log(data);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error posting like');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}


function getSpaces() {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/space/list',
    dataType: 'json',
    success: function (spaces) {
      console.log("get Spaces success");
      console.log(spaces);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error get spaces');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function createSpace(name) {
  $.ajax({
    type: 'POST',
    url: baseUrl + '/space/create?name=' + name,
    success: function (data) {
      console.log("created space");
      console.log(data);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error creating Space');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function joinSpace(name) {
  $.ajax({
    type: 'POST',
    url: baseUrl + '/space/join?name=' + name,
    success: function (data) {
      console.log("joined spaces");
      console.log(data);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error joining Space');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}
