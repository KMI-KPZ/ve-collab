//URL's
var loc = new URL(window.location.href);
var baseUrl = window.location.origin; // Returns base URL (https://example.com)
var loginURL = baseUrl + '/login';
var currURL = window.location.href; // Returns full URL (https://example.com/path/example.html)

//Datetimes
var today = new Date();
var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000 * 365)); //24 hours ago //Added 1 year ago
var now = today.toISOString();
var from = yesterday.toISOString();
var daysAgo = 0;

//HTML & JQuery
var $body = $('body');
var $feedContainer = $('#feedContainer');
var postTemplate
var repostTemplate
var commentTemplate
var tagTemplate


var newPostTemplate
var spaceTemplate
var spaceTemplateSelect
var spaceHeaderTemplate
var profileTemplate
var profileInformation_listItem

var acl_button

/**
 * load_templates - load templates from GET response to /template
 * GET /template returns blocks.html with all templates needed for the site
 * then filter for specific templates
 */
var load_templates = async function () {
  await $.get("/template", function(template, textStatus, jqXhr) {
    postTemplate = $(template).filter('#postTemplate').html()
    repostTemplate = $(template).filter('#repostTemplate').html()
    commentTemplate = $(template).filter('#commentTemplate').html()
    tagTemplate = $(template).filter('#tagTemplate').html()

    newPostTemplate = $(template).filter('#newPostTemplate').html()
    spaceTemplate = $(template).filter('#spaceTemplate').html()
    spaceTemplateSelect = $(template).filter('#spaceTemplateSelect').html()
    spaceHeaderTemplate = $(template).filter('#spaceHeaderTemplate').html()
    profileTemplate = $(template).filter('#profileTemplate').html()
    profileInformation_listItem = $(template).filter('#profileInformation_listItem').html()

    acl_button = $(template).filter('#acl_button').html()

  });
};

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
    currentUser["profile_pic_URL"] = baseUrl + '/uploads/' + currentUser["profile"]["profile_pic"];

    // Timeout fix error, where no templates are loading
    // Error: Uncaught TypeError: Invalid template! Template should be a "string" but "undefined" was given as the first argument for mustache#render
    //setTimeout(function(){
    $('#newPostContainer').prepend(Mustache.render(newPostTemplate, currentUser));
    //}, 10);
  }
  //Initializing dates to get post between from and now
  today = new Date();
  now = today.toISOString();
  from = yesterday.toISOString();
  console.log("now initalizing date")

  // based on URL get specific timeline with time paramaeters
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
    console.log(from)
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
  } else if (currURL == baseUrl + '/alt') {
    inSpace = false;
    getPersonalTimeline(from,now);
  }
  getSpaces();
}

/**
 * document ready - basically initialize all Data about the current User and the page
 * calls getCurrentUserInfo, checkUpdate (every x seconds)
 * while scrolling down the page: updates "from" - Datetime and Timeline (depending on URL)
 */
$(document).ready(function () {
  // misc functions for routing, users, etc.
  getCurrentUserInfo();
  getUserRole();
  getAllUsers();

  // load templates for construction of page
  load_templates().then(initNewsFeed);

  // add acl button if admin
  add_acl_button()

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
  //generate <space_name>:start, which is the landing page of the wiki for this space
  //TODO on space creation, generate this wiki page using the backend
  let wikiStartPage = window.location.pathname.split("/")[2] + ":start";

  //load the default wiki page on click
  $("#wiki_link").on("click",function(event){
    event.preventDefault();
    getWikiPage(wikiStartPage);
  });
});

/**
 * getWikiPage - gets wiki page with param name page
 * @param  {String} name page
 */
function getWikiPage(page){
  $.ajax({
    type: "GET",
    url: "/wiki_page",
    data: {page: page},
    dataType: "json",
    success: function(data){
      //first clear the container
      $("#wiki_container").empty().html(data.page_content);

      //find all links and set the onclick event to reload only this wiki page inside this container
      $("#wiki_container").find("a").on("click", function(e){
        e.preventDefault();
        let page = $(this).attr("href").match(/page=(.+)/)[1];
        getWikiPage(page);
      });

      //add "footer" to guide u to the dokuwiki instance where u can edit this page
      $("#wiki_container").append("<br/> <br/> <a> To edit this page, go to <a class='wikilink1' href='http://localhost/doku.php?id=" + page + "' target='_blank' rel='noopener noreferrer'> the wiki instance </a>! </p>");
    },
    error: function(xhr, status, error){
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
            message: 'Request wiki failed.'
        });
      }
    }
  });
}


