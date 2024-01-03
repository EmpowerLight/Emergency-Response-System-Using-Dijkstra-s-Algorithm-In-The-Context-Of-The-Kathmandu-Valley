const loaderOverlay = document.getElementById('loader-overlay');
const loader = document.getElementById('loader');
const messageContainer = document.getElementById('message-container');


function placeIcon(path) {
    return L.icon({
        iconUrl: path,
        iconSize: [16, 16], // size of the icon
    });
}


function setupMap(centerLatLng, zoomLevel) {
    let map = L.map('map').setView(centerLatLng, zoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 25,
    }).addTo(map);

    return map;
}

function placeMarker(map, latLng, icon, popupContent) {
    L.marker(latLng, { icon: icon }).addTo(map).bindPopup(popupContent);
}


function placeAmbulances(map, ambulanceData) {
    const imagePath = '../static/images/ambulance.png';
    placeMarker(map, 
                [ambulanceData[2], ambulanceData[1]], 
                placeIcon(imagePath),
                `Ambulance ID: ${ambulanceData[0]}`
                );
}

function placeEmergencyCircle(map, centerLatLng, radius) {
    L.circle(centerLatLng, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: radius
    }).addTo(map);
}

function renderShortestPath(map, shortestPathCoordinates) {
    L.polyline(shortestPathCoordinates, { color: 'red' }).addTo(map);
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
        const singleEvent = await getEvent();
        const eventOccurCoordinate = [singleEvent.Latitude, singleEvent.Longitude];

        const map = setupMap(eventOccurCoordinate, 16);
        const emojiPath = '../static/images/eventPersonemoji.png';

        placeMarker(map, eventOccurCoordinate, placeIcon(emojiPath), 'Hey! Need help over here');
        placeEmergencyCircle(map, eventOccurCoordinate, 1000);

        const ambulanceData = await (await fetch(`/get_ambulance_data?event_latitude=${singleEvent.Latitude}&event_longitude=${singleEvent.Longitude}`)).json();

        if (ambulanceData && ambulanceData.length > 0) {
            placeAmbulances(map, ambulanceData);

            try {
                // Show the loader while waiting for the response
                loaderOverlay.style.display = 'flex';
                // get the shortest path
                messageContainer.innerHTML = `<p>Calculating the shortest distance...</p>`;

                const shortestPathData = await fetch(`/get_shortest_path?ambulance_latitude=${ambulanceData[2]}&ambulance_longitude=${ambulanceData[1]}&event_latitude=${singleEvent.Latitude}&event_longitude=${singleEvent.Longitude}`);
                if (shortestPathData.ok) {
                    const { shortestPathCoordinates, distance } = await shortestPathData.json();
                    renderShortestPath(map, shortestPathCoordinates);
                   
                    const roundedDistance = Math.round(distance * 100) / 100; 
                    messageContainer.innerHTML = `<p>Great news! An ambulance is on its way to help you. It is approximately ${roundedDistance} meters away.</p>`;
                    // Hide the loader after receiving the response and updating the message
                    loaderOverlay.style.display = 'none';

                } else {
                    console.error(`Error fetching shortest path: ${shortestPathData.status}`);
                    // Hide the loader in case of an error
                    loaderOverlay.style.display = 'none';
                }

            } catch(error) {
                handleErrorMessage('Error fetching shortest path:', 'Oops! Something went wrong. Please try again later.')
                // Hide the loader in case of an error
                loaderOverlay.style.display = 'none';
            }

        } else {
            console.log("No ambulance found");
            // Add an message when no ambulance is found
            messageContainer.innerHTML = `<p>We're sorry, but no ambulance is available nearby. Help is on the way!</p>`;
            // Hide the loader when no ambulance is found
            loaderOverlay.style.display = 'none';
        }

    } catch (error) {
        handleErrorMessage("Error initializing map: ", "Oh no! Something went wrong while initializing the map.");
        // Hide the loader in case of an initialization error
        loaderOverlay.style.display = 'none';
    }
}


initMap();
