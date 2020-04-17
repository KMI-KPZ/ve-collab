$(document).ready(function () {
  document.title = currentUser.username + ' - Social Network';
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
    $('#profileContainer').prepend(Mustache.render(document.getElementById('profileTemplate').innerHTML, currentUser));
  } else {
    var template = document.getElementById('profileTemplate').innerHTML;
    Mustache.parse(template);
    var render = Mustache.to_html(template, currentUser);
    $("#profileContainer").empty().html(render);
  }
}

/**
 * saveProfileInformation
 * get Values from input fields & calls postProfileInformation
 */
function saveProfileInformation() {
  var bio = String($('#bio').val());
  var institution = $('#institutionInput').val();
  var photoFile = document.getElementById('photoFile');
  var photo = null;
  if(photoFile.files.length > 0){
    photo = (isImage(photoFile.files[0].name)) ? photoFile.files[0] : null;
  }
  postProfileInformation(photo, bio, institution, null);
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
function postProfileInformation(photo, bio, institution, projects) {

  var formData = new FormData();
  formData.append("profile_pic", photo);
  formData.append("bio", bio);
  formData.append("institution", institution);
  formData.append("projects", projects);

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
      getCurrentUserInfo();
      updateProfileContainer();

    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {
        window.location.href = loginURL;
      } else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}