/**
 * on new post - click - get all the values which should be postet and calls post function
 */
$body.delegate('#post', 'click', function () {
    var text = String($('#postFeed').val());
    var tags = $("input[id=addTag]").tagsinput('items');
    //check if there is a space selected to post into
    var selectedValue = ($( "#selectSpace option:selected" ).val() === "null") ? null : $( "#selectSpace option:selected" ).val();
    //while in space page: post in this space
    var space = (inSpace) ? spacename.replace("%20", " ") : selectedValue;
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
$body.delegate('#commentInput', 'keydown', function (e) {
  if(event.key == "Enter"){
    var $inputBox = $(this).closest('#commentBox');
    var $inputText = $inputBox.find('#commentInput').val();
    $inputBox.find('#commentInput').val('');
    var $id = $inputBox.closest('.panel').attr('id');
    if($inputText != '') postComment($inputText, $id);
  }
})

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

/**
 * handlerFunction - handles recording of audio
 * @param  {Audio} name stream
 */
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
    $('#postdiv').append('<div><span id="trash_item">'+fileInput.files[i].name+'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 ml-2 inline-block"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></span></div></br>');
  }
});

$body.delegate('#trash_item', 'click', function(e) {
  e.currentTarget.parentNode.remove()
  var fileName = e.currentTarget.innerText
  var fileList = fileList.filter(file => file.name != fileName);
}) 

/**
 * getExtension - get extension of a filename
 */
function getExtension(filename) {
  var parts = filename.split('.');
  return parts[parts.length - 1];
}

/**
 * isImage - tests if file is image with extension .jpg, .bmp, .png
 */
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

/**
 * isVideo - test if file is video with video specific extension
 */
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

/**
 * isAudio - test if file is audio with extension .mpeg
 */
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
 * compPinned - compare function for sorting posts on pinned attribute
 * @param  {JSON} a Post a
 * @param  {JSON} b Post b
 * @return {Float}   pinned value
 */
function compPinned(a, b) {
  return Number(b.pinned) - Number(a.pinned)
}

/**
 * compSpace - compare function for sorting Dates of Posts and if posts are pinned
 * @param  {JSON} a Post a
 * @param  {JSON} b Post b
 * @return {Float}   timevalue
 */
