var spacename = currURL.substring(currURL.lastIndexOf('/') + 1);

$(document).ready(function () {
  document.title = spacename + ' - Social Network';
  getRouting();
});
