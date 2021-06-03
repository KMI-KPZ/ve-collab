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
var postTemplate //= document.getElementById('postTemplate').innerHTML;
var repostTemplate //= document.getElementById('repostTemplate').innerHTML;
var commentTemplate //= document.getElementById('commentTemplate').innerHTML;
var tagTemplate //= document.getElementById('tagTemplate').innerHTML;


var newPostTemplate
var spaceTemplate
var spaceTemplateSelect
var spaceHeaderTemplate
var profileTemplate


$.get("/template", function(template, textStatus, jqXhr) {
  postTemplate = $(template).filter('#postTemplate').html()
  repostTemplate = $(template).filter('#repostTemplate').html()
  commentTemplate = $(template).filter('#commentTemplate').html()
  tagTemplate = $(template).filter('#tagTemplate').html()

  newPostTemplate = $(template).filter('#newPostTemplate').html()
  spaceTemplate = $(template).filter('#spaceTemplate').html()
  spaceTemplateSelect = $(template).filter('#spaceTemplateSelect').html()
  spaceHeaderTemplate = $(template).filter('#spaceHeaderTemplate').html()
  profileTemplate = $(template).filter('#profileTemplate').html()


})

//Boolean & Data
var inSpace = false;
var Spaces = [];
var spacename;
var currentUser = {};
var user = {};
var users = {};
var userRole;
var fileList = [];


var routingTable = {};
/**
 * initNewsFeed - renders the timeline depending on the current URL
 * update Datetimes and get information about all Spaces
 */
