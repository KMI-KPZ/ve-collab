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
var postTemplate = document.getElementById('postTemplate').innerHTML;
var commentTemplate = document.getElementById('commentTemplate').innerHTML;
var tagTemplate = document.getElementById('tagTemplate').innerHTML;

//Boolean & Data
var inSpace = false;
var spacename;
var currentUser = {};
var user = {};
var users = {};

var fileList = [];
/**
 * initNewsFeed - renders the timeline depending on the current URL
 * update Datetimes and get information about all Spaces
 */
function initNewsFeed() {
  if(!document.body.contains(document.getElementById('newPostPanel'))) {
    //console.log(currentUser);
    currentUser["profile_pic_URL"] = baseUrl + '/uploads/' + currentUser["profile"]["profile_pic"];
    $('#newPostContainer').prepend(Mustache.render(document.getElementById('newPostTemplate').innerHTML, currentUser));
  }
  today = new Date();
  now = today.toISOString();
  from = yesterday.toISOString();

  if (currURL == baseUrl + '/admin') {
    inSpace = false;
    getTimeline(from, now);

  } else if (currURL == baseUrl + '/main') {
    inSpace = false;
    getPersonalTimeline(from,now);
  } else if (currURL.indexOf(baseUrl + '/space') !== -1) {
    inSpace = true;
    spacename = currURL.substring(currURL.lastIndexOf('/') + 1);
    document.title = spacename + ' - Social Network';
    getTimelineSpace(spacename, from, now);
  } else if (currURL == baseUrl + '/myprofile') {
    inSpace = false;
    document.title = currentUser.username + ' - Social Network';

    currentUser['followSize'] = currentUser['follows'].length;
    currentUser['spaceSize'] = currentUser['spaces'].length;
    currentUser["profile_pic_URL"] = baseUrl + '/uploads/' + currentUser["profile"]["profile_pic"];
    if(currentUser.hasOwnProperty('projects')) currentUser['projectSize'] = currentUser['projects'].length;
    if(!document.body.contains(document.getElementById('profilePanel'))){
      $('#profileContainer').prepend(Mustache.render(document.getElementById('profileTemplate').innerHTML, currentUser));
    } else {
      var template = document.getElementById('profileTemplate').innerHTML;
      Mustache.parse(template);
      var render = Mustache.to_html(template, currentUser);
      $("#profileContainer").empty().html(render);
    }
    getTimelineUser(currentUser.username, from, now);

  } else if (currURL.indexOf(baseUrl + '/profile') !== -1) {
    inSpace = false;
    name = currURL.substring(currURL.lastIndexOf('/') + 1);
    if(name == currentUser.username){
      window.location.href = baseUrl + '/myprofile';
    } else {
    document.title = name + ' - Social Network';

    getUserInfo(name);
    user["profile_pic_URL"] = baseUrl + '/uploads/' + user.profile_pic;
    getFollows(name);
    user["isFollowed"] = (currentUser.follows.includes(name)) ? true : false;

    if(!document.body.contains(document.getElementById('profilePanel'))){
      $('#profileContainer').prepend(Mustache.render(document.getElementById('profileTemplate').innerHTML, user));
    } else {
      var template = document.getElementById('profileTemplate').innerHTML;
      Mustache.parse(template);
      var render = Mustache.to_html(template, user);
      $("#profileContainer").empty().html(render);
    }
    getTimelineUser(name, from, now);
    }
  }
  getSpaces();
}

/**
 * document ready - basically initialize all Data about the current User and the page
 * calls getCurrentUserInfo, checkUpdate (every x seconds)
 * while scrolling down the page: updates "from" - Datetime and Timeline (depending on URL)
 */
$(document).ready(function () {
  getCurrentUserInfo();

  const interval  = setInterval(function() {
     checkUpdate();
  }, 10000);

  $(window).scroll(function() {
        // vertical amount of pixel before event should trigger
        var nearToBottom = 10;

        if ($(window).scrollTop() + $(window).height() > $(document).height() - nearToBottom) {
               yesterday = new Date(yesterday - (24 * 60 * 60 * 1000));
               initNewsFeed();
        }
  });
});

/**
 * on new post - click - get all the values which should be postet and calls post function
 */
