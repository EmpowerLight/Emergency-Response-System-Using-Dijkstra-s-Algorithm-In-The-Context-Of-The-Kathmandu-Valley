function placeIcon(path) {
    return L.icon({
        iconUrl: path,
        iconSize: [14, 14], // size of the icon
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

async function initMap() {
    try {
        const singleEvent = await getEvent();
        const eventOccurCoordinate = [singleEvent.Latitude, singleEvent.Longitude];

        const map = setupMap(eventOccurCoordinate, 16);
        const emojiPath = '../static/images/eventPersonemoji.png'

        placeMarker(map, eventOccurCoordinate, placeIcon(emojiPath), 'Hey! Need help over here');

        placeEmergencyCircle(map, eventOccurCoordinate, 1000);

        const ambulanceData = await (await fetch(`/get_ambulance_data?event_latitude=${singleEvent.Latitude}&event_longitude=${singleEvent.Longitude}`)).json();
        if (ambulanceData && ambulanceData.length > 0) {
            placeAmbulances(map, ambulanceData);
            
            // get the shortest path
            const shortestPathData = await fetch(`/get_shortest_path?ambulance_latitude=${ambulanceData[2]}&ambulance_longitude=${ambulanceData[1]}&event_latitude=${singleEvent.Latitude}&event_longitude=${singleEvent.Longitude}`);

            if (shortestPathData.ok) {
                const shortestPathCoordinates = await shortestPathData.json();
                renderShortestPath(map, shortestPathCoordinates);
            } else {
                console.error(`Error fetching shortest path: ${shortestPathData.status}`);
            }

        } else {
            console.log("No ambulance found");
        }
        
    } catch (error) {
        console.error('Error initializing map:', error);
       
    }
}


initMap();