function compSpace(a,b) {
  // if pinned, add time value of 3154000000000 seconds(~10000 years) to time value of post
  if(a.pinned && b.pinned) {
    return (new Date(b.creation_date).getTime() + 3154000000000) - (new Date(a.creation_date).getTime() + 3154000000000);
  } else if(a.pinned && !b.pinned) {
    return new Date(b.creation_date).getTime() - (new Date(a.creation_date).getTime() + 3154000000000);
  } else if(b.pinned && !a.pinned) {
    return (new Date(b.creation_date).getTime() + 3154000000000) - new Date(a.creation_date).getTime();
  } else {
    return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
  }
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
  //$('[data-toggle="tooltip"]').tooltip();
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
  var sortPostsByDateArray;
  if(inSpace) {
    // if in space, sort posts based on creation_date and isPinned
    sortPostsByDateArray = timeline.posts.sort(compSpace);
  } else {
    sortPostsByDateArray = timeline.posts.sort(comp);
  }

  // insert post flaf for guaranteeing right post order for new posts in case there are pinned posts
  var insert_post_flag = false
  var last_pinned_post_id = ''
  $.each(sortPostsByDateArray, function (i, post) {
    if(document.body.contains(document.getElementById(post._id))){
      insert_post_flag = true
      if(post.pinned == true) {
        last_pinned_post_id = post._id
        return true;
      }
      return false;
    }
  })

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
      var $post_content = $existingPost.find('#post_content');

      $post_content.text(post.text);
      $agoPost.text(calculateAgoTime(post.creation_date));
      $likers.attr("data-original-title",likerHTML);
      $likeCounter.text(countLikes);
      if(post.hasOwnProperty('isRepost') && (post.isRepost == true)){
        var $originalAgo = $existingPost.find('#originalAgo');
        $originalAgo.text(calculateAgoTime(post.originalCreationDate));
        var $existingPost = $('#' + post._id);
        var $repost_content = $existingPost.find('#repost_content');
        $repost_content.text(post.repostText);
      }
      //toggle class if liked
     if(liked && $likeIcon.hasClass('text-white')) {
        $likeIcon.removeClass('text-white').addClass('text-green-800');
      } else if(!liked && $likeIcon.hasClass('text-green-800')) {
        $likeIcon.removeClass('text-green-800').addClass('text-white');
      }
      var $commentsList = $existingPost.find('.comments-list');
      if (post.hasOwnProperty('comments')) {
        var comments = post.comments.sort(compSpace)
        $.each(comments, function (j, comment) {
          var existingComment = document.getElementById(comment._id);
          // case if comments doesn't exist => render Comment (postComment)
          if(!document.body.contains(existingComment)) {
              var isCommentAuthor = (currentUser.username == comment.author.username) ? true : false;
              comment["isCommentAuthor"] = isCommentAuthor;
              comment["authorPicURL"] = baseUrl + '/uploads/' + comment.author.profile_pic;
              comment["ago"] = calculateAgoTime(comment.creation_date);
              $commentsList.append(Mustache.render(commentTemplate, comment));
          } else {
            //update values of comments
            existingComment.querySelector('#agoComment').innerHTML = calculateAgoTime(comment.creation_date);
          }
        });
      }
      return;
    } 

    //check if there are files to display
    if(post.hasOwnProperty('files') && post.files !== null && post.files.length > 0  ) {
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
    if(post.tags !== null) {
      post["tags"] = post["tags"].toString();
    }
    //check if it was postet in a space
    if (post.space == null) {
      post["hasSpace"] = false;
    } else post["hasSpace"] = true;

    if(post['isRepost'] == true){
      post["isRepostAuthor"] = isRepostAuthor;
      post["originalAgo"] = calculateAgoTime(post.originalCreationDate);
      post["repostAuthorPicURL"] = baseUrl + '/uploads/' + post.repostAuthorProfilePic;

      // simply always append if insert_post_flag is false, the correct order of the posts is guaranteed because it is sorted before (see function compSpace)
      // else prepend post to feed after pinned posts or at the beginning of the timeline
      if(insert_post_flag) {     
        if(inSpace) {
          $('#' + last_pinned_post_id).after(Mustache.render(repostTemplate, post))
        } else {
          $feedContainer.prepend(Mustache.render(repostTemplate, post));
        }
      } else {
        $feedContainer.append(Mustache.render(repostTemplate, post));
      }  
    } else{
      if (inSpace) {
          var isAdmin = true;
          post["isAdmin"] = isAdmin; //why is this always set to true?!
          post["inSpace"] = true;
      } else {
        post["inSpace"] = false;
      }
      // simply always append if insert_post_flag is false, the correct order of the posts is guaranteed because it is sorted before (see function compSpace)
      // else prepend post to feed after pinned posts or at the beginning of the timeline
      //
      if(insert_post_flag) {     
        if(inSpace) {
          $('#' + last_pinned_post_id).after(Mustache.render(postTemplate, post))
        } else {
          $feedContainer.prepend(Mustache.render(postTemplate, post));
        }
      } else {
        $feedContainer.append(Mustache.render(postTemplate, post));
      }   
    }

    //in both case render comments to post and tags
    var $feed = $('#' + post._id);
    var $likeIcon = $feed.find('#likeIcon');
    if(liked) $likeIcon.removeClass('text-blue-700').addClass('text-green-700');
    if (post.hasOwnProperty('comments')) {
      var $commentsList = $feed.find('.comments-list');
      var comments = post.comments.sort(compSpace).reverse()
      $.each(comments, function (j, comment) {
        var isCommentAuthor = (currentUser.username == comment.author.username) ? true : false;
        comment["isCommentAuthor"] = isCommentAuthor;
        comment["isPostAuthor"] = isAuthor;
        comment["authorPicURL"] = baseUrl + '/uploads/' + comment.author.profile_pic;
        comment["ago"] = calculateAgoTime(comment.creation_date);
        $commentsList.prepend(Mustache.render(commentTemplate, comment));
      });
    }

    //add tags
    var $dom = $feed.find('.meta');
    var tags = post.tags;
    var tagArray = []
    if(post.tags !== null) {
      tagArray = (typeof tags != 'undefined' && tags instanceof Array ) ? tags : tags.split(",");
    }
    tagArray.forEach(function (tag, index) {
        $dom.append(Mustache.render(tagTemplate, { text: '' + tag + '' }));
    });
  });
}

