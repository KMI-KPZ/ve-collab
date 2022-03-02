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
        $('#feedRow').append('<div class="container mx-auto w-3/5 px-4 mt-2 text-base" id="feedContainer" style="sans-serif;max-width: 50%;"></div>')
         $feedContainer = $('#feedContainer');
      }
    }
    addContainer().then(initNewsFeed())
  }
}
