from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from shapely.geometry import Point
from shortest_path_finder import ShortestPathFinder
import concurrent.futures

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


def fetch_ambulance_data_parallel(event_latitude, event_longitude):
    ambulance_data = pd.read_csv("data/ambulance_data.csv")

    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Fetch ambulance data in parallel for each radius
        for radius in range(1, 6):
            # Create a list of futures for ambulance data within the current radius
            ambulance_futures = [executor.submit(fetch_ambulance_data_single, row, event_latitude, event_longitude, radius) for _, row in ambulance_data.iterrows()]
            
            # Wait for any ambulance found within the current radius
            for future in concurrent.futures.as_completed(ambulance_futures):
                ambulance_json = future.result()
                if ambulance_json:
                    return ambulance_json

    # Handle the case where no ambulance was found
    return pd.DataFrame().to_json(orient='records')


def fetch_ambulance_data_single(row, event_latitude, event_longitude, radius):
    if haversine(event_latitude, event_longitude, row['Latitude'], row['Longitude']) <= radius:
        return row.to_json(orient='records')
    else:
        return None


@app.route("/get_ambulance_data")
def get_ambulance_data():
    try:
        event_latitude = float(request.args.get('event_latitude'))
        event_longitude = float(request.args.get('event_longitude'))

        ambulance_data_json = fetch_ambulance_data_parallel(event_latitude, event_longitude)

        if ambulance_data_json:
            return ambulance_data_json
        else:
            return pd.DataFrame().to_json(orient='records')

    except Exception as e:
        return jsonify(error=str(e))


@app.route("/get_shortest_path")
def get_shortest_path():
    try:
        ambulance_latitude = float(request.args.get('ambulance_latitude'))
        ambulance_longitude = float(request.args.get('ambulance_longitude'))
        event_latitude = float(request.args.get('event_latitude'))
        event_longitude = float(request.args.get('event_longitude'))

        ambulance_location = Point(ambulance_longitude, ambulance_latitude)
        event_location = Point(event_longitude, event_latitude)

        path_finder = ShortestPathFinder()

        # Use parallel processing to find the shortest path
        with concurrent.futures.ThreadPoolExecutor() as executor:
            shortest_path_future = executor.submit(path_finder.find_shortest_path, ambulance_location, event_location)

            # Wait for the result
            shortest_path, distance = shortest_path_future.result()

        shortest_path_coordinates = path_finder.get_coordinates(shortest_path)

        return jsonify({
            'shortestPathCoordinates': shortest_path_coordinates,
            'distance': distance
        })

    except ValueError:
        return jsonify(error="Invalid input for latitude or longitude.")
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