/**
 * getTimeline - get Admin timeline and call displayTimeline
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
            message: 'Request for admin timeline failed.'
        });
    }
    },
  });
}

/**
 * getPersonalTimeline - get Personal timeline and call displayTimeline
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
      var members = localStorage.getItem(spacename.split(' ').join('').replace("%20","")).split(",");

      // collects documents and corresponding tags from post for "Dokumente"-Tab in Space
      var documents = []
      $.each(timeline.posts, function(post) {
        $.each(timeline.posts[post].files, function(file) {
          documents.push({name:timeline.posts[post].files[file], tags: timeline.posts[post].tags.split(",")})
        })
      })

      // sets space pic and if current user is admin for edit space button
      var isAdmin = [];
      var space_pic = "";
      var this_space;

      // collects members and member pics for "Team"-Tab in Space
      var memberPictures = []

      $.each(Spaces, function(entry) {
        if(Spaces[entry].name == spacename.replace("%20"," ")) {
          this_space = Spaces[entry]
          if(Spaces[entry].admins.includes(currentUser.username)) {
            isAdmin.push(currentUser.username);
          }

          if(Spaces[entry].hasOwnProperty('space_pic')) {
            space_pic = Spaces[entry]["space_pic"];
          } else {
            space_pic = 'default_group_pic.jpg';
          }

          $.each(users, function(user_entry) {
            if(members.includes(users[user_entry].username)) {       
              var memberRole = "member";
              var memberIsAdmin = false;
              if(Spaces[entry].admins.includes(users[user_entry].username)) {
                memberRole = "admin"
                memberIsAdmin = true;
              }
              memberPictures.push({"username":users[user_entry].username, "profilePic": users[user_entry].profile_pic, "memberRole": memberRole, "memberIsAdmin": memberIsAdmin})
            }
          })
        }
      })

      // construct spaceProfilePanel
      if(!document.body.contains(document.getElementById('spaceProfilePanel'))) $('#spaceProfileContainer').prepend(Mustache.render(spaceHeaderTemplate, {spacename: '' + spacename.replace("%20", " ") + '', space_pic:  space_pic, member_pics : memberPictures, documents : documents, user: currentUser, isAdmin: isAdmin}));
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
            message: 'Request for spacetimeline failed.'
        });
      }
    },
  });
}

/**
 * getTimelineUser - get a User timeline (profile) and call displayTimeline
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

  // searches post content for all occurences of tags beginning with #
  var hashtag_regex = /#([a-zA-Z0-9_]+)/g
  var match;
  var hashtags = []
  while ((match = hashtag_regex.exec(text)) != null) {
    hashtags.push(match[1])
  }

  formData.append("file_amount", fileList.length);
  formData.append("text", text);
  formData.append("tags", JSON.stringify(hashtags));
  if(space != null){
    formData.append("space", space);
  }

  $.ajax({
    type: 'POST',
    url: '/posts',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
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
            message: 'posting to timeline failed.'
        });
      }
    },
  });
}

/**
* updatePost - post Feed and resets Values for Input
* calls InitNewsFeed for update
* @param  {String} id
*/
function updatePost(id) {
  var formData = new FormData();
  formData.append("_id", String(id));
  formData.append("text", $('#updatePostTextArea').val());

  $.ajax({
    type: 'POST',
    url: '/posts',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      initNewsFeed();
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
            message: 'Request to delete the post failed.'
        });
      }
    },
  });
}

/**
 * postComment - calls initNewsFeed for update after success
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
            message: 'Request to delete comment failed.'
        });
      }
    },
  });
}

/**
 * postLike - calls initNewsFeed for update after success
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
    async: false,  //very important that this ajax is awaited because it sets the Spaces array which is required by other functions to work
    dataType: 'json',
    success: function (data) {
      console.log("get Spaces success");
      var $dropdown = $body.find('#spaceDropdown');
      
      // clears existing Spaces Array without creating brand new array  
      Spaces.length = 0
      $.each(data.spaces, function (i, space) {
        //return if already rendered
        if(document.body.contains(document.getElementById(space._id))) return;
        // inSpace as local var (not the global)
        var inSpace = (currentUser.spaces.indexOf(space.name) > -1) ? true : false;
        // needed for displaying "join" button
        if(inSpace != false) {
          space['inSpace'] = inSpace;
          $dropdown.prepend(Mustache.render(spaceTemplate, space));
        }
        localStorage.setItem(space.name.split(' ').join(''), space.members);
        space.name.replace(" ", "%20")
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
 * likeDislike - toggle function for html update on like & dislike
 * calls deleteLike or postLike depending on elements html class
 * @param  {HTML} e  html element
 * @param  {String} id id of the post
 */
