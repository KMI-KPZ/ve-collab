$(document).ready(function () {

});

$body.delegate('#settingsTab a', 'click', function () {
  $(this).tab('show');
  });


function saveProfileInformation() {
  var bio = String($('#bio').val());
  var institution = $('#institutionInput').val();
  postProfileInformation(bio, institution, null);

}

function initSettingTabs(){
  $('#settingsTab li:first-child a').tab('show');
}

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


      //TODO clean code
      /*$('#bioProfile').text( "<b>Bio: </b>" + bio);
      $('#institutionProfile').text("<b>Institution: </b>" + institution);*/
    },

    error: function (xhr, status, error) {
      if (xhr.status == 401) {

      } else {
        alert('error posting user information');
        console.log(error);
        console.log(status);
        console.log(xhr);
      }
    },
  });
}
