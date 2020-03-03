baseUrl = 'http://localhost:8889';
var currURL = window.location.href;
var $body = $('body');
var $feedContainer = $('#feedContainer');

var today = new Date();
var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)); //24 hours ago
var now = today.toISOString();
var from = yesterday.toISOString();

var postTemplate = document.getElementById('postTemplate').innerHTML;
var commentTemplate = document.getElementById('commentTemplate').innerHTML;
var tagTemplate = document.getElementById('tagTemplate').innerHTML;
var inSpace = false;
var spacename;
var currentUser = {};

function initNewsFeed() {
  if(!document.body.contains(document.getElementById('newPostPanel'))) {
    console.log(currentUser);
    $('#newPostContainer').prepend(Mustache.render(document.getElementById('newPostTemplate').innerHTML, currentUser));
  }
  today = new Date();
  now = today.toISOString();
  from = yesterday.toISOString();

  if (currURL == baseUrl + '/main') {
    inSpace = false;
    getTimeline(from, now);

  } else if (currURL.indexOf(baseUrl + '/space') !== -1) {
    inSpace = true;
    spacename = currURL.substring(currURL.lastIndexOf('/') + 1);
    document.title = spacename + ' - Social Network';
    getTimelineSpace(spacename, from, now);
  } else if (currURL.indexOf(baseUrl + '/profile') !== -1) {
    getTimelineUser(currentUser.username, from, now);
    currentUser['followSize'] = currentUser['follows'].length;
    if(!document.body.contains(document.getElementById('profilePanel'))) $('#profileContainer').prepend(Mustache.render(document.getElementById('profileTemplate').innerHTML, currentUser));
  }
  getSpaces();
}

$(document).ready(function () {
  getCurrentUserInfo();

  const interval  = setInterval(function() {
    checkUpdate();
  }, 10000);

  $(window).scroll(function() {
        var nearToBottom = 10;

        if ($(window).scrollTop() + $(window).height() > $(document).height() - nearToBottom) {
               yesterday = new Date(yesterday - (24 * 60 * 60 * 1000));
               initNewsFeed();
        }
  });
});

$body.delegate('#post', 'click', function () {
    var text = String($('#postFeed').val());
    var tags = $("input[id=addTag]").tagsinput('items');
    var selectedValue = ($( "#selectSpace option:selected" ).val() === "null") ? null : $( "#selectSpace option:selected" ).val();
    var space = (inSpace) ? spacename : selectedValue;
    post(text, tags, space);
  });

$body.delegate('#postComment', 'click', function () {
    var $inputBox = $(this).closest('#commentBox');
    var $inputText = $inputBox.find('#commentInput').val();
    $inputBox.find('#commentInput').val('');
    var $id = $inputBox.closest('.panel').attr('id');
    postComment($inputText, $id);
});

$body.delegate('#createSpace', 'click', function () {
    var name = $body.find('#newSpaceName').val();
    if (name != '') createSpace(name);
});

$body.delegate('button[id="joinSpace"]', 'click', function () {
    var name = $(this).attr('name');
    joinSpace(name);
});

function calculateAgoTime(creationDate) {
  var ago = new Date() - new Date(creationDate); // in milliseconds
  var mins = Math.floor((ago/1000)/60) + new Date().getTimezoneOffset(); // minutes + timezone offset
  var postDate = new Date(creationDate);
  //console.log(postDate);
  if (Math.floor(mins / 60) == 0){
    return "" + mins % 60 + " mins ago";
  } else if (Math.floor(mins / 60) > 24) {
    return '' + postDate.getDate() + '.' + (postDate.getMonth()+1) + '.' + postDate.getFullYear() + ' - ' + postDate.getHours() + ':' + postDate.getMinutes();
  } else {
    return "" + Math.floor(mins / 60) + " hours " + mins % 60 + " mins ago";
  }
}

function comp(a, b) {
    return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
}