function initNewsFeed() {
  if(!document.body.contains(document.getElementById('newPostPanel'))) {
    //console.log(currentUser);
    currentUser["profile_pic_URL"] = baseUrl + '/uploads/' + currentUser["profile"]["profile_pic"];

    // Timeout fix error, where no templates are loading
    // Error: Uncaught TypeError: Invalid template! Template should be a "string" but "undefined" was given as the first argument for mustache#render
    //setTimeout(function(){
    $('#newPostContainer').prepend(Mustache.render(newPostTemplate, currentUser));
    //}, 10);
  }
  today = new Date();
  now = today.toISOString();
  from = yesterday.toISOString();
  console.log("now initalizing date")

  if (currURL == baseUrl + '/admin') {
    if(userRole != 'admin') window.location.href = baseUrl + '/main';
    else {
      inSpace = false;
      getTimeline(from, now);
    }
  } else if (currURL == baseUrl + '/main') {
    inSpace = false;
    getPersonalTimeline(from,now);
  } else if (currURL.indexOf(baseUrl + '/space') !== -1) {
    inSpace = true;
    spacename = currURL.substring(currURL.lastIndexOf('/') + 1);
    getTimelineSpace(spacename, from, now);

  } else if (currURL == baseUrl + '/myprofile') {
    inSpace = false;
    getTimelineUser(currentUser.username, from, now);

  } else if (currURL.indexOf(baseUrl + '/profile') !== -1) {
    inSpace = false;
    var name = currURL.substring(currURL.lastIndexOf('/') + 1);
    if(name == currentUser.username){
      window.location.href = baseUrl + '/myprofile';
    } else {
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
  getRouting();
  getCurrentUserInfo();
  getUserRole();
  getAllUsers();

  initNewsFeed();

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

$body.delegate('i.fa-file', 'click', function () {
  $("input[type='file']").trigger('click');
});

$body.delegate('#record', 'click', function () {
  if($(this).hasClass('btn-success')){
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
      handlerFunction(stream);
      console.log("recording");
      $(this).removeClass('btn-success');
      $(this).addClass('btn-danger');
      audioChunks = [];
      rec.start();
    });
  } else {
    console.log("stopped recording");
    $(this).removeClass('btn-danger');
    $(this).addClass('btn-success');
    rec.stop();
  }
});

function handlerFunction(stream){
  rec = new MediaRecorder(stream);
  rec.ondataavailable = e => {
    audioChunks.push(e.data);
    if (rec.state == "inactive"){
      let blob = new Blob(audioChunks,{type:'audio/mpeg-3'});
      recordedAudio.src = URL.createObjectURL(blob);
      recordedAudio.controls=true;
      recordedAudio.autoplay=true;
      for (var pair of fileList.entries()) {
          if(pair[1].name == "VoiceInput.mpeg") fileList.splice(pair[0], 1);
      }
      fileList.push(new File([blob], "VoiceInput.mpeg"));
    }
  }
}

$body.delegate('#files', 'change', function () {
  var fileInput = document.getElementById('files');
  for (var pair of fileList.entries()) {
      if(pair[1].name != "VoiceInput.mpeg") fileList.splice(pair[0], 1);
  }
  $('#postdiv span').remove();
  $('#postdiv br').remove();
  for(var i=0; i < fileInput.files.length; i++) {
    console.log(fileInput.files[i]);
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

function isAudio(filename) {
  var ext = getExtension(filename);
  switch (ext.toLowerCase()) {
    case 'mpeg':
      //etc
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
      if(post.hasOwnProperty('isRepost') && (post.isRepost == true)){
        var $originalAgo = $existingPost.find('#originalAgo');
        $originalAgo.text(calculateAgoTime(post.originalCreationDate));
      }
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
        var fileAudios = [];
        var fileMediaCountTail = [];
        var otherfiles = [];

        $.each(post.files, function (j, file) {
          if(isImage(file)) fileImages.push(baseUrl + '/uploads/' + file);
          else if (isVideo(file)) fileVideos.push(baseUrl + '/uploads/' + file);
          else if (isAudio(file)) fileAudios.push(baseUrl + '/uploads/' + file);
          else {
            otherfiles.push({"path": baseUrl + '/uploads/' + file, "name" : file});
          }
        });

        post["hasMedia"] = ((fileImages.length + fileVideos.length) > 0) ? true : false;
        post["multipleMedia"] = ((fileImages.length + fileVideos.length) > 1) ? true : false;
        if(post["hasMedia"] == true){
          var media = fileImages.concat(fileVideos); //concatenation of 2 arrays
          var firstMediaURL = media.shift();  //removes first element of media
          post["firstMediaURL"] = firstMediaURL;
          post["firstMediaIsImage"] = (isImage(firstMediaURL)) ? true : false;
          post["tailImagesURL"] = fileImages.filter(value => media.includes(value)); //intersection of 2 arrays => fileImages and media
          post["tailVideosURL"] = fileVideos.filter(value => media.includes(value));
          for(var i=0; i<media.length; i++) fileMediaCountTail.push(i+1);
          post["fileMediaCountTail"] = fileMediaCountTail;
      }
        post["audiosURL"] = fileAudios;
        post["otherfiles"] = otherfiles;
    }

    var isAuthor = (currentUser.username == post.author.username) ? true : false;
    var isRepostAuthor = (currentUser.username == post.repostAuthor) ? true : false;
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

    //console.log(post)
    if(post['isRepost'] == true){

      post["isRepostAuthor"] = isRepostAuthor;
      post["originalAgo"] = calculateAgoTime(post.originalCreationDate);
      post["repostAuthorPicURL"] = baseUrl + '/uploads/' + post.repostAuthorProfilePic;
      // check if there is a new post (more present datetime) => prepend to feedContainer
      // else post is older => append to feedContainer
      if(!(firstPostDate === null) && post.creation_date > firstPostDate) {
          $feedContainer.prepend(Mustache.render(repostTemplate, post));
      } else $feedContainer.append(Mustache.render(repostTemplate, post));
    } else{
        if(!(firstPostDate === null) && post.creation_date > firstPostDate) {
            $feedContainer.prepend(Mustache.render(postTemplate, post));
        } else $feedContainer.append(Mustache.render(postTemplate, post));
    }

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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'Request for admin timeline failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'Request for personal timeline failed'
        });
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
      if(!document.body.contains(document.getElementById('spaceProfilePanel'))) $('#spaceProfileContainer').prepend(Mustache.render(spaceHeaderTemplate, {spacename: '' + spacename + '', members : members, memberSize : members.length}));

    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'Request for spacetimeline failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'Request for Usertimeline failed.'
        });
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
      var audio = document.getElementById("recordedAudio");
      audio.removeAttribute("controls");

      $("#postAlert").html('');
      $("#postAlert").removeClass("alert alert-danger");
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'posting to timeline failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'Request to delete the post failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'post comment failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'Request to delete comment failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'like failed.'
        });
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
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'delete like failed.'
        });
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
        $dropdown.prepend(Mustache.render(spaceTemplate, space));
        localStorage.setItem(space.name, space.members);
        Spaces.push(space);
        // if not in Space render spaceTemplateSelect
        if (currURL.indexOf(baseUrl + '/space') == -1) {
          $('#selectSpace').append(Mustache.render(spaceTemplateSelect, space));
        }
    });
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      } else {
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
        window.location.href = routingTable.platform;
      } else {
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
        window.location.href = routingTable.platform;
      } else {
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
      } else {
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
      } else {
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
        window.location.href = routingTable.platform;
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

function repost(id){
  var space = ($( '#selectRepostSpace'+id +' option:selected' ).val() === "null") ? null : $( '#selectRepostSpace'+id +' option:selected' ).val();

  dataBody = {
    'post_id': id,
    'text': String($('#shareText'+id).val()),
    'space': space
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: '/repost',
    data: dataBody,
    success: function (data) {
      console.log("repost" + id);
      var msg = (space != null) ? space : "your timeline.";
      window.createNotification({
          theme: 'success',
          showDuration: 5000
      })({
          message: 'You shared into ' + msg
      });
      initNewsFeed();
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = routingTable.platform;
      } else {
        window.createNotification({
            theme: 'error',
            showDuration: 5000
        })({
            title: 'Server error!',
            message: 'reposting failed.'
        });
      }
    },
  });
}

function loadSpacesRepost(id){
  $.each(Spaces, function(key, space){
    for (i = 0; i < document.getElementById('selectRepostSpace'+id).length; ++i){
    if (document.getElementById('selectRepostSpace'+id).options[i].value == space.name){
      return;
        }
    }
    $('#selectRepostSpace'+id).append(Mustache.render(spaceTemplate, space));
  });
}

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
