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
 * Gets routing table from server
 */
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