$body.delegate('#post', 'click', function () {
    var text = String($('#postFeed').val());
    var tags = $("input[id=addTag]").tagsinput('items');
    //check if there is a space selected to post into
    var selectedValue = ($( "#selectSpace option:selected" ).val() === "null") ? null : $( "#selectSpace option:selected" ).val();
    //while in space page: post in this space
    var space = (inSpace) ? spacename : selectedValue;
    if(text!='') post(text, tags, space);
    else {
      $("#postAlert").html('Add some text to your post!');
      $("#postAlert").addClass("alert alert-danger");
    }
  });

/**
 * on new comment post - click - get the text and postID to call postComment
 */
$body.delegate('#postComment', 'click', function () {
    var $inputBox = $(this).closest('#commentBox');
    var $inputText = $inputBox.find('#commentInput').val();
    $inputBox.find('#commentInput').val('');
    var $id = $inputBox.closest('.panel').attr('id');
    if($inputText != '') postComment($inputText, $id);
});

/**
 * on create Space button - click - get name and call createSpace if not empty
 */
$body.delegate('#createSpace', 'click', function () {
    var name = $body.find('#newSpaceName').val();
    if (name != '') createSpace(name);
});

/**
 * on join Space button - click - get name and call joinSpace
 */
$body.delegate('button[id="joinSpace"]', 'click', function () {
    var name = $(this).attr('name');
    joinSpace(name);
});

/**
 * triggers when searchresult is clicked - get his username and redirect to his profile
 */
$body.delegate('.link-class', 'click', function () {
    var click_text = $(this).text().split('|');
    var selectedUser = $.trim(click_text[0]);
    $('#search').val(selectedUser);
    $("#result").html('');
    window.location.href = baseUrl + '/profile/' + selectedUser;
});

$body.delegate('.element i', 'click', function () {
  $("input[type='file']").trigger('click');
});

$body.delegate('#files', 'change', function () {
  var fileInput = document.getElementById('files');
  fileList = [];
  $('#postdiv span').remove();
  $('#postdiv br').remove();
  for(var i=0; i < fileInput.files.length; i++) {
    //console.log(fileInput.files[i]);
    fileList.push(fileInput.files[i]);
    $('#postdiv').append('<span class="name">'+fileInput.files[i].name+'</span></br>');
  }
});

function getExtension(filename) {
  var parts = filename.split('.');
  return parts[parts.length - 1];
}

function isImage(filename) {
  var ext = getExtension(filename);
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'bmp':
    case 'png':
      //etc
      return true;
  }
  return false;
}

function isVideo(filename) {
  var ext = getExtension(filename);
  switch (ext.toLowerCase()) {
    case 'm4v':
    case 'avi':
    case 'mpg':
    case 'mp4':
    case 'webm':
    case 'ogg':
    case 'gif':
    case 'ogv':
      // etc
      return true;
  }
  return false;
}

function nextSlide(id) {
  $("#" + id +'.carousel.slide').carousel("next");
  $("#" + id +'.carousel.slide').carousel("pause");
}

function previousSlide(id) {
  $("#" + id +'.carousel.slide').carousel("prev");
  $("#" + id +'.carousel.slide').carousel("pause");
}

/**
 * calculateAgoTime
 *
 * @param  {String} creationDate Date of the Post
 * @return {String} Output String with ago time
 */
function calculateAgoTime(creationDate) {
  var ago = new Date() - new Date(creationDate); // in milliseconds
  var mins = Math.floor((ago/1000)/60) + new Date().getTimezoneOffset(); // minutes + timezone offset
  var postDate = new Date(creationDate);

  if (Math.floor(mins / 60) == 0){
    return "" + mins % 60 + " mins ago";
  } else if (Math.floor(mins / 60) > 24) {
    return '' + postDate.getDate() + '.' + (postDate.getMonth()+1) + '.' + postDate.getFullYear() + ' - ' + postDate.getHours() + ':' + postDate.getMinutes();
  } else {
    return "" + Math.floor(mins / 60) + " hours " + mins % 60 + " mins ago";
  }
}

/**
 * comp - compare function for sorting Dates of Posts
 * @param  {JSON} a Post a
 * @param  {JSON} b Post b
 * @return {Float}   timevalue
 */
function comp(a, b) {
    return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
}

/**
 * displayTimeline - renders Timeline
 * initialize tagsinput and tooltip
 * @param  {JSON} timeline description
 */
