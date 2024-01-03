from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from shapely.geometry import Point
from shortest_path_finder import ShortestPathFinder


app = Flask(__name__)


def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in kilometers
    # Convert latitude and longitude to radians
    lat1, lon1, lat2, lon2 = np.radians([lat1, lon1, lat2, lon2])
    # Calculate differences
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    # Haversine formula
    a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    # Calculate distance
    distance = R * c

    return distance


@app.route("/get_event_data")
def get_event_data():
    event_data = pd.read_csv("data/event_data.csv")
    return event_data.to_json(orient='records')


@app.route("/get_ambulance_data")
def get_ambulance_data(): 
    ambulance_data = pd.read_csv("data/ambulance_data.csv")

    # Get the event location and radius from the query parameters
    event_latitude = float(request.args.get('event_latitude'))
    event_longitude = float(request.args.get('event_longitude'))

    # Initialize variables
    selected_ambulance = pd.DataFrame()

    # Loop through each radius from 1 km to 5 km
    for radius in range(1, 6):
        # Filter ambulances within the current radius
        filtered_ambulances = ambulance_data.apply(
            lambda row: haversine(event_latitude, event_longitude, row['Latitude'], row['Longitude']) <= radius,
            axis=1
        )

        # Check if any ambulances are within the current radius
        if not filtered_ambulances.empty and filtered_ambulances.any():
            selected_ambulance = ambulance_data[filtered_ambulances].iloc[0]
            print(radius)
            break

    # Check if an ambulance was found
    if not selected_ambulance.empty:
        # Continue with the rest of your logic using the selected_ambulance data
        # print("Selected Ambulance ID:", selected_ambulance['ID'])
        return selected_ambulance.to_json(orient='records')
    else:
        # Handle the case where no ambulance was found
        # print("No ambulance found within the specified radius.")
        return pd.DataFrame().to_json(orient='records')



@app.route("/get_shortest_path")
def get_shortest_path():
    try:
         # Get the coordinates from the query parameters
        ambulance_latitude = float(request.args.get('ambulance_latitude'))
        ambulance_longitude = float(request.args.get('ambulance_longitude'))
        event_latitude = float(request.args.get('event_latitude'))
        event_longitude = float(request.args.get('event_longitude'))

         # Create Point objects for the ambulance and event locations
        ambulance_location = Point(ambulance_longitude, ambulance_latitude)
        event_location = Point(event_longitude, event_latitude)

        # Create an instance of ShortestPathFinder
        path_finder = ShortestPathFinder()

         # Find the shortest path and its distance
        shortest_path, distance = path_finder.find_shortest_path(ambulance_location, event_location)

        # Extract coordinates from nodes
        shortest_path_coordinates = path_finder.get_coordinates(shortest_path)

        return jsonify({
            'shortestPathCoordinates': shortest_path_coordinates,
            'distance': distance
        })
    
    except Exception as e:
        return jsonify(error=str(e))


@app.route("/get_hospital_data")
def get_hospital_data():
    hospital_data = pd.read_csv("data/hospital_data.csv")
    return hospital_data.to_json(orient='records')

@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)