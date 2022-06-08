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
