function placeIcon(path) {
    return L.icon({
        iconUrl: path,
        iconSize: [12, 12], // size of the icon
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
    // ambulanceDatas.forEach(ambulanceData => {
    //     placeMarker(
    //         map,
    //         [ambulanceData.Latitude, ambulanceData.Longitude],
    //         placeIcon(imagePath),
    //         `Ambulance ID: ${ambulanceData.ID}`
    //     );
    // });
    placeMarker(map, 
                [ambulanceData[2], ambulanceData[1]], 
                placeIcon(imagePath),
                `Ambulance ID: ${ambulanceData[0]}`
                )
}

function placeEmergencyCircle(map, centerLatLng, radius) {
    L.circle(centerLatLng, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: radius
    }).addTo(map);
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
        // console.log(ambulanceData)
        placeAmbulances(map, ambulanceData);
    } catch (error) {
        console.error('Error initializing map:', error);
       
    }
}


initMap();




// let map = L.map('map').setView([27.703122, 85.320893], 16)

// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 20,
// }).addTo(map)

// let marker = L.marker([27.703122, 85.320893]).addTo(map)


// let circle = L.circle([27.703122, 85.320893], {
//     color: 'red',
//     fillColor: '#f03',
//     fillOpacity: 0.5,
//     radius: 1000
// }).addTo(map)

// marker.bindPopup("Your Current Location").openPopup()

// var popup = L.popup()

// map.on('click', e => {
//     popup
//     .setLatLng(e.latlng)
//     .setContent("You clicked the map at " + e.latlng.toString())
//     .openOn(map)
// })



// fetch(roadData)
//     .then(response => response.json())
//     .then(data => {
//         console.log('GeoJSON data:', data);
//         L.geoJSON(data, {
//             style: {
//                 color: 'blue',
//                 weight: 2,
//                 opacity: 0.7
//             }
//         }).addTo(map);
//     })
//     .catch(error => console.error('Error loading GeoJSON:', error));


// function placeIcon(path) {
//     return L.icon({
//         iconUrl: path,
//         iconSize: [12, 12], // size of the icon
//     })
// }

//get an ambulance data
// fetch('/get_ambulance_data')
//     .then(response => response.json())
//     .then(ambulanceDatas => {
//         // Use data to display ambulances on the map
//         ambulanceDatas.forEach(ambulanceData => {
//             const imagePath = '../static/images/ambulance.png'
//             L.marker([ambulanceData.Latitude, ambulanceData.Longitude], {icon: placeIcon(imagePath)})
//             .addTo(map)
//             .bindPopup(`Ambulance ID: ${ambulanceData.ID}`)
//         }) 
//     })




// let arr = [[27.703122, 85.320893], [27.7031523, 85.3203719], [27.7019104, 85.3201407], [27.7016164, 85.322224], [27.7016058, 85.3223011], [27.7009992, 85.3221818], [27.7006723, 85.3235917], [27.7006087, 85.3236972], [27.7005758, 85.3241021], [27.7005213, 85.3241699], [27.7002951, 85.3242837], [27.6999369, 85.3264103], [27.699831, 85.326905]]




// L.polyline(arr, { color: 'red' }).addTo(map);