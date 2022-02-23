$(document).ready(function () {
  getRouting();
  document.title = currentUser.username + ' - Lionet';
  updateProfileContainer();
});

/**
 * on settingsTab - click - show the Tab Content
 */
$body.delegate('#settingsTab a', 'click', function () {
  $(this).tab('show');
  });

$body.delegate('#photoFile', 'change', function () {
  var photoFile = document.getElementById('photoFile');
  var name = photoFile.files[0].name;
  $('#photoLabel').html(name);
});

function updateProfileContainer(){
  currentUser['followSize'] = currentUser['follows'].length;
  currentUser['spaceSize'] = currentUser['spaces'].length;
  currentUser["profile_pic_URL"] = baseUrl + '/uploads/' + currentUser["profile"]["profile_pic"];
  if(currentUser.hasOwnProperty('projects')) currentUser['projectSize'] = currentUser['projects'].length;

  if(!document.body.contains(document.getElementById('profilePanel'))){

    setTimeout(function(){
      $('#profileContainer').empty()
       $('#profileContainer').prepend(Mustache.render(profileTemplate, currentUser)); }
       , 1000);
       
  } else {
    //var template = document.getElementById('profileTemplate').innerHTML;

    Mustache.parse(profileTemplate);
    var render = Mustache.to_html(profileTemplate, currentUser);
    $("#profileContainer").empty().html(render);
  }
}

/**
 * saveProfileInformation
 * get Values from input fields & calls postProfileInformation
 */
function saveProfileInformation() {
  var bio = String($('#bio').val());
  var institution = $('#institution').val();

  var first_name = $('#first_name').val();
  var last_name = $('#last_name').val();
  var gender = $('#gender').val();
  var address = $('#address').val();
  var birthday = $('#date_of_birth').val();
  //var experience = $('#experience').val(); //Allow mutliple
  //var education = $('#education').val(); //Allow mutliple
  var experience =[];
  $.each($('[id="experience"]'), function(entry) {
    experience.push($('[id="experience"]')[entry].value)
  })
  console.log(experience)

  var education = [];
  $.each($('[id="education"]'), function(entry) {
    education.push($('[id="education"]')[entry].value)
  })

  var photoFile = document.getElementById('photoFile');
  var photo = null;
  console.log(photoFile)
  if(photoFile === null){
    console.log("Error photo file")
  } else if(photoFile.files.length > 0){
    photo = (isImage(photoFile.files[0].name)) ? photoFile.files[0] : null;
  } else {
    console.log("Error photo file")
  }
  postProfileInformation(photo, bio, institution, null, first_name, last_name, gender, address, birthday, experience, education);
  /*
  console.log(bio)
  console.log(institution)
  console.log(first_name)
  console.log(last_name)
  console.log(gender)
  console.log(address)
  console.log(birthday)
  console.log(experience)
  console.log(education)*/
}

/**
 * initSettingTabs - shows the first settingsTab
 */
function initSettingTabs(){
  $('#settingsTab li:first-child a').tab('show');
}

/**
 * postProfileInformation - after success closes Modal
 *
 * @param  {String} bio       about yourself information
 * @param  {String} institution
 * @param  {Array} projects
 */
function postProfileInformation(photo, bio, institution, projects, first_name, last_name, gender, address, birthday, experience, education) {

  var formData = new FormData();
  formData.append("profile_pic", photo);
  formData.append("bio", bio);
  formData.append("institution", institution);
  formData.append("projects", projects); //Allow mutliple

  formData.append("first_name", first_name);
  formData.append("last_name", last_name);
  formData.append("gender", gender);
  formData.append("address", address);
  formData.append("birthday", birthday);

  formData.append("experience", experience); //Allow mutliple
  formData.append("education", education); //Allow mutliple

  for (var pair of formData.entries()) {
      console.log(pair[0]+ ', ' + pair[1]);
  }

  $.ajax({
    type: 'POST',
    url: '/profileinformation',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      $("#saveAlert").html('Successfully updated!');
      $("#saveAlert").addClass("alert alert-success");
      $('#settingsModal').modal('toggle');
      console.log("Success")
      getCurrentUserInfo();
      updateProfileContainer();

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
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}

function addListItem(type) {
  if(type === 'experience') {
    $('#experience_list').prepend(Mustache.render(profileInformation_listItem, {item_type:"experience", value:""}))
  } else if (type ==='education') {
    $('#education_list').prepend(Mustache.render(profileInformation_listItem, {item_type:"education", value:""}))
  } else {
    console.log("Error")
  }
}

function populateProfileInformationModal() {
  $.ajax({
    type: 'GET',
    url: '/profileinformation',
    dataType: 'json',
    success: function (user) {
      console.log(user.profile)

      $('#bio').val(user.profile.bio);
      $('#institution').val(user.profile.institution);

      $('#first_name').val(user.profile.first_name);
      $('#last_name').val(user.profile.last_name);
      $('#gender').val(user.profile.gender);
      $('#address').val(user.profile.address);
      $('#date_of_birth').val(user.profile.birthday);

      $('#experience_list').empty()
      if (user.profile.experience !== 'undefined') {
        $.each(user.profile.experience, function(entry) {
          $('#experience_list').prepend(Mustache.render(profileInformation_listItem, {item_type:"experience", value:user.profile.experience[entry]}))
        })
      }

      $('#education_list').empty()
      if (user.profile.education !== 'undefined') {
        $.each(user.profile.education, function(entry) {
          $('#education_list').prepend(Mustache.render(profileInformation_listItem, {item_type:"education", value:user.profile.education[entry]}))
        })
      }

    },

    error: function (xhr, status, error) {
      console.log("Error")
    }
  })
}

function deleteClosestListItem(elem) {
  console.log($(elem).closest('li'));
  $(elem).parents("li:first").remove();
}

// function showFriends(){
//   if(!document.body.contains(document.getElementById('profileContainer'))) {
//     $('#profileRightSideContainer').append(Mustache.render(friendsTemplate, currentUser));
//   }
// }