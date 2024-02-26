const loaderOverlay = document.getElementById('loader-overlay');
const loader = document.getElementById('loader');
const messageContainer = document.getElementById('message-container');
const reportLink = document.getElementById('report-link');
const reportContainerForm = document.getElementById('report-form-container');

let ambulanceMarker;
let shortestPathPolyline;


reportLink.addEventListener("click", e => {
    e.preventDefault();
    // Toggle the visibility of the report form
    reportContainerForm.style.display = reportContainerForm.style.display === 'block' ? 'none' : 'block';
});


function generateReport() {
    // get user input
    const patientName = document.getElementById("patient-name").value;
    const patientCondition = document.getElementById("patient-condition").value;

    // Validate input (you can add more validation as needed)
    if (!patientName.trim() || !patientCondition.trim()) {
        alert('Please fill in all fields.');
        return;
    }

    // Send data to the backend for PDF generation
    fetch('/generate_pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            patient_name: patientName,
            patient_condition: patientCondition,
        }),
    })
    .then(response => response.blob())
    .then(blob => {
        // Create a download link for the generated PDF
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'patient_report.pdf';
        downloadLink.click();
    })
    .catch(error => {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    });

    // Hide the report form
    reportContainerForm.style.display = 'none';

    // Optional: You can reset the form fields
    reportForm.reset();
}



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

function placeHospital(map, hospitalData) {
    const imagePath = "../static/images/hospital.png"
    placeMarker(map, 
            [hospitalData[3], hospitalData[4]], 
            placeIcon(imagePath), 
            `${hospitalData[0]}`
        );
}

function placeEmergencyCircle(map, centerLatLng, radius, color) {
    L.circle(centerLatLng, {
        color: color,
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

async function getZoneType(eventLatitude, eventLongitude) {
    try {
        const response = await fetch(`/classify_zone?event_latitude=${eventLatitude}&event_longitude=${eventLongitude}`);
        const zoneData = await response.json();
        return zoneData.zone_type;
    } catch (error) {
        console.error('Error classifying zone:', error);
        throw error;
    }
}


//initMap function
async function initMap() {
    try {
        // Fetch a random event
        const singleEvent = await getEvent();
        const eventOccurCoordinate = [singleEvent.Latitude, singleEvent.Longitude];

        const zoneType = await getZoneType(eventOccurCoordinate[0], eventOccurCoordinate[1]);
        // Initialize the map
        const map = setupMap(eventOccurCoordinate, 14);
        const emojiPath = '../static/images/eventPersonemoji.png';

        // Place the event marker on the map
        eventMarker = placeMarker(map, eventOccurCoordinate, placeIcon(emojiPath), 'Hey! Need help over here');

        // Fetch ambulance data and radius from the server
        const { ambulance_data, radius } = await (await fetch(`/get_ambulance_data?event_latitude=${eventOccurCoordinate[0]}&event_longitude=${eventOccurCoordinate[1]}`)).json();
        const ambulanceData = JSON.parse(ambulance_data);

        // Place a circle on the map to indicate the radius
        placeEmergencyCircle(map, eventOccurCoordinate, radius * 1000, zoneType);

        if (ambulanceData && ambulanceData.length >= 3) {
            // If ambulance is available, place the ambulance marker
            ambulanceMarker = placeAmbulances(map, ambulanceData);

            try {
                // Show loading messages and initiate the shortest path calculation
                loaderOverlay.style.display = 'flex';
                messageContainer.innerHTML = `<p>Zone type: ${zoneType}. Found an Ambulance within ${radius} Km radius. Calculating the shortest distance...</p>`;

                // Fetch the shortest path
                const shortestPathData = await fetch(`/get_shortest_path?start_latitude=${ambulanceData[2]}&start_longitude=${ambulanceData[1]}&end_latitude=${eventOccurCoordinate[0]}&end_longitude=${eventOccurCoordinate[1]}`);

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
        let newAmbulanceData = [ambulanceID, eventOccurCoordinate[1], eventOccurCoordinate[0], ...rest];
        ambulanceMarker = placeAmbulances(map, newAmbulanceData);

        try {
            const hospitalData = await (await fetch(`/get_hospital_data?event_latitude=${eventOccurCoordinate[0]}&event_longitude=${eventOccurCoordinate[1]}`)).json();
            
            if (hospitalData && hospitalData.length > 0) {
                placeHospital(map, hospitalData);
                try {
                    loaderOverlay.style.display = 'flex';
                    messageContainer.innerHTML = `<p>Great news! Found the nearest hospital, ${hospitalData[0]}. Let's move there. Calculating the shortest distance...</p>`;
                    
                    const shortestPathDataEventAndHospital = await fetch(`/get_shortest_path?start_latitude=${newAmbulanceData[2]}&start_longitude=${newAmbulanceData[1]}&end_latitude=${hospitalData[3]}&end_longitude=${hospitalData[4]}`);
                    
                    if (shortestPathDataEventAndHospital.ok) {
                        const { shortestPathCoordinates, distance } = await shortestPathDataEventAndHospital.json();
                        shortestPathPolyline = renderShortestPath(map, shortestPathCoordinates);
                         // Display success message
                        const roundedDistance = Math.round(distance * 100) / 100;
                        messageContainer.innerHTML = `<p>Great news! An ambulance is on its way towards ${hospitalData[0]}. It is approximately ${roundedDistance} meters away.</p>`;

                        // Hide the loader after receiving the response and updating the message
                        loaderOverlay.style.display = 'none';

                        // Animate the ambulance marker along the shortest path
                        await animateAmbulance(map, ambulanceMarker, shortestPathCoordinates, shortestPathPolyline);
                        // Display a final message after the ambulance reaches the location
                        
                        messageContainer.innerHTML = `<p>Ambulance has Reached the Hospital.</p>`;
                        

                    } else {
                        console.error(`Error fetching shortest path: ${shortestPathDataEventAndHospital.status}`);
                        loaderOverlay.style.display = 'none';
                    }
                } catch (error) {
                    handleErrorMessage('Error fetching shortest path:', 'Oops! Something went wrong. Please try again later.');
                    loaderOverlay.style.display = 'none';
                }
                

            } else {
                console.log("No hospital found!");
                // Handle the case where no hospital is found
            }
            
        } catch (error) {
            console.error("Error fetching hospital data:", error);
        }

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