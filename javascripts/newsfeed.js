baseUrl = 'http://localhost:8889';
var currURL = window.location.href;
var $body = $('body');
var $feedContainer = $('#feedContainer');

var today = new Date();
var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)); //24 hours ago
var now = today.toLocaleString();
var from = yesterday.toLocaleString();

var postTemplate = document.getElementById('postTemplate').innerHTML;
var commentTemplate = document.getElementById('commentTemplate').innerHTML;
var tagTemplate = document.getElementById('tagTemplate').innerHTML;
var inSpace = false;
var spacename;
var timeout;
$(document).ready(function () {

  function initializeNewsFeed(){
      if(!document.body.contains(document.getElementById('newPostPanel'))) {
        $('#newPostContainer').prepend(Mustache.render(document.getElementById('newPostTemplate').innerHTML, {}));
      }
      now = today.toLocaleString();
      from = yesterday.toLocaleString();

      if (currURL == baseUrl + '/main') {
        getTimeline(from, now);

      } else if (currURL.indexOf(baseUrl + '/space') !== -1) {
        inSpace = true;
        spacename = currURL.substring(currURL.lastIndexOf('/') + 1);
        document.title = spacename + ' - Social Network';
        getTimelineSpace(spacename, from, now);
      }
      getSpaces();
  }

  initializeNewsFeed();

  $(window).scroll(function() {
    //check if page has a scrollbar
    if($("body").height() > $(window).height()){
        var nearToBottom = 10;

        if ($(window).scrollTop() + $(window).height() >
          $(document).height() - nearToBottom) {
               // ajax call get data from server and append to the div
               console.log("TRIGGERED");
               //$feedContainer.empty();
               //window.scrollTo(0,0);
               yesterday = new Date(yesterday - (24 * 60 * 60 * 1000));
               initializeNewsFeed();
        }
    }
  });
});



$body.delegate('#post', 'click', function () {
    var text = String($('#postFeed').val());
    var tags = $("input[id=addTag]").tagsinput('items');
    var space = (inSpace) ? spacename : $( "#selectSpace option:selected" ).text();
    post(text, tags, space);
  });

$body.delegate('#postComment', 'click', function () {
    var $inputBox = $(this).closest('#commentBox');
    var $inputText = $inputBox.find('#commentInput').val();
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
  if (Math.floor(mins / 60) == 0){
    return "" + mins % 60 + " mins ago";
  } else {
    return "" + Math.floor(mins / 60) + " hours " + mins % 60 + " mins ago";
  }
}

function comp(a, b) {
    return new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
}

function getTimeline(from, to) {
  $.ajax({
    type: 'GET',
    url: baseUrl + '/timeline?from=' + from + '&to=' + to,
    dataType: 'json',
    success: function (timeline) {
      console.log("get timeline success");
      var sortPostsByDateArray = timeline.posts.sort(comp);
      //console.log(sortPostsByDateArray);
      $.each(sortPostsByDateArray, function (i, post) {
        if(document.body.contains(document.getElementById(post._id))) $('#' + post._id).remove();
        //console.log(post);
        post["ago"] = calculateAgoTime(post.creation_date);
        if (post.hasOwnProperty('likers')) {
          var countLikes = post.likers.length;
          console.log(post.likers);
          post["likes"] = countLikes;
        } else post["likes"] = 0;

        post["tags"] = post["tags"].toString();

        if (post.space == null) {
          post["hasSpace"] = false;
        } else post["hasSpace"] = true;
        //$('#feedContainer').children('.post').last().prepend(Mustache.render(postTemplate, post));
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

      var spaceHeaderTemplate = document.getElementById('spaceHeaderTemplate').innerHTML;
      var sortPostsByDateArray = timeline.posts.sort(comp);
      //console.log(sortPostsByDateArray);
      $.each(sortPostsByDateArray, function (i, post) {
        if(document.body.contains(document.getElementById(post._id))) $('#' + post._id).remove();
        //console.log(post);
        post["ago"] = calculateAgoTime(post.creation_date);
        if (post.hasOwnProperty('likers')) {
          var countLikes = post.likers.length;
          console.log(post.likers);
          post["likes"] = countLikes;
        } else post["likes"] = 0;

        post["tags"] = post["tags"].toString();

        if (post.space == null) {
          post["hasSpace"] = false;
        } else post["hasSpace"] = true;
        //$('#feedContainer').children('.post').last().prepend(Mustache.render(postTemplate, post));
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

      if(!document.body.contains(document.getElementById('newPostPanel'))) $('#newPostContainer').prepend(Mustache.render(document.getElementById('newPostTemplate').innerHTML, post));
      var members = localStorage.getItem(spacename).split(",");

      if(!document.body.contains(document.getElementById('spaceProfilePanel'))) $('#spaceProfileContainer').prepend(Mustache.render(document.getElementById('spaceHeaderTemplate').innerHTML, {spacename: '' + spacename + '', members : members, memberSize : members.length}));
      $('input[data-role=tagsinput]').tagsinput({
        allowDuplicates: false
      });
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
      if(inSpace){
        getTimelineSpace(spacename, from, now);
      } else getTimeline(from, now);
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
      if(inSpace){
        getTimelineSpace(spacename, from, now);
      } else getTimeline(from, now);

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
      if(inSpace){
        getTimelineSpace(spacename, from, now);
      } else getTimeline(from, now);
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
