// Instantiate the variables required for google map.
var map, directionDisplay, directionsService, infoWindow, stepDisplay;

// Instantiate the variables required for markers and polylines.
var marker = null, polyline = null, poly2 = null;

var timerHandle = null;

// Creates a marker on the google map.
function createMarker(coordinates, label, html, cluster) {
    var contentString = '<b>' + label + '</b><br>' + html;
    var marker;
    if (cluster) {
        marker = new google.maps.Marker({
            position: coordinates,
            title: label
        });
    } else {
        marker = new google.maps.Marker({
            position: coordinates,
            map: map,
            title: label
        });
    }

    google.maps.event.addListener(marker, 'click', function () {
        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);
    });
    return marker;
}

// Initializes the google map.
function initializeMap() {

    // Instantiate Info Window for markers.
    infoWindow = new google.maps.InfoWindow({
        size: new google.maps.Size(150, 50)
    });

    // Instantiate a directions service.
    directionsService = new google.maps.DirectionsService;

    // Create a map and center it on Deakin University.
    var mapOptions = {
        zoom: 13,
        center: {
            lat: -38.1985359,
            lng: 144.30014
        }
    };
    map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

    // Create a renderer for directions and bind it to the map.
    directionsDisplay = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });

    // Instantiate an info window to hold step text.
    stepDisplay = new google.maps.InfoWindow();

    polyline = new google.maps.Polyline({
        path: [],
        strokeColor: '#FF0000',
        strokeWeight: 3
    });

    poly2 = new google.maps.Polyline({
        path: [],
        strokeColor: '#FF0000',
        strokeWeight: 3
    });
}

var steps = [];

// Starts the GPS Simulation on google map.
function startSimulation() {

    /* 
     * Clears the google map from any previous markers, polylines and directions.
     */
    if (timerHandle) {
        clearTimeout(timerHandle);
    }
    if (marker) {
        marker.setMap(null);
    }
    polyline.setMap(null);
    poly2.setMap(null);
    directionsDisplay.setMap(null);

    polyline = new google.maps.Polyline({
        path: [],
        strokeColor: '#FF0000',
        strokeWeight: 3
    });

    poly2 = new google.maps.Polyline({
        path: [],
        strokeColor: '#FF0000',
        strokeWeight: 3
    });

    directionsDisplay = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });

    /*
     * Requests the stop co-ordinates from the stops file (JSON Encoded)
     */
    var JSONRequest = new XMLHttpRequest();
    JSONRequest.overrideMimeType("application/json");
    JSONRequest.open("GET", "stops.json", false);
    JSONRequest.send(null)

    var locations = JSON.parse(JSONRequest.responseText);

    var stops = [],
        stop_names = [],
        stop_ids = [],
        startCoords = new Object(),
        endCoords = new Object();

    for (var i = 0; i < locations.stops.length; i++) {
        if (locations.stops[i].stop_name == "Deakin University/Alfred Deakin Dr") {
            endCoords = {
                lat: locations.stops[i].stop_latitude,
                lng: locations.stops[i].stop_longitude
            };
        } else if (locations.stops[i].stop_name == "Geelong Railway Station/Railway Tce") {
            startCoords = {
                lat: locations.stops[i].stop_latitude,
                lng: locations.stops[i].stop_longitude
            };
        } else {
            stop_names.push(locations.stops[i].stop_name);
            stop_ids.push(locations.stops[i].stop_id);
            stop = {
                lat: locations.stops[i].stop_latitude,
                lng: locations.stops[i].stop_longitude
            }
            stops.push({
                location: stop,
                stopover: true
            });
        }
    }

    createMarker(startCoords, "Geelong Railway Station/Railway Tce", "Stop Id 27930", false);
    var markers = stops.map(function (coordinates, i) {
        return createMarker(coordinates.location, stop_names[i], "Stop Id " + stop_ids[i], true);
    });
    createMarker(endCoords, "Deakin University/Alfred Deakin Dr", "Stop Id 15335", false);
    
    var markerCluster = new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    });
    
    // Route settings for directions call.
    var routeSettings = {
        origin: startCoords,
        destination: endCoords,
        waypoints: stops,
        optimizeWaypoints: true,
        travelMode: 'DRIVING'
    };

    // Route the directions and pass the response to a function to create markers for each step.
    directionsService.route(routeSettings, function (response, status) {
        if (status === 'OK') {
            directionsDisplay.setDirections(response);

            var bounds = new google.maps.LatLngBounds();
            var route = response.routes[0];
            startLocation = new Object();
            endLocation = new Object();

            // For each route, display summary information.
            var path = response.routes[0].overview_path;
            var legs = response.routes[0].legs;
            for (i = 0; i < legs.length; i++) {
                if (i === 0) {
                    startLocation.latlng = legs[i].start_location;
                    startLocation.address = legs[i].start_address;
                }
                endLocation.latlng = legs[i].end_location;
                endLocation.address = legs[i].end_address;
                var steps = legs[i].steps;
                for (j = 0; j < steps.length; j++) {
                    var nextSegment = steps[j].path;
                    for (k = 0; k < nextSegment.length; k++) {
                        polyline.getPath().push(nextSegment[k]);
                        bounds.extend(nextSegment[k]);
                    }
                }
            }
            polyline.setMap(map);
            map.fitBounds(bounds);
            /*
            var listener = google.maps.event.addListener(map, "idle", function () {
                if (map.getZoom() < 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
            */
            startAnimation();
        }
    });
}

