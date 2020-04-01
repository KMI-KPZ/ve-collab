$(document).ready(function () {

});

/**
 * on settingsTab - click - show the Tab Content
 */
$body.delegate('#settingsTab a', 'click', function () {
  $(this).tab('show');
  });

$body.delegate('#photoFile', 'change', function () {
  var fileInput = document.getElementById('photoFile');
  var name = fileInput.files[0].name;
  $('#photoLabel').html(name);
});

/**
 * saveProfileInformation
 * get Values from input fields & calls postProfileInformation
 */
function saveProfileInformation() {
  var bio = String($('#bio').val());
  var institution = $('#institutionInput').val();
  var fileInput = document.getElementById('photoFile');
  var photo = (isImage(fileInput.files[0].name)) ? fileInput.files[0] : null;
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
    url: baseUrl + '/profileinformation',
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      $("#saveAlert").html('Successfully updated!');
      $("#saveAlert").addClass("alert alert-success");
      $('#settingsModal').modal('toggle');

      setTimeout(function () {
        getCurrentUserInfo();
      }, 1000);

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