function likeDislike(e, id) {
  var likeIcon = e.firstElementChild;
  if(likeIcon.classList.contains("text-green-700")) {
    deleteLike(id);
    likeIcon.classList.remove("text-green-700")
  } else {
    postLike(id);
    likeIcon.classList.add("text-green-700")
  }
}

/**
 * repost - reposts post with id
 * @param  {String} name id
 */
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
            message: 'reposting failed.'
        });
      }
    },
  });
}

/**
* updateRepost - updates repost with id
* calls InitNewsFeed for update
* @param  {String} id
 */
function updateRepost(id) {
  dataBody = {
    '_id': id,
    'repostText': String($('#update_repost_content').val()),
  };
  $.ajax({
    type: 'POST',
    url: '/repost',
    data: dataBody,
    success: function (data) {
      console.log("repost" + id);
      window.createNotification({
          theme: 'success',
          showDuration: 5000
      })
      initNewsFeed();
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
            message: 'reposting failed.'
        });
      }
    },
  });
}

/**
 * pinDepinPost - pins or depins selected post based on attribute in classList of element pinIcon
 * if classList contains outlinePin -> post is not pinned -> postPostPin
 * else if classList contains solidPin -> post is pinned -> removePostPin
 */
function pinDepinPost(e, id) {
  var pinIcon = e.firstElementChild;
  if(pinIcon.classList.contains("outlinePin")) {
    postPostPin(id);
  } else if(pinIcon.classList.contains("solidPin")) {
    removePostPin(id);
  }
}

/**
 * postPostPin - pins post with id
 * pin_type : "post" -> only for posts
 * @param  {String} name id
 */
function postPostPin(id) {
  dataBody = {
    'id': id,
    'pin_type': "post"
  };
  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: '/pin',
    data: dataBody,
    success: function (data) {
      console.log("pinned post " + id);
      $feedContainer.empty()
      initNewsFeed();
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
            message: 'Pin failed.'
        });
      }
    },
  });
}

/**
 * removePostPin - removes pin of post with id
 * pin_type : "post" -> only for posts
 * @param  {String} name id
 */
function removePostPin(id) {
  dataBody = {
    'id': id,
    'pin_type': "post"
  };
  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'DELETE',
    url: '/pin',
    data: dataBody,
    success: function (data) {
      console.log("Removed pin of post " + id);
      $feedContainer.empty()
      initNewsFeed();
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
            message: 'delete like failed.'
        });
      }
    },
  });
}

/**
 * pinDepinComment - pins or depins selected comment based on attribute in classList of element pinIcon
 * if classList contains outlinePin -> comment is not pinned -> postCommentPin
 * else if classList contains solidPin -> comment is pinned -> removeCommentPin
 */
function pinDepinComment(e, id) {
  var pinIcon = e.firstElementChild;
  if(pinIcon.classList.contains("outlinePin")) {
    postCommentPin(id);
  } else if(pinIcon.classList.contains("solidPin")) {
    removeCommentPin(id);
  }
}

/**
 * postCommentPin - pins comment of post with id
 * pin_type : "comment" -> only for comment
 * @param  {String} name id
 */
function postCommentPin(id) {
  dataBody = {
    'id': id,
    'pin_type': "comment"
  };
  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: '/pin',
    data: dataBody,
    success: function (data) {
      console.log("pinned comment " + id);
      $feedContainer.empty()
      initNewsFeed();
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
            message: 'Pin failed.'
        });
      }
    },
  });

}
/**
 * removeCommentPin - removes pin of comment of post with id
 * pin_type : "comment" -> only for comment
 * @param  {String} name id
 */
function removeCommentPin(id) {
  dataBody = {
    'id': id,
    'pin_type': "comment"
  };
  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'DELETE',
    url: '/pin',
    data: dataBody,
    success: function (data) {
      console.log("Removed pin of post " + id);
      $feedContainer.empty()
      initNewsFeed();
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
            message: 'delete like failed.'
        });
      }
    },
  });
}

/**
 * loadSpacesRepost -
 */
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