function displayTimeline(timeline) {
  //loading posts => set from Date until there are posts in interval from - to
  console.log("get timeline success");
  if(timeline.posts.length === 0) {
    yesterday = new Date(yesterday - (24 * 60 * 60 * 1000));
    initNewsFeed();
    return;
  }
  var sortPostsByDateArray = timeline.posts.sort(comp);
  //console.log(sortPostsByDateArray);
  $.each(sortPostsByDateArray, function (i, post) {
    var countLikes = 0;
    var likerHTML = '';
    if (post.hasOwnProperty('likers')) {
      countLikes = post.likers.length;
      post.likers.forEach(function (liker, index){
        likerHTML +='<li>' + liker + '</li>';
      });
    }
    // case if post already displayed => update values of post
    if(document.body.contains(document.getElementById(post._id))){
      //$('#' + post._id).remove();
      // updating values
      var $existingPost = $('#' + post._id);
      var $likeCounter = $existingPost.find('#likeCounter');
      var $likers = $existingPost.find('#likers');
      var $agoPost = $existingPost.find('#agoPost');
      $agoPost.text(calculateAgoTime(post.creation_date));
      $likers.attr("data-original-title",likerHTML);
      $likeCounter.text(countLikes);
      var $commentsList = $existingPost.find('.comments-list');
      if (post.hasOwnProperty('comments')) {
        $.each(post.comments, function (j, comment) {
          var existingComment = document.getElementById(comment.author + '' + comment.creation_date);
          //console.log(document.body.contains(existingComment));
          // case if comments doesn't exist => render Comment (postComment)
          if(!document.body.contains(existingComment)) {
              comment["ago"] = calculateAgoTime(comment.creation_date);
              $commentsList.prepend(Mustache.render(commentTemplate, comment));
        } else {
          //update values of comments
          existingComment.querySelector('#agoComment').innerHTML = calculateAgoTime(comment.creation_date);
        }
        });
      }
      return;
    }
    //console.log(post);
    post["ago"] = calculateAgoTime(post.creation_date);
    post["likes"] = countLikes;
    post["tags"] = post["tags"].toString();
    //check if it was postet in a space
    if (post.space == null) {
      post["hasSpace"] = false;
    } else post["hasSpace"] = true;
    //$('#feedContainer').children('.post').last().prepend(Mustache.render(postTemplate, post));
    var firstPostDate = $feedContainer.find('.post:first').attr('name');
    //console.log(firstPostDate);
    // check if there is a new post (more present datetime) => prepend to feedContainer
    // else post is older => append to feedContainer
    if(!(firstPostDate === null) && post.creation_date > firstPostDate) {
      $feedContainer.prepend(Mustache.render(postTemplate, post));
    } else $feedContainer.append(Mustache.render(postTemplate, post));
    //in both case render comments to post and tags
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
  $('input[data-role=tagsinput]').tagsinput({
    allowDuplicates: false
  });
  $('[data-toggle="tooltip"]').tooltip();
}

function getTimeline(from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      displayTimeline(timeline);
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
      displayTimeline(timeline);
      var members = localStorage.getItem(spacename).split(",");
      if(!document.body.contains(document.getElementById('spaceProfilePanel'))) $('#spaceProfileContainer').prepend(Mustache.render(document.getElementById('spaceHeaderTemplate').innerHTML, {spacename: '' + spacename + '', members : members, memberSize : members.length}));

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

function getTimelineUser(username, from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline/user/' + username + '?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      displayTimeline(timeline);
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
      initNewsFeed();
      $('#postFeed').val('');
      $("input[id=addTag]").tagsinput('removeAll');
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
      initNewsFeed();
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
      initNewsFeed();
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
    url: baseUrl + '/spaceadministration/list',
    dataType: 'json',
    success: function (data) {
      console.log("get Spaces success");
      var $dropdown = $body.find('#spaceDropdown');

      $.each(data.spaces, function (i, space) {
        if(document.body.contains(document.getElementById(space._id))) return;
        var inSpace = (currentUser.spaces.indexOf(space.name) > -1) ? true : false;
        space['inSpace'] = inSpace;
        $dropdown.prepend(Mustache.render(document.getElementById('spaceTemplate').innerHTML, space));
        localStorage.setItem(space.name, space.members);
        if (currURL.indexOf(baseUrl + '/space') == -1) {
          $('#selectSpace').append(Mustache.render(document.getElementById('spaceTemplateSelect').innerHTML, space));
        }
    });
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
    url: baseUrl + '/spaceadministration/create?name=' + name,
    success: function (data) {
      console.log("created space " + name);

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
    url: baseUrl + '/spaceadministration/join?name=' + name,
    success: function (data) {
      console.log("joined space" + name);
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

function checkUpdate() {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/updates?from=' + from,
    dataType: 'json',
    success: function (data) {
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 304) {
        console.log("there are no new post updates...")
      } else {
        alert('error get update');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function getCurrentUserInfo() {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/profileinformation',
    dataType: 'json',
    success: function (data) {
      currentUser = data;
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 304) {

      } else {
        alert('error get user info');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}
