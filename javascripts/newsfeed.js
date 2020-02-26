baseUrl = 'http://localhost:8889';
var $body = $('body');
var $feedContainer = $('#feedContainer');

var today = new Date();
var now = today.toLocaleString();
var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)); //24 hours ago
var from = yesterday.toLocaleString();

$(document).ready(function () {
  getTimeline(from, now);
  getSpaces();

});

$body.delegate('#post', 'click', function () {
    var text = String($('#postFeed').val());
    var tags = $("input[id=addTag]").tagsinput('items');
    post(text, tags, null);
  });

$body.delegate('#postComment', 'click', function () {
    var $inputBox = $(this).closest('#commentBox');
    var $inputText = $inputBox.find('#commentInput').val();
    var $id = $inputBox.closest('.panel').attr('id');
    postComment($inputText, $id);
});

function calculateAgoTime(creationDate) {
  var ago = new Date() - new Date(creationDate); // in milliseconds
  var mins = Math.floor((ago/1000)/60) + new Date().getTimezoneOffset(); // minutes + timezone offset
  if (Math.floor(mins / 60) == 0){
    return "" + mins % 60 + " mins ago";
  } else {
    return "" + Math.floor(mins / 60) + " hours " + mins % 60 + " mins ago";
  }
}

function getTimeline(from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      console.log("get timeline success");
      var postTemplate = document.getElementById('postTemplate').innerHTML;
      var commentTemplate = document.getElementById('commentTemplate').innerHTML;
      var tagTemplate = document.getElementById('tagTemplate').innerHTML;

      $.each(timeline.posts, function (i, post) {
        post["ago"] = calculateAgoTime(post.creation_date);
        if (post.hasOwnProperty('likers')) {
          var countLikes = post.likers.length;
          console.log(post.likers);
          post["likes"] = countLikes;
        }
        post["tags"] = post["tags"].toString();
        $feedContainer.prepend(Mustache.render(postTemplate, post));

        var $feed = $('#' + post._id);
        if (post.hasOwnProperty('comments')) {
          var $commentsList = $feed.find('.comments-list');
          $.each(post.comments, function (j, comment) {
            comment["ago"] = calculateAgoTime(comment.creation_date);
            $commentsList.prepend(Mustache.render(commentTemplate, comment));
          });
        }

        //add tags
        var $dom = $feed.find('.meta');
        var tags = post.tags;
        var tagArray = (typeof tags != 'undefined' && tags instanceof Array ) ? tags : tags.split(",");
        tagArray.forEach(function (tag, index) {
            $dom.append(Mustache.render(tagTemplate, { text: '' + tag + '' }));
        });

      });

      $feedContainer.prepend(Mustache.render(document.getElementById('newPostTemplate').innerHTML, post));
      $('input[data-role=tagsinput]').tagsinput({
        allowDuplicates: false
      });
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

  var dataBody = {
    "text": text,
    "tags": tags,
    "space": space
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: baseUrl + '/posts',
    data: dataBody,
    success: function (data) {
      console.log("posted " + dataBody);
      $feedContainer.empty();
      getTimeline(from, now);
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
    'post_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: baseUrl + '/comment',
    data: dataBody,
    success: function (data) {
      console.log("posted " + text);
      $feedContainer.empty();
      getTimeline(from, now);
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
    'post_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: baseUrl + '/like',
    data: dataBody,
    success: function (data) {
      console.log("posted like");
      $feedContainer.empty();
      getTimeline(from, now);
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
