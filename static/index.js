const loaderOverlay = document.getElementById('loader-overlay');
const loader = document.getElementById('loader');
const messageContainer = document.getElementById('message-container');
let ambulanceMarker;
let shortestPathPolyline;

function placeIcon(path) {
    return L.icon({
        iconUrl: path,
        iconSize: [18, 18], // size of the icon
    });
}


function setupMap(centerLatLng, zoomLevel) {
    let map = L.map('map').setView(centerLatLng, zoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
    }).addTo(map);

    return map;
}

function placeMarker(map, latLng, icon, popupContent) {
    return L.marker(latLng, { icon: icon }).addTo(map).bindPopup(popupContent);
}


function placeAmbulances(map, ambulanceData) {
    const imagePath = '../static/images/ambulance.png';
    return placeMarker(map, 
                [ambulanceData[2], ambulanceData[1]], 
                placeIcon(imagePath),
                `Ambulance ID: ${ambulanceData[0]}`
                );
}

function placeEmergencyCircle(map, centerLatLng, radius) {
    L.circle(centerLatLng, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.7,
        radius: radius
    }).addTo(map);
}

function renderShortestPath(map, shortestPathCoordinates) {
    return L.polyline(shortestPathCoordinates, { color: 'red' }).addTo(map);
}


function handleErrorMessage(message) {
    console.error(message);
    messageContainer.innerHTML = `<p>${message}</p>`;
    loaderOverlay.style.display = 'none';
}


async function getEvent() {
    try {
        const response = await fetch('/get_event_data');
        const eventData = await response.json();
        const singleEventIndex = Math.floor(Math.random() * eventData.length);
        return eventData[singleEventIndex];
    } catch (error) {
        console.error('Error fetching event data:', error);
        throw error; 
    }
}

//initMap function

async function initMap() {
    try {
        // Fetch a random event
        const singleEvent = await getEvent();
        const eventOccurCoordinate = [singleEvent.Latitude, singleEvent.Longitude];

        // Initialize the map
        const map = setupMap(eventOccurCoordinate, 16);
        const emojiPath = '../static/images/eventPersonemoji.png';

        // Place the event marker on the map
        eventMarker = placeMarker(map, eventOccurCoordinate, placeIcon(emojiPath), 'Hey! Need help over here');

        // Fetch ambulance data and radius from the server
        const { ambulance_data, radius } = await (await fetch(`/get_ambulance_data?event_latitude=${eventOccurCoordinate[0]}&event_longitude=${singleEvent.Longitude}`)).json();
        const ambulanceData = JSON.parse(ambulance_data);

        // Place a circle on the map to indicate the radius
        placeEmergencyCircle(map, eventOccurCoordinate, radius * 1000);

        if (ambulanceData && ambulanceData.length > 0) {
            // If ambulance is available, place the ambulance marker
            ambulanceMarker = placeAmbulances(map, ambulanceData);

            try {
                // Show loading messages and initiate the shortest path calculation
                loaderOverlay.style.display = 'flex';
                messageContainer.innerHTML = `<p>Found an Ambulance within ${radius} Km radius. Calculating the shortest distance...</p>`;

                // Fetch the shortest path
                const shortestPathData = await fetch(`/get_shortest_path?ambulance_latitude=${ambulanceData[2]}&ambulance_longitude=${ambulanceData[1]}&event_latitude=${singleEvent.Latitude}&event_longitude=${singleEvent.Longitude}`);

                if (shortestPathData.ok) {
                    const { shortestPathCoordinates, distance } = await shortestPathData.json();
                    shortestPathPolyline = renderShortestPath(map, shortestPathCoordinates);

                    // Display success message
                    const roundedDistance = Math.round(distance * 100) / 100;
                    messageContainer.innerHTML = `<p>Great news! An ambulance is on its way to help you. It is approximately ${roundedDistance} meters away.</p>`;

                    // Hide the loader after receiving the response and updating the message
                    loaderOverlay.style.display = 'none';

                    // Animate the ambulance marker along the shortest path
                    await animateAmbulance(map, ambulanceMarker, shortestPathCoordinates, shortestPathPolyline);

                    // Display a final message after the ambulance reaches the location
                    messageContainer.innerHTML = `<p>Ambulance has Reached the Location. Preparing it move towards the Hospital.</p>`;

                    // Remove the event and ambulance markers from the map
                    map.removeLayer(eventMarker);
                    map.removeLayer(ambulanceMarker);
                } else {
                    // Handle error fetching the shortest path
                    console.error(`Error fetching shortest path: ${shortestPathData.status}`);
                    loaderOverlay.style.display = 'none';
                }
            } catch (error) {
                // Handle error during shortest path calculation
                handleErrorMessage('Error fetching shortest path:', 'Oops! Something went wrong. Please try again later.');
                loaderOverlay.style.display = 'none';
            }
        } else {
            // Display a message when no ambulance is found
            console.log("No ambulance found");
            messageContainer.innerHTML = `<p>We're sorry, but no ambulance is available nearby. Help is on the way!</p>`;
            loaderOverlay.style.display = 'none';
        }

        // Create an updated ambulance data array and place the ambulance marker on the map
        const [ambulanceID, longitude, latitude, ...rest] = ambulanceData;
        const newAmbulanceData = [ambulanceID, eventOccurCoordinate[1], eventOccurCoordinate[0], ...rest];
        ambulanceMarker = placeAmbulances(map, newAmbulanceData);
    } catch (error) {
        // Handle initialization error
        handleErrorMessage("Error initializing map:", "Oh no! Something went wrong while initializing the map.");
        loaderOverlay.style.display = 'none';
    }
}

// Animation function
async function animateAmbulance(map, marker, pathCoordinates) {
    for (const coordinate of pathCoordinates) {
        // Update the marker position
        marker.setLatLng([coordinate[0], coordinate[1]]);

        // Use a delay to control the animation speed (adjust the delay as needed)
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1000ms delay
    }
    // Remove the polyline after the animation is complete
    map.removeLayer(shortestPathPolyline);
}


initMap();