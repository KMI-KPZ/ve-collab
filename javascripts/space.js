var spacename = currURL.substring(currURL.lastIndexOf('/') + 1);

$(document).ready(function () {
  document.title = spacename + ' - Social Network';
  getRouting();
});

function triggerDisplay(index) {
  if(index != 0) {
    console.log("Nicht Dashboard")
    $("#feedRow").empty()
  } else {
    console.log("Dashboard")

    async function addContainer(){
      if ($('#feedRow').is(':empty')){
        $('#feedRow').append('<div id="feedContainer"></div>')
         $feedContainer = $('#feedContainer');
      }
    }
    addContainer().then(initNewsFeed())
  }
}
