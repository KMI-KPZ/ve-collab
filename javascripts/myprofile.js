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
  postProfileInformation(bio, institution, null);
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
function postProfileInformation(bio, institution, projects) {

  var dataBody = {
    "bio": bio,
    "institution": institution,
    "projects": projects
  };

  dataBody = JSON.stringify(dataBody);
  $.ajax({
    type: 'POST',
    url: baseUrl + '/profileinformation',
    data: dataBody,
    success: function (data) {
      console.log("posted User information" + dataBody);
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
