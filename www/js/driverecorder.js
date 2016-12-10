$(document).ready(function() {
  var watchAccel; //variable that holds the id of the acceleration object.
  var watchGeo;//variable that holds the id of the geolocation object.
  var currentPosition, lastPosition;//Objects that holds information for current and last known position.
  var totalDistance = 0;//Distance from starting location to current location.
  var arrSpeed = []; //Collection of travel speed. Stores speed every time a change in position is detected.
  var originAddress;//holds the address of the starting location.
  var currentAddress;//holds the address of the current location.
  var destination;//holds the address of the ending location.
  var lastAcceleration=0;//The last acceleration recorded. Used as comparisson to detect sudden acceleration and breaking.
  var harshAcceleration = 0;//Stores the number of times a harsh acceleration was detected.
  var harshBreaking = 0;//Stores the number of times a harsh breaking was detected.
  var tripList = new Array();//Stores a list of objects that contain data for a particular trip.

  /*
  Prototype that represents a particular trip.
  [1]startLoc = The address of the starting location.
  [2]currentLoc = The address of the ending location.
  [3]aveSpeed = the average speed of the trip.
  [4]harshAccel = The number of times that harsh acceleration was recorded.
  [5]harshBreak = The number of times that harsh breaking was recorded.
  */
  var tripInfo = function(dateTimeStamp, startLoc, currentLoc, totDistance, aveSpeed, harshAccel, harshBreak) {
    this.dateTimeStamp = dateTimeStamp;
    this.startLoc = startLoc;
    this.currentLoc = currentLoc;
    this.totDistance = totDistance;
    this.aveSpeed = aveSpeed;
    this.harshAccel = harshAccel;
    this.harshBreak = harshBreak;
  }

  getLocalStorage();

  //Phonegap's deviceready event.
  $(document).on("deviceready", function() {
    startWatchGeo();//Start watching for location update.
    startWatchAccel();//Start watching for acceleration update.
  });

  /***************************************************************************************************************************************
  DOM EVENTS
  ***************************************************************************************************************************************/

  $("#btnSaveTrip").click(function(e) {
    console.log("btn save");
    stopWatchGeo();//Stop watching for location update.
    stopWatchAccel();//Stop watching for acceleration update.
    addTrip();
    parent.history.back();//Go back to main screen.
    return false;
  });

/***************************************************************************************************************************************
DEVICE MOTION, ACCELERATION
***************************************************************************************************************************************/

function startWatchAccel() {
  //Retrieves the device's current acceleration at regular intervals. The interval is set on accelOptions object using the
  //frequency parameter.
  watchAccel = navigator.accelerometer.watchAcceleration(onSuccessAccel, onErrorAccel, accelOptions);
}

function stopWatchAccel() {
  navigator.accelerometer.clearWatch(watchAccel);
}
/*
Function called if watchAcceleration is successful.
*/
  function onSuccessAccel(acceleration) {
    /*
    console.log("Acceleration x: " + acceleration.x.toFixed(4) + "\n" +
                "Acceleration y: " + acceleration.y.toFixed(4) + "\n" +
                "Acceleration z: " + acceleration.z.toFixed(4) + "\n" +
                "Timestamp :" + new Date(acceleration.timestamp) + "\n");
                */
  }
  /*
  Function called if watchAcceleration is unsuccessful.
  */
  function onErrorAccel() {
    console.log("Error getting acceleration");
  }
  var accelOptions = {frequency: 1000};//set accelerometer watch interval every 1 second.

  /***************************************************************************************************************************************
  GEOLOCATION
  ***************************************************************************************************************************************/

  //Retrieves the device's current geolocation at regular intervals. The interval is set on geoOptions object using the
  //frequency parameter.
  function startWatchGeo() {
    watchGeo = navigator.geolocation.watchPosition(onSuccessGeo, onErrorGeo, geoOptions);
  }

  function stopWatchGeo() {
    navigator.geolocation.clearWatch(watchGeo);
  }

  //Function called if watchPosition is successful.
  function onSuccessGeo(position) {
  //  if(currentPosition) lastPosition = currentPosition;//Store current position to last known position.
    //Retreive latest latitude and longitude.


    if(!currentPosition) {
      setOriginAddress(position.coords.latitude, position.coords.longitude);
      updateCurrentPosition(position);
    }
    else {
      lastPosition = currentPosition;//Store current position to last known position.
      updateCurrentPosition(position);
    }
    if(!lastPosition) return; //Exit function on first run, as distance from last position must be available to calculate the distance from current position.

    setCurrentAddress(position.coords.latitude, position.coords.longitude);//Update address of current location.
    //Get distance from last know position to current position.
    currentPosition.distance = lastPosition.geoPosition.distanceTo(currentPosition.geoPosition)*1000;
    totalDistance += currentPosition.distance;
    //Get time of travel between current position and last know position.
    currentPosition.travelTime = (currentPosition.time - lastPosition.time)*1000;
    //Get travel speed and acceleration from gps data.
    currentPosition.speed = (currentPosition.distance/currentPosition.travelTime);
    currentPosition.accelerationGPS = (currentPosition.speed - lastPosition.speed) / currentPosition.travelTime;


    $("#distance").html((totalDistance / (1000)).toFixed(3) + " km");
    $("#speed").html((currentPosition.speed * (3.6)).toFixed(3) + " km/h");
    arrSpeed.push((currentPosition.speed * (3.6)).toFixed(3));
    $("#acceleration").html((currentPosition.accelerationGPS).toFixed(10) + " m/s/s");
      //Record the number of times that a harsh acceleration or breaking was detected.
      if(Math.abs(Math.floor((currentPosition.accelerationGPS).toFixed(10))) > (Math.abs(Math.floor(lastAcceleration)) * 2)) {
        ++harshAcceleration;
      if((currentPosition.accelerationGPS).toFixed(10) <= 0 && lastAcceleration >= 1) {
        ++harshBreaking;
      }
    }
    lastAcceleration = (currentPosition.accelerationGPS).toFixed(10);
  }

  //Function called if watchGeo is unsuccessful.
  function onErrorGeo() {
    console.log("Error getting geolocation.");
  }

  var geoOptions = {timeout: 5000, enableHighAccuracy: true};

  //Update current position when a location change is detected.
  function updateCurrentPosition(position) {
    currentPosition = {
      geoPosition: new LatLon(position.coords.latitude, position.coords.longitude),
      time: new Date() //datetime stamp of current position.
    };
    console.log(currentPosition.geoPosition.lat + " - " + currentPosition.geoPosition.lon);
  }

  //Geocoding to get address name of starting location from latitude and longitude data.
  function setOriginAddress(lat, lon) {
    var geocoder = new google.maps.Geocoder();
    var latlng = {lat: parseFloat(lat), lng: parseFloat(lon)};
      geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === 'OK') {
          if (results[1]) {
            $("#origin").html(results[0].formatted_address);
            originAddress = results[0].formatted_address;
            console.log(originAddress + " - origin");
          }
          else {
            originAddress =  "unknown";
          }
        }
    });
  }

  //Geocoding to get address name of current location from latitude and longitude data.
  function setCurrentAddress(lat, lon) {
    var geocoder = new google.maps.Geocoder();
    var latlng = {lat: parseFloat(lat), lng: parseFloat(lon)};
      geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === 'OK') {
          if (results[1]) {
            $("#currentlocation").html(results[0].formatted_address);
            currentAddress = results[0].formatted_address;
            console.log(currentAddress + " - current location");
          }
          else {
            currentAddress =  "unknown";
          }
        }
    });
  }

  //Gets the average speed of  a trip.
  function getAverageSpeed() {
    var avg = 0;
    var total = 0;
    console.log("getting avg speed");
    if(arrSpeed !== null && arrSpeed !== 'undefined') {
      console.log("arrSpeed not empty " + arrSpeed.length);
      for(var i = 0; i < arrSpeed.length; i ++) {
        total += parseFloat(arrSpeed[i]);
        console.log("speed[" + i + "]" + arrSpeed[i]);
      }
      avg = total / arrSpeed.length;
      console.log("total: " + total + " array len: " + arrSpeed.length + " avg: " + avg);
    }
    console.log("avg " + avg + " total " + total);
    return avg;
  }

  /***************************************************************************************************************************************
  Persistence and Local Storage
  ***************************************************************************************************************************************/

  //Populate array of trip objects from localstorage.
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

  //Add a new trip record to the array list.
  function addTrip() {
    var avgSpeed = getAverageSpeed();
    var newTrip = new tripInfo(new Date(), originAddress, currentAddress, ((totalDistance/1000).toFixed(3)), avgSpeed, harshAcceleration, harshBreaking);
    tripList.push(newTrip);
    setLocalStorage();
  }

  /***************************************************************************************************************************************
  The code below was taken from the http://www.movable-type.co.uk/scripts/latlong.html website.
  ***************************************************************************************************************************************/
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
  /*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2012            */
  /*   - www.movable-type.co.uk/scripts/latlong.html                                                */
  /*                                                                                                */
  /*  Sample usage:                                                                                 */
  /*    var p1 = new LatLon(51.5136, -0.0983);                                                      */
  /*    var p2 = new LatLon(51.4778, -0.0015);                                                      */
  /*    var dist = p1.distanceTo(p2);          // in km                                             */
  /*    var brng = p1.bearingTo(p2);           // in degrees clockwise from north                   */
  /*    ... etc                                                                                     */
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
  /*  Note that minimal error checking is performed in this example code!                           */
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


  /**
   * Object LatLon: tools for geodetic calculations
   *
   * @requires Geo
   */


  /**
   * Creates a point on the earth's surface at the supplied latitude / longitude
   *
   * @constructor
   * @param {Number} lat: latitude in degrees
   * @param {Number} lon: longitude in degrees
   * @param {Number} [radius=6371]: radius of earth if different value is required from standard 6,371km
   */
  function LatLon(lat, lon, radius) {
      if (typeof(radius) == 'undefined') radius = 6371;  // earth's mean radius in km

      this.lat    = Number(lat);
      this.lon    = Number(lon);
      this.radius = Number(radius);
  }


  /**
   * Returns the distance from this point to the supplied point, in km
   * (using Haversine formula)
   *
   * from: Haversine formula - R. W. Sinnott, "Virtues of the Haversine",
   *       Sky and Telescope, vol 68, no 2, 1984
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @param   {Number} [precision=4]: number of significant digits to use for returned value
   * @returns {Number} distance in km between this point and destination point
   */
  LatLon.prototype.distanceTo = function(point, precision) {
      // default 4 sig figs reflects typical 0.3% accuracy of spherical model
      if (typeof precision == 'undefined') precision = 4;

      var R = this.radius;
      var φ1 = this.lat.toRadians(),  λ1 = this.lon.toRadians();
      var φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();
      var Δφ = φ2 - φ1;
      var Δλ = λ2 - λ1;

      var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = R * c;

      return d.toPrecisionFixed(Number(precision));
  }


  /**
   * Returns the (initial) bearing from this point to the supplied point, in degrees
   *   see http://williams.best.vwh.net/avform.htm#Crs
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @returns {Number} initial bearing in degrees from North
   */
  LatLon.prototype.bearingTo = function(point) {
      var φ1 = this.lat.toRadians(), φ2 = point.lat.toRadians();
      var Δλ = (point.lon-this.lon).toRadians();

      var y = Math.sin(Δλ) * Math.cos(φ2);
      var x = Math.cos(φ1)*Math.sin(φ2) -
              Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
      var θ = Math.atan2(y, x);

      return (θ.toDegrees()+360) % 360;
  }


  /**
   * Returns final bearing arriving at supplied destination point from this point; the final bearing
   * will differ from the initial bearing by varying degrees according to distance and latitude
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @returns {Number} final bearing in degrees from North
   */
  LatLon.prototype.finalBearingTo = function(point) {
      // get initial bearing from supplied point back to this point...
      var φ1 = point.lat.toRadians(), φ2 = this.lat.toRadians();
      var Δλ = (this.lon-point.lon).toRadians();

      var y = Math.sin(Δλ) * Math.cos(φ2);
      var x = Math.cos(φ1)*Math.sin(φ2) -
              Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
      var θ = Math.atan2(y, x);

      // ... & reverse it by adding 180°
      return (θ.toDegrees()+180) % 360;
  }


  /**
   * Returns the midpoint between this point and the supplied point.
   *   see http://mathforum.org/library/drmath/view/51822.html for derivation
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @returns {LatLon} midpoint between this point and the supplied point
   */
  LatLon.prototype.midpointTo = function(point) {
      var φ1 = this.lat.toRadians(), λ1 = this.lon.toRadians();
      var φ2 = point.lat.toRadians();
      var Δλ = (point.lon-this.lon).toRadians();

      var Bx = Math.cos(φ2) * Math.cos(Δλ);
      var By = Math.cos(φ2) * Math.sin(Δλ);

      var φ3 = Math.atan2(Math.sin(φ1)+Math.sin(φ2),
                      Math.sqrt( (Math.cos(φ1)+Bx)*(Math.cos(φ1)+Bx) + By*By) );
      var λ3 = λ1 + Math.atan2(By, Math.cos(φ1) + Bx);
      λ3 = (λ3+3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180º

      return new LatLon(φ3.toDegrees(), λ3.toDegrees());
  }


  /**
   * Returns the destination point from this point having travelled the given distance (in km) on the
   * given initial bearing (bearing may vary before destination is reached)
   *
   *   see http://williams.best.vwh.net/avform.htm#LL
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {Number} brng: initial bearing in degrees
   * @param   {Number} dist: distance in km
   * @returns {LatLon} destination point
   */
  LatLon.prototype.destinationPoint = function(brng, dist) {
      var θ = Number(brng).toRadians();
      var δ = Number(dist) / this.radius; // angular distance in radians

      var φ1 = this.lat.toRadians();
      var λ1 = this.lon.toRadians();

      var φ2 = Math.asin( Math.sin(φ1)*Math.cos(δ) +
                          Math.cos(φ1)*Math.sin(δ)*Math.cos(θ) );
      var λ2 = λ1 + Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1),
                               Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));
      λ2 = (λ2+3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180º

      return new LatLon(φ2.toDegrees(), λ2.toDegrees());
  }


  /**
   * Returns the point of intersection of two paths defined by point and bearing
   *
   *   see http://williams.best.vwh.net/avform.htm#Intersection
   *
   * @param   {LatLon} p1: first point
   * @param   {Number} brng1: initial bearing from first point
   * @param   {LatLon} p2: second point
   * @param   {Number} brng2: initial bearing from second point
   * @returns {LatLon} destination point (null if no unique intersection defined)
   */
  LatLon.intersection = function(p1, brng1, p2, brng2) {
      var φ1 = p1.lat.toRadians(), λ1 = p1.lon.toRadians();
      var φ2 = p2.lat.toRadians(), λ2 = p2.lon.toRadians();
      var θ13 = Number(brng1).toRadians(), θ23 = Number(brng2).toRadians();
      var Δφ = φ2-φ1, Δλ = λ2-λ1;

      var δ12 = 2*Math.asin( Math.sqrt( Math.sin(Δφ/2)*Math.sin(Δφ/2) +
          Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2) ) );
      if (δ12 == 0) return null;

      // initial/final bearings between points
      var θ1 = Math.acos( ( Math.sin(φ2) - Math.sin(φ1)*Math.cos(δ12) ) /
             ( Math.sin(δ12)*Math.cos(φ1) ) );
      if (isNaN(θ1)) θ1 = 0; // protect against rounding
      var θ2 = Math.acos( ( Math.sin(φ1) - Math.sin(φ2)*Math.cos(δ12) ) /
             ( Math.sin(δ12)*Math.cos(φ2) ) );

      if (Math.sin(λ2-λ1) > 0) {
          θ12 = θ1;
          θ21 = 2*Math.PI - θ2;
      } else {
          θ12 = 2*Math.PI - θ1;
          θ21 = θ2;
      }

      var α1 = (θ13 - θ12 + Math.PI) % (2*Math.PI) - Math.PI; // angle 2-1-3
      var α2 = (θ21 - θ23 + Math.PI) % (2*Math.PI) - Math.PI; // angle 1-2-3

      if (Math.sin(α1)==0 && Math.sin(α2)==0) return null; // infinite intersections
      if (Math.sin(α1)*Math.sin(α2) < 0) return null;      // ambiguous intersection

      //α1 = Math.abs(α1);
      //α2 = Math.abs(α2);
      // ... Ed Williams takes abs of α1/α2, but seems to break calculation?

      var α3 = Math.acos( -Math.cos(α1)*Math.cos(α2) +
                           Math.sin(α1)*Math.sin(α2)*Math.cos(δ12) );
      var δ13 = Math.atan2( Math.sin(δ12)*Math.sin(α1)*Math.sin(α2),
                            Math.cos(α2)+Math.cos(α1)*Math.cos(α3) )
      var φ3 = Math.asin( Math.sin(φ1)*Math.cos(δ13) +
                          Math.cos(φ1)*Math.sin(δ13)*Math.cos(θ13) );
      var Δλ13 = Math.atan2( Math.sin(θ13)*Math.sin(δ13)*Math.cos(φ1),
                             Math.cos(δ13)-Math.sin(φ1)*Math.sin(φ3) );
      var λ3 = λ1 + Δλ13;
      λ3 = (λ3+3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180º

      return new LatLon(φ3.toDegrees(), λ3.toDegrees());
  }


  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

  /**
   * Returns the distance from this point to the supplied point, in km, travelling along a rhumb line
   *
   *   see http://williams.best.vwh.net/avform.htm#Rhumb
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @returns {Number} distance in km between this point and destination point
   */
  LatLon.prototype.rhumbDistanceTo = function(point) {
      var R = this.radius;
      var φ1 = this.lat.toRadians(), φ2 = point.lat.toRadians();
      var Δφ = φ2 - φ1;
      var Δλ = Math.abs(point.lon-this.lon).toRadians();
      // if dLon over 180° take shorter rhumb line across the anti-meridian:
      if (Math.abs(Δλ) > Math.PI) Δλ = Δλ>0 ? -(2*Math.PI-Δλ) : (2*Math.PI+Δλ);

      // on Mercator projection, longitude gets increasing stretched by latitude; q is the 'stretch factor'

      var Δψ = Math.log(Math.tan(φ2/2+Math.PI/4)/Math.tan(φ1/2+Math.PI/4));

      // the stretch factor becomes ill-conditioned along E-W line (0/0); use empirical tolerance to avoid it
      var q = Math.abs(Δψ) > 10e-12 ? Δφ/Δψ : Math.cos(φ1);

      // distance is pythagoras on 'stretched' Mercator projection
      var δ = Math.sqrt(Δφ*Δφ + q*q*Δλ*Δλ); // angular distance in radians
      var dist = δ * R;

      return dist.toPrecisionFixed(4); // 4 sig figs reflects typical 0.3% accuracy of spherical model
  }


  /**
   * Returns the bearing from this point to the supplied point along a rhumb line, in degrees
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @returns {Number} bearing in degrees from North
   */
  LatLon.prototype.rhumbBearingTo = function(point) {
      var φ1 = this.lat.toRadians(), φ2 = point.lat.toRadians();
      var Δλ = (point.lon-this.lon).toRadians();
      // if dLon over 180° take shorter rhumb line across the anti-meridian:
      if (Math.abs(Δλ) > Math.PI) Δλ = Δλ>0 ? -(2*Math.PI-Δλ) : (2*Math.PI+Δλ);

      var Δψ = Math.log(Math.tan(φ2/2+Math.PI/4)/Math.tan(φ1/2+Math.PI/4));

      var θ = Math.atan2(Δλ, Δψ);

      return (θ.toDegrees()+360) % 360;
  }


  /**
   * Returns the destination point from this point having travelled the given distance (in km) on the
   * given bearing along a rhumb line
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {Number} brng: bearing in degrees from North
   * @param   {Number} dist: distance in km
   * @returns {LatLon} destination point
   */
  LatLon.prototype.rhumbDestinationPoint = function(brng, dist) {
      var δ = Number(dist) / this.radius; // angular distance in radians
      var φ1 = this.lat.toRadians(), λ1 = this.lon.toRadians();
      var θ = Number(brng).toRadians();

      var Δφ = δ * Math.cos(θ);

      var φ2 = φ1 + Δφ;
      // check for some daft bugger going past the pole, normalise latitude if so
      if (Math.abs(φ2) > Math.PI/2) φ2 = φ2>0 ? Math.PI-φ2 : -Math.PI-φ2;

      var Δψ = Math.log(Math.tan(φ2/2+Math.PI/4)/Math.tan(φ1/2+Math.PI/4));
      var q = Math.abs(Δψ) > 10e-12 ? Δφ / Δψ : Math.cos(φ1); // E-W course becomes ill-conditioned with 0/0

      var Δλ = δ*Math.sin(θ)/q;

      var λ2 = λ1 + Δλ;

      λ2 = (λ2 + 3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180º

      return new LatLon(φ2.toDegrees(), λ2.toDegrees());
  }


  /**
   * Returns the loxodromic midpoint (along a rhumb line) between this point and the supplied point.
   *   see http://mathforum.org/kb/message.jspa?messageID=148837
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {LatLon} point: latitude/longitude of destination point
   * @returns {LatLon} midpoint between this point and the supplied point
   */
  LatLon.prototype.rhumbMidpointTo = function(point) {
      var φ1 = this.lat.toRadians(), λ1 = this.lon.toRadians();
      var φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();

      if (Math.abs(λ2-λ1) > Math.PI) λ1 += 2*Math.PI; // crossing anti-meridian

      var φ3 = (φ1+φ2)/2;
      var f1 = Math.tan(Math.PI/4 + φ1/2);
      var f2 = Math.tan(Math.PI/4 + φ2/2);
      var f3 = Math.tan(Math.PI/4 + φ3/2);
      var λ3 = ( (λ2-λ1)*Math.log(f3) + λ1*Math.log(f2) - λ2*Math.log(f1) ) / Math.log(f2/f1);

      if (!isFinite(λ3)) λ3 = (λ1+λ2)/2; // parallel of latitude

      λ3 = (λ3 + 3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180º

      return new LatLon(φ3.toDegrees(), λ3.toDegrees());
  }


  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


  /**
   * Returns a string representation of this point; format and dp as per lat()/lon()
   *
   * @this    {LatLon} latitude/longitude of origin point
   * @param   {String} [format]: return value as 'd', 'dm', 'dms'
   * @param   {Number} [dp=0|2|4]: number of decimal places to display
   * @returns {String} comma-separated latitude/longitude
   */
  LatLon.prototype.toString = function(format, dp) {
      if (typeof format == 'undefined') format = 'dms';

      return Geo.toLat(this.lat, format, dp) + ', ' + Geo.toLon(this.lon, format, dp);
  }


  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


  // ---- extend Number object with methods for converting degrees/radians


  /** Converts numeric degrees to radians */
  if (typeof Number.prototype.toRadians == 'undefined') {
      Number.prototype.toRadians = function() {
          return this * Math.PI / 180;
      }
  }


  /** Converts radians to numeric (signed) degrees */
  if (typeof Number.prototype.toDegrees == 'undefined') {
      Number.prototype.toDegrees = function() {
          return this * 180 / Math.PI;
      }
  }


  /**
   * Formats the significant digits of a number, using only fixed-point notation (no exponential)
   *
   * @param   {Number} precision: Number of significant digits to appear in the returned string
   * @returns {String} A string representation of number which contains precision significant digits
   */
  if (typeof Number.prototype.toPrecisionFixed == 'undefined') {
      Number.prototype.toPrecisionFixed = function(precision) {

      // use standard toPrecision method
      var n = this.toPrecision(precision);

      // ... but replace +ve exponential format with trailing zeros
      n = n.replace(/(.+)e\+(.+)/, function(n, sig, exp) {
          sig = sig.replace(/\./, '');       // remove decimal from significand
          l = sig.length - 1;
          while (exp-- > l) sig = sig + '0'; // append zeros from exponent
          return sig;
      });

      // ... and replace -ve exponential format with leading zeros
      n = n.replace(/(.+)e-(.+)/, function(n, sig, exp) {
          sig = sig.replace(/\./, '');       // remove decimal from significand
          while (exp-- > 1) sig = '0' + sig; // prepend zeros from exponent
          return '0.' + sig;
      });

      return n;
    }
  }


  /** Trims whitespace from string (q.v. blog.stevenlevithan.com/archives/faster-trim-javascript) */
  if (typeof String.prototype.trim == 'undefined') {
      String.prototype.trim = function() {
          return String(this).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
      }
  }


  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
  if (!window.console) window.console = { log: function() {} };
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
  /*  Geodesy representation conversion functions (c) Chris Veness 2002-2012                        */
  /*   - www.movable-type.co.uk/scripts/latlong.html                                                */
  /*                                                                                                */
  /*  Sample usage:                                                                                 */
  /*    var lat = Geo.parseDMS('51° 28′ 40.12″ N');                                                 */
  /*    var lon = Geo.parseDMS('000° 00′ 05.31″ W');                                                */
  /*    var p1 = new LatLon(lat, lon);                                                              */
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


  var Geo = {};  // Geo namespace, representing static class


  /**
   * Parses string representing degrees/minutes/seconds into numeric degrees
   *
   * This is very flexible on formats, allowing signed decimal degrees, or deg-min-sec optionally
   * suffixed by compass direction (NSEW). A variety of separators are accepted (eg 3º 37' 09"W)
   * or fixed-width format without separators (eg 0033709W). Seconds and minutes may be omitted.
   * (Note minimal validation is done).
   *
   * @param   {String|Number} dmsStr: Degrees or deg/min/sec in variety of formats
   * @returns {Number} Degrees as decimal number
   * @throws  {TypeError} dmsStr is an object, perhaps DOM object without .value?
   */
  Geo.parseDMS = function(dmsStr) {
    if (typeof deg == 'object') throw new TypeError('Geo.parseDMS - dmsStr is [DOM?] object');

    // check for signed decimal degrees without NSEW, if so return it directly
    if (typeof dmsStr === 'number' && isFinite(dmsStr)) return Number(dmsStr);

    // strip off any sign or compass dir'n & split out separate d/m/s
    var dms = String(dmsStr).trim().replace(/^-/,'').replace(/[NSEW]$/i,'').split(/[^0-9.,]+/);
    if (dms[dms.length-1]=='') dms.splice(dms.length-1);  // from trailing symbol

    if (dms == '') return NaN;

    // and convert to decimal degrees...
    switch (dms.length) {
      case 3:  // interpret 3-part result as d/m/s
        var deg = dms[0]/1 + dms[1]/60 + dms[2]/3600;
        break;
      case 2:  // interpret 2-part result as d/m
        var deg = dms[0]/1 + dms[1]/60;
        break;
      case 1:  // just d (possibly decimal) or non-separated dddmmss
        var deg = dms[0];
        // check for fixed-width unseparated format eg 0033709W
        //if (/[NS]/i.test(dmsStr)) deg = '0' + deg;  // - normalise N/S to 3-digit degrees
        //if (/[0-9]{7}/.test(deg)) deg = deg.slice(0,3)/1 + deg.slice(3,5)/60 + deg.slice(5)/3600;
        break;
      default:
        return NaN;
    }
    if (/^-|[WS]$/i.test(dmsStr.trim())) deg = -deg; // take '-', west and south as -ve
    return Number(deg);
  }


  /**
   * Convert decimal degrees to deg/min/sec format
   *  - degree, prime, double-prime symbols are added, but sign is discarded, though no compass
   *    direction is added
   *
   * @private
   * @param   {Number} deg: Degrees
   * @param   {String} [format=dms]: Return value as 'd', 'dm', 'dms'
   * @param   {Number} [dp=0|2|4]: No of decimal places to use - default 0 for dms, 2 for dm, 4 for d
   * @returns {String} deg formatted as deg/min/secs according to specified format
   * @throws  {TypeError} deg is an object, perhaps DOM object without .value?
   */
  Geo.toDMS = function(deg, format, dp) {
    if (typeof deg == 'object') throw new TypeError('Geo.toDMS - deg is [DOM?] object');
    if (isNaN(deg)) return null;  // give up here if we can't make a number from deg

      // default values
    if (typeof format == 'undefined') format = 'dms';
    if (typeof dp == 'undefined') {
      switch (format) {
        case 'd': dp = 4; break;
        case 'dm': dp = 2; break;
        case 'dms': dp = 0; break;
        default: format = 'dms'; dp = 0;  // be forgiving on invalid format
      }
    }

    deg = Math.abs(deg);  // (unsigned result ready for appending compass dir'n)

    switch (format) {
      case 'd':
        d = deg.toFixed(dp);     // round degrees
        if (d<100) d = '0' + d;  // pad with leading zeros
        if (d<10) d = '0' + d;
        dms = d + '\u00B0';      // add º symbol
        break;
      case 'dm':
        var min = (deg*60).toFixed(dp);  // convert degrees to minutes & round
        var d = Math.floor(min / 60);    // get component deg/min
        var m = (min % 60).toFixed(dp);  // pad with trailing zeros
        if (d<100) d = '0' + d;          // pad with leading zeros
        if (d<10) d = '0' + d;
        if (m<10) m = '0' + m;
        dms = d + '\u00B0' + m + '\u2032';  // add º, ' symbols
        break;
      case 'dms':
        var sec = (deg*3600).toFixed(dp);  // convert degrees to seconds & round
        var d = Math.floor(sec / 3600);    // get component deg/min/sec
        var m = Math.floor(sec/60) % 60;
        var s = (sec % 60).toFixed(dp);    // pad with trailing zeros
        if (d<100) d = '0' + d;            // pad with leading zeros
        if (d<10) d = '0' + d;
        if (m<10) m = '0' + m;
        if (s<10) s = '0' + s;
        dms = d + '\u00B0' + m + '\u2032' + s + '\u2033';  // add º, ', " symbols
        break;
    }

    return dms;
  }


  /**
   * Convert numeric degrees to deg/min/sec latitude (suffixed with N/S)
   *
   * @param   {Number} deg: Degrees
   * @param   {String} [format=dms]: Return value as 'd', 'dm', 'dms'
   * @param   {Number} [dp=0|2|4]: No of decimal places to use - default 0 for dms, 2 for dm, 4 for d
   * @returns {String} Deg/min/seconds
   */
  Geo.toLat = function(deg, format, dp) {
    var lat = Geo.toDMS(deg, format, dp);
    return lat==null ? '–' : lat.slice(1) + (deg<0 ? 'S' : 'N');  // knock off initial '0' for lat!
  }


  /**
   * Convert numeric degrees to deg/min/sec longitude (suffixed with E/W)
   *
   * @param   {Number} deg: Degrees
   * @param   {String} [format=dms]: Return value as 'd', 'dm', 'dms'
   * @param   {Number} [dp=0|2|4]: No of decimal places to use - default 0 for dms, 2 for dm, 4 for d
   * @returns {String} Deg/min/seconds
   */
  Geo.toLon = function(deg, format, dp) {
    var lon = Geo.toDMS(deg, format, dp);
    return lon==null ? '–' : lon + (deg<0 ? 'W' : 'E');
  }


  /**
   * Convert numeric degrees to deg/min/sec as a bearing (0º..360º)
   *
   * @param   {Number} deg: Degrees
   * @param   {String} [format=dms]: Return value as 'd', 'dm', 'dms'
   * @param   {Number} [dp=0|2|4]: No of decimal places to use - default 0 for dms, 2 for dm, 4 for d
   * @returns {String} Deg/min/seconds
   */
  Geo.toBrng = function(deg, format, dp) {
    deg = (Number(deg)+360) % 360;  // normalise -ve values to 180º..360º
    var brng =  Geo.toDMS(deg, format, dp);
    return brng==null ? '–' : brng.replace('360', '0');  // just in case rounding took us up to 360º!
  }


  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
  if (!window.console) window.console = { log: function() {} };
});
