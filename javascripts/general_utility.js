$(document).ready(function () {
  
  
  setTimeout(function(){
    //alert(Object.keys(users).length === 0)
    console.log(!jQuery.isEmptyObject(users)) 
    if(!jQuery.isEmptyObject(users)) {
      
      searchPopulation(users, Spaces)
    }
  }, 3000);
})

/**
 *  Utility functions for nav search bar  
 *  
 */ 

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
       $('#result').append('<li class="link-class"><img src="' + user["profile_pic_URL"] + '" height="40" width="40" class="img-thumbnail" /> '+user.username+' | <span class="text-muted">'+user.email+'</span></li>');
      }
     });
   }
    });
}

function searchPopulation(users, spaces) {
  $.ajaxSetup({ cache: false });
  //triggers if a char is changed at input
  $('#search').keyup(function() {
    $('#result').html('');
    $('#state').val('');
    var searchField = $('#search').val();
    var expression = new RegExp(searchField, "i");
    //only search if input isn't empty
    if(searchField != '') {
      $('#result').append("<div class='p-2 font-bold'>Userprofile</div>")
      $.each(users, function(key, user) {
        if(user.username.search(expression) != -1 || user.email.search(expression) != -1) {
          user["profile_pic_URL"] = baseUrl + '/uploads/' + user["profile_pic"];
          $('#result').find("div").last().append('<li class="link-class p-2"><img src="' + user["profile_pic_URL"] + '" height="40" width="40" class="img-thumbnail inline-block rounded-full border-solid" /> '+user.username+' | <span class="text-muted">'+user.email+'</span></li>');         
        }
      })
      $('#result').append("<div class='p-2 font-bold'>Spaces</div>")
      $.each(spaces, function(key, space) {
        if(space.name.search(expression) != -1 || space.space_description.search(expression) != -1) {
          if(space.hasOwnProperty('space_pic')) {
            space["space_pic_URL"] = baseUrl + '/uploads/' + space["space_pic"];
          } else {
            //TODO Real Space Picture Dummy 
            space["space_pic_URL"] = baseUrl + '/uploads/' + 'default_group_pic.jpg';
          }
          $('#result').find("div").last().append('<li class="link-class p-2"><img src="' + space["space_pic_URL"] + '" height="40" width="40" class="img-thumbnail inline-block rounded-full border-solid" /> '+space.name+ '</li>');     
        }    
      }) 
    }
  })
}

function jumpto(jump_id) {
  var $postContainer = $('#'+jump_id);
  $([document.documentElement, document.body]).animate({
      scrollTop: $('#'+jump_id).offset().top
  }, 1000);
  //alert(jump_id)
}

function search(query) {
  $.ajax({
    type: 'GET',
    url: '/search?posts=true&tags=true&users=true&query=' + query,
    dataType: 'json',
    success: function (data) {
        $('#result').html('');
        
        posts = data["posts"]
        tags = data["tags"]
        users = data["users"]
        
        $('#result').append("<div class='p-2 font-bold'>Posts</div>")
        if(posts.length == 0) {
          $('#result').find("div").last().append('<li class="link-class p-2">Kein Post mit diesem Inhalt gefunden!</li>')
        } else {
          $.each(posts, function(entry) {
            $('#result').find("div").last().append(`
              <li class="link-class p-2 grid grid-cols-10" onclick="jumpto('${posts[entry]._id}')">        
                <img src="/uploads/default_group_pic.jpg" class="shadow rounded-full h-10 align-middle border-none avatar"></img>
                <p class="col-span-9">${posts[entry].text}</p> 
              </li>
            `);
          })
        }

        $('#result').append("<div class='p-2 font-bold'>Tags</div>")
        if(tags.length == 0) {
          $('#result').find("div").last().append('<li class="link-class p-2">Keine Post mit diesem Tag gefunden!</li>')
        } else {
          $.each(tags, function(entry) {
            $('#result').find("div").last().append(`
              <li class="link-class p-2 grid grid-cols-10" onclick="jumpto('${tags[entry]._id}')">        
                <img src="/uploads/default_group_pic.jpg" class="shadow rounded-full h-10 align-middle border-none avatar"></img>
                <p class="col-span-9">${tags[entry].text}</p> 
              </li>
            `);
          })
        }

        $('#result').append("<div class='p-2 font-bold'>User</div>")
        if(users.length == 0) {
          $('#result').find("div").last().append('<li class="link-class p-2">Keine User gefunden!</li>')
        } else {
          $.each(users, function(entry) {
            $('#result').find("div").last().append(`
              <li class="link-class p-2">
                <a class="grid grid-cols-10" href="/profile/${users[entry].user}">        
                  <img src="/uploads/${users[entry].profile_pic}" class="shadow rounded-full h-10 align-middle border-none avatar"></img>
                  <p class="col-span-9">${users[entry].user}</p> 
                </a>
              </li>
            `);
          })
        }
    },

    error: function (xhr, status, error) {
        if (xhr.status == 401) {
            window.location.href = routingTable.platform;
        } else if (xhr.status === 403) {
            window.createNotification({
                theme: 'error',
                showDuration: 5000
            })({
                title: 'Error!',
                message: 'Insufficient Permission'
            });
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
$("#search").on('change keydown paste input', function(){
  var query = $('#search').val()
  search(query)
});

/**
 * triggers when searchresult is clicked - get his username and redirect to his profile
 */
 /**$('body').delegate('.link-class', 'click', function () {
  var click_text = $(this).text().split('|');
  var selectedUser = $.trim(click_text[0]);
  $('#search').val(selectedUser);
  $("#result").html('');
  window.location.href = baseUrl + '/profile/' + selectedUser;
});*/

$('body').delegate('.link-class', 'click', function() {
  var click_text = $(this).text().split('|');
  var selected = $.trim(click_text[0]);
  var type = $(this).parent().last().text().split(' ')[0]
  $('#search').val(selected);
  $("#result").html('');
  if(type === 'Userprofile') {
    window.location.href = baseUrl + '/profile/' + selected;
  } 
  if(type === "Spaces") {
    window.location.href = baseUrl + '/space/' + selected;
  }
})

/**
 * if user role is admin, adds button to navbar to access acl tables
 */
function add_acl_button() {
  $.ajax({
      type: 'GET',
      url: '/role/my',
      dataType: 'json',
      success: function (data) {
          if(data.role == "admin") {
            $("#navbar_items").append(Mustache.render(acl_button))
          }

      },

      error: function (xhr, status, error) {
          if (xhr.status == 401) {
              window.location.href = routingTable.platform;
          } else if (xhr.status === 403) {
              window.createNotification({
                  theme: 'error',
                  showDuration: 5000
              })({
                  title: 'Error!',
                  message: 'Insufficient Permission'
              });
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
