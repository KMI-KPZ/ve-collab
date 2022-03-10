var spacename = currURL.substring(currURL.lastIndexOf('/') + 1);

$(document).ready(function () {
  document.title = spacename + ' - Social Network';
  getRouting();
});

function triggerDisplay(index) {
  if(index != 0) {
    $("#feedRow").empty()
  } else {
    async function addContainer(){
      if ($('#feedRow').is(':empty')){
        $('#feedRow').append('<div class="container mx-auto w-3/5 px-4 mt-2 text-base" id="feedContainer" style="sans-serif;max-width: 50%;"></div>')
         $feedContainer = $('#feedContainer');
      }
    }
    addContainer().then(initNewsFeed())
  }
}


function updateSpacePicture(name) {
  console.log("hallo")
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

  var formData = new FormData();
  formData.append("space_pic", photo);

  $.ajax({
    type: 'POST',
    url: '/spaceadministration/space_picture?name=' + name,
    data: formData,
    //important for upload
    contentType: false,
    processData: false,
    success: function (data) {
      $("#saveAlert").html('Successfully updated!');
      $("#saveAlert").addClass("alert alert-success");
      $('#settingsModal').modal('toggle');
      console.log("Success")

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