var step = 5; // 5; // metres
var tick = 100; // milliseconds
var eol;
var k = 0;
var stepnum = 0;
var speed = "";
var lastVertex = 1;
var speed = 0.000005,
    wait = 1;

//=============== animation functions ======================
function updatePoly(d) {
    // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
    if (poly2.getPath().getLength() > 20) {
        poly2 = new google.maps.Polyline([polyline.getPath().getAt(lastVertex - 1)]);
    }

    if (polyline.GetIndexAtDistance(d) < lastVertex + 2) {
        if (poly2.getPath().getLength() > 1) {
            poly2.getPath().removeAt(poly2.getPath().getLength() - 1);
        }
        poly2.getPath().insertAt(poly2.getPath().getLength(), polyline.GetPointAtDistance(d));
    } else {
        poly2.getPath().insertAt(poly2.getPath().getLength(), endLocation.latlng);
    }
}

function animate(d) {
    console.log("Lat: " + marker.getPosition().lat() + ", Lng: " + marker.getPosition().lng());
	
	var APIPost = new XMLHttpRequest();
	APIPost.open("PUT", "http://bustrackerweb.azurewebsites.net/api/Bus/PutBusOnRouteLocation", false);
	APIPost.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	APIPost.send("BusRegoNumber=YCT-200&BusLongitude=" + marker.getPosition().lat() + "&BusLatitude=" + marker.getPosition().lng() + "&RouteId=10846");
	
    if (d > eol) {
        map.panTo(endLocation.latlng);
        marker.setPosition(endLocation.latlng);
        return;
    }
    var p = polyline.GetPointAtDistance(d);
    map.panTo(p);
    var lastPosn = marker.getPosition();
    marker.setPosition(p);
    var heading = google.maps.geometry.spherical.computeHeading(lastPosn, p);
    icon.rotation = heading;
    marker.setIcon(icon);
    updatePoly(d);
    timerHandle = setTimeout("animate(" + (d + step) + ")", tick);
}

function startAnimation() {
    eol = polyline.Distance();
    map.setCenter(polyline.getPath().getAt(0));
    marker = new google.maps.Marker({
        position: polyline.getPath().getAt(0),
        map: map,
        icon: icon
    });

    poly2 = new google.maps.Polyline({
        path: [polyline.getPath().getAt(0)],
        strokeColor: "#0000FF",
        strokeWeight: 10
    });
    timerHandle = setTimeout("animate(50)", 2000); // Allow time for the initial map display
}

function stopSimulation() {
    clearTimeout(timerHandle);
    if (marker) {
        marker.setMap(null);
    }
    polyline.setMap(null);
    poly2.setMap(null);
    directionsDisplay.setMap(null);
}
//=============== ~animation funcitons =====================

var car = "M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.417,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z";
var bus = "M367.524,92.122c-4.208-21.045-17.678-29.463-37.882-37.882c-19.918-8.299-67.648-18.229-102.872-18.507,C191.548,36.012,143.819,45.941,123.9,54.24c-20.204,8.418-33.673,16.836-37.882,37.882L70.866,208.794V369.56h26.096v25.211,c0,30.739,44.984,30.739,44.984,0V369.56h83.048h0.263h86.341v25.211c0,30.739,44.983,30.739,44.983,0V369.56h26.096V208.794,L367.524,92.122z M162.625,65.184h62.631h65.662c12.628,0,12.628,18.941,0,18.941h-65.815h-62.478,C149.997,84.125,149.997,65.184,162.625,65.184z M119.472,319.162c-11.918,0-21.58-9.662-21.58-21.58s9.662-21.579,21.58-21.579,s21.58,9.661,21.58,21.579S131.39,319.162,119.472,319.162z M225.256,221.09H110.797c-11.206,0-13.552-8.051-12.452-16.162,l11.793-84.621c1.62-10.281,5.105-17.059,18.444-17.059h96.521h99.857c13.34,0,16.824,6.778,18.443,17.059l11.795,84.621,c1.1,8.111-1.246,16.162-12.452,16.162H225.256z M334.07,319.162c-11.918,0-21.579-9.662-21.579-21.58,s9.661-21.579,21.579-21.579s21.579,9.661,21.579,21.579S345.988,319.162,334.07,319.162z";
var icon = {
    path: bus,
    scale: .044,
    strokeColor: 'white',
    strokeWeight: .10,
    fillOpacity: 1,
    fillColor: '#404040',
    anchor: new google.maps.Point(220, 220)
};