function displayTimeline(timeline) {

  console.log("get timeline success");
  $('input[data-role=tagsinput]').tagsinput({
    allowDuplicates: false
  });
  $('[data-toggle="tooltip"]').tooltip();
  $('.carousel').carousel();
  //loading posts => set from-Date until there is a post in interval from - to
  if(timeline.posts.length === 0 && daysAgo < 30) {
    yesterday = new Date(yesterday - (24 * 60 * 60 * 1000));
    daysAgo += 1;
    initNewsFeed();
    return;
  }
  daysAgo = 0;
  //sort posts based on creation_date from new to older
  var sortPostsByDateArray = timeline.posts.sort(comp);
  $.each(sortPostsByDateArray, function (i, post) {
    var countLikes = 0;
    var likerHTML = '';
    var liked = false;
    if (post.hasOwnProperty('likers')) {
      countLikes = post.likers.length;
      post.likers.forEach(function (liker, index){
        likerHTML +='<li>' + liker + '</li>';
        if(currentUser.username == liker) liked = true;
      });
    }
    // case if post already displayed => update values of post
    if(document.body.contains(document.getElementById(post._id))){
      // updating values
      var $existingPost = $('#' + post._id);
      var $likeCounter = $existingPost.find('#likeCounter');
      var $likers = $existingPost.find('#likers');
      var $likeIcon = $likers.find('#likeIcon');
      var $agoPost = $existingPost.find('#agoPost');
      $agoPost.text(calculateAgoTime(post.creation_date));
      $likers.attr("data-original-title",likerHTML);
      $likeCounter.text(countLikes);
      //toggle class if liked
     if(liked && $likeIcon.hasClass('fa-thumbs-up')) {
        $likeIcon.removeClass('fa-thumbs-up').addClass('fa-thumbs-down');
      } else if(!liked && $likeIcon.hasClass('fa-thumbs-down')) {
        $likeIcon.removeClass('fa-thumbs-down').addClass('fa-thumbs-up');
      }
      var $commentsList = $existingPost.find('.comments-list');
      if (post.hasOwnProperty('comments')) {
        $.each(post.comments, function (j, comment) {
          var existingComment = document.getElementById(comment._id);
          // case if comments doesn't exist => render Comment (postComment)
          if(!document.body.contains(existingComment)) {
              var isCommentAuthor = (currentUser.username == comment.author.username) ? true : false;
              comment["isCommentAuthor"] = isCommentAuthor;
              comment["authorPicURL"] = baseUrl + '/uploads/' + comment.author.profile_pic;
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
    //check if there are files to display
    if(post.hasOwnProperty('files') && post.files.length > 0) {
        var fileImages = [];
        var fileVideos = [];
        var fileMediaCountTail = [];

        var otherfiles = [];
        $.each(post.files, function (j, file) {
          if(isImage(file)) fileImages.push(baseUrl + '/uploads/' + file);
          else if (isVideo(file)) fileVideos.push(baseUrl + '/uploads/' + file);
          else {
            otherfiles.push({"path": baseUrl + '/uploads/' + file, "name" : file});
          }
        });

        post["hasMedia"] = ((fileImages.length + fileVideos.length) > 0) ? true : false;
        post["multipleMedia"] = ((fileImages.length + fileVideos.length) > 1) ? true : false;
        var media = fileImages.concat(fileVideos); //concatenation of 2 arrays
        var firstMediaURL = media.shift();  //removes first element of media
        post["firstMediaURL"] = firstMediaURL;
        post["firstMediaIsImage"] = (isImage(firstMediaURL)) ? true : false;
        post["tailImagesURL"] = fileImages.filter(value => media.includes(value)); //intersection of 2 arrays => fileImages and media
        post["tailVideosURL"] = fileVideos.filter(value => media.includes(value));

        for(var i=0; i<media.length; i++) fileMediaCountTail.push(i+1);
        post["fileMediaCountTail"] = fileMediaCountTail;
        post["otherfiles"] = otherfiles;
    }

    var isAuthor = (currentUser.username == post.author.username) ? true : false;
    //add additional values to post JSON
    post["isAuthor"] = isAuthor;
    post["authorPicURL"] = baseUrl + '/uploads/' + post.author.profile_pic;
    post["ago"] = calculateAgoTime(post.creation_date);
    post["likes"] = countLikes;
    post["tags"] = post["tags"].toString();
    //check if it was postet in a space
    if (post.space == null) {
      post["hasSpace"] = false;
    } else post["hasSpace"] = true;

    var firstPostDate = $feedContainer.find('.post:first').attr('name');
    // check if there is a new post (more present datetime) => prepend to feedContainer
    // else post is older => append to feedContainer
    if(!(firstPostDate === null) && post.creation_date > firstPostDate) {
      $feedContainer.prepend(Mustache.render(postTemplate, post));
    } else $feedContainer.append(Mustache.render(postTemplate, post));
    //console.log(post);
    //in both case render comments to post and tags
    var $feed = $('#' + post._id);
    var $likeIcon = $feed.find('#likeIcon');
    if(liked) $likeIcon.removeClass('fa-thumbs-up').addClass('fa-thumbs-down');
    if (post.hasOwnProperty('comments')) {
      var $commentsList = $feed.find('.comments-list');
      $.each(post.comments, function (j, comment) {
        var isCommentAuthor = (currentUser.username == comment.author.username) ? true : false;
        comment["isCommentAuthor"] = isCommentAuthor;
        comment["authorPicURL"] = baseUrl + '/uploads/' + comment.author.profile_pic;
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
}

/**
 * getTimeline - get Admin timeline and call displayTimeline
 *
 * @param  {String} from DateTime String (ISO)
 * @param  {String} to   DateTime String (ISO)
 */
function getTimeline(from, to) {
  $.ajax({
    type: 'GET',
    url: '/timeline?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      displayTimeline(timeline);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get timeline');
        console.log(error);
        console.log(status);
        console.log(xhr);
    }
    },
  });
}

/**
 * getPersonalTimeline - get Personal timeline and call displayTimeline
 *
 * @param  {String} from DateTime String (ISO)
 * @param  {String} to   DateTime String (ISO)
 */
function getPersonalTimeline(from, to) {
  $.ajax({
    type: 'GET',
    url: '/timeline/you?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      displayTimeline(timeline);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get Personal timeline');
        console.log(error);
        console.log(status);
        console.log(xhr);
    }
    },
  });
}

/**
 * getTimelineSpace - get Space timeline and call displayTimeline
 * renders spaceProfilePanel - gets the spacemembers out of localStorage
 * @param  {String} from DateTime String (ISO)
 * @param  {String} to   DateTime String (ISO)
 */
function getTimelineSpace(spacename, from, to) {
  $.ajax({
    type: 'GET',
    url: '/timeline/space/' + spacename + '?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      displayTimeline(timeline);
      var members = localStorage.getItem(spacename).split(",");
      if(!document.body.contains(document.getElementById('spaceProfilePanel'))) $('#spaceProfileContainer').prepend(Mustache.render(document.getElementById('spaceHeaderTemplate').innerHTML, {spacename: '' + spacename + '', members : members, memberSize : members.length}));

    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get timeline space');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * getTimelineUser - get a User timeline (profile) and call displayTimeline
 *
 * @param  {String} username Name of the User
 * @param  {String} from DateTime String (ISO)
 * @param  {String} to   DateTime String (ISO)
 */
function getTimelineUser(username, from, to) {
  $.ajax({
    type: 'GET',
    url: '/timeline/user/' + username + '?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      displayTimeline(timeline);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get timeline user');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * post - post Feed and resets Values for Input
 * calls InitNewsFeed for update
 * @param  {String} text
 * @param  {String} tags
 * @param  {String} space
 */
function post(text, tags, space) {
  var formData = new FormData();
  fileList.forEach(function (file, i) {
    formData.append("file"+i, file);
  });

  formData.append("file_amount", fileList.length);
  formData.append("text", text);
  formData.append("tags", tags);
  if(space != null){
    formData.append("space", space);
  }
  // Display the key/value pairs
  /*
  for (var pair of formData.entries()) {
      console.log(pair[0]+ ', ' + pair[1]);
  }
  */
  $.ajax({
    type: 'POST',
    url: '/posts',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      //console.log("posted " + form);
      initNewsFeed();
      $('#postFeed').val('');
      $("input[id=addTag]").tagsinput('removeAll');

      fileList = [];
      $('#postdiv span').remove();
      $('#postdiv br').remove();

      $("#postAlert").html('');
      $("#postAlert").removeClass("alert alert-danger");
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error posting');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * deletePost - removes HTML element
 * calls InitNewsFeed for update
 * @param  {String} id id of the Post
 */
function deletePost(id) {
  dataBody = {
    'post_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'DELETE',
    url: '/posts',
    data: dataBody,
    success: function (data) {
      console.log("deleted post " + id);
      $('#'+id).remove();
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error deleting post');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * postComment - calls initNewsFeed for update after success
 *
 * @param  {String} text comment Text
 * @param  {String} id   id of the Post
 */
function postComment(text, id) {
  dataBody = {
    'text': text,
    'post_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: '/comment',
    data: dataBody,
    success: function (data) {
      console.log("posted " + text);
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error posting comment');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * deleteComment - removes HTML element
 * calls initNewsFeed after success for update
 * @param  {String} id id of the Comment
 */
function deleteComment(id) {
  dataBody = {
    'comment_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'DELETE',
    url: '/comment',
    data: dataBody,
    success: function (data) {
      console.log("deleted comment " + id);
      $('#'+id).remove();
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error deleting comment');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * postLike - calls initNewsFeed for update after success
 *
 * @param  {String} id id of the Post
 */
function postLike(id) {
  dataBody = {
    'post_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: '/like',
    data: dataBody,
    success: function (data) {
      console.log("liked post " + id);
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error posting like');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * deleteLike - removes your own like on a post
 * calls initNewsFeed for update after success
 * @param  {String} id id of the post
 */
function deleteLike(id) {
  dataBody = {
    'post_id': id
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'DELETE',
    url: '/like',
    data: dataBody,
    success: function (data) {
      console.log("disliked post " + id);
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error posting dislike');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

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

      $.each(data.spaces, function (i, space) {
        //return if already rendered
        if(document.body.contains(document.getElementById(space._id))) return;
        // inSpace as local var (not the global)
        var inSpace = (currentUser.spaces.indexOf(space.name) > -1) ? true : false;
        // needed for displaying "join" button
        space['inSpace'] = inSpace;
        $dropdown.prepend(Mustache.render(document.getElementById('spaceTemplate').innerHTML, space));
        localStorage.setItem(space.name, space.members);
        // if not in Space render spaceTemplateSelect
        if (currURL.indexOf(baseUrl + '/space') == -1) {
          $('#selectSpace').append(Mustache.render(document.getElementById('spaceTemplateSelect').innerHTML, space));
        }
    });
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get spaces');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

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
      console.log("created space " + name);
      $body.find('#newSpaceName').val('');
      getSpaces();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error creating Space');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * joinSpace - joins Space
 *
 * @param  {String} name Spacename
 */
function joinSpace(name) {
  $.ajax({
    type: 'POST',
    url: '/spaceadministration/join?name=' + name,
    success: function (data) {
      console.log("joined space " + name);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error joining Space');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * checkUpdate - if response is 200 there is a new post => call initNewsFeed for update
 * now is datetime of last checking the timeline (ISO String)
 */
function checkUpdate() {
  $.ajax({
    type: 'GET',
    url: '/updates?from=' + now,
    dataType: 'json'
  }).done(function (data, statusText, xhr) {
    if (xhr.status == 200) initNewsFeed();
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
    success: function (data) {
      currentUser = data;
      getAllUsers();
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get current user info');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * getUserInfo - get basic information about a user
 * because we dont get every information right now, we need to call getFollows
 * store user information in "user"
 * @param  {String} name username
 */
function getUserInfo(name){
  $.ajax({
    type: 'GET',
    url: '/users/user_data?username=' + name,
    dataType: 'json',
    async: false,
    success: function (data) {
      user = data;
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get user info');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
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
       $('#result').append('<li class="list-group-item link-class"><img src="' + user["profile_pic_URL"] + '" height="40" width="40" class="img-thumbnail" /> '+user.username+' | <span class="text-muted">'+user.email+'</span></li>');
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
      //console.log(users);
      searchUser(users);
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error get all users');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * getFollows - get JSON of who the user is following
 * renders profileTemplate
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
        window.location.href = loginURL;
      } else {
        alert('error get user follows');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

/**
 * likeDislike - toggle function for html update on like & dislike
 * calls deleteLike or postLike depending on elements html class
 * @param  {HTML} e  html element
 * @param  {String} id id of the post
 */
function likeDislike(e, id) {
  var likeIcon = e.firstElementChild;
  if(likeIcon.classList.contains("fa-thumbs-down")) {
    deleteLike(id);
  } else {
    postLike(id);
  }
}
