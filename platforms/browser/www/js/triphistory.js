$(document).ready(function() {
  var tripList = new Array();//Stores a list of objects that contain data for a particular trip.

  //Phonegap's deviceready event.
  $(document).on("deviceready", function() {

    getLocalStorage();
    displayTrip();

    //Construct the elements of the page to display every trip information currently stored in localstorage.
    function displayTrip() {

      $("#trip").empty();
      for(var i = 0; i < tripList.length; i++) {
        $("#trip").append('<div style="text-align:center" id="' + i +
          '">---------------------------------------<br>' +
          '<strong>Date and Time</strong><br>' + tripList[i].dateTimeStamp + '<br>' +
          '<strong>Origin</strong><br>' + tripList[i].startLoc + '<br>' +
          '<strong>Destination</strong><br>' + tripList[i].currentLoc + '<br>' +
          '<strong>Distance Traveled</strong><br>' + tripList[i].totDistance + ' km<br>' +
          '<strong>Average Speed</strong><br>' + tripList[i].aveSpeed + ' km/h<br>' +
          '<strong>Harsh Acceleration</strong><br>' + tripList[i].harshAccel + '<br>' +
          '<strong>Harsh Breaking</strong><br>' + tripList[i].harshBreak + '<br><br>' +
          '<button name="delete">Delete</button><br><br>' +
          '</div>');
      }
    }

    //Remove a trip record from the array list. The id parameter represents the index of the item in the existing array.
    function deleteItem(id){
  		tripList.splice(id, 1);
  		setLocalStorage();
      location.reload();
	  }

    //Delete button click event handler.
    $("button[name='delete']").click(function() {
      deleteItem($(this).parent().attr('id'));
    });

    //Get array of trip objects from localstorage.
    function getLocalStorage(){
      if(typeof localStorage.getItem('tripList') !== 'undefined' && localStorage.getItem('tripList') != null ){
        tripList = JSON.parse(localStorage.getItem('tripList'));
      }

    }

    //Store array of trip objects to localstorage.
    function setLocalStorage(){
      if(typeof tripList !== 'undefined' && tripList != null){
        localStorage.setItem('tripList', JSON.stringify(tripList));
      }

    }

  });

});
