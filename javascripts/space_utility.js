/**
* leaveSpace - leaves Space
*
* @param  {String} name Spacename
*/
function leaveSpace(name) {
    $.ajax({
      type: 'DELETE',
      url: '/spaceadministration/leave?name=' + name,
      success: function (data) {
        //console.log("leaved space " + name);
        //reloads page to update table
        location.reload()
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
          window.createNotification({
              theme: 'error',
              showDuration: 5000
          })({
              title: 'Server error!',
              message: 'Request to join a space'
          });
        }
      },
    });
  }