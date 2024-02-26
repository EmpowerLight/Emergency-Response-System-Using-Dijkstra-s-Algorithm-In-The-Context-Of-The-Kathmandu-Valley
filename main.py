from flask_login import UserMixin, login_user, LoginManager, login_required, current_user, logout_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import secrets
import pandas as pd
import numpy as np
from shapely.geometry import Point
from shortest_path_finder import ShortestPathFinder
import concurrent.futures
import ast
from reportlab.pdfgen import canvas
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_file, request, flash, redirect, url_for


app = Flask(__name__)
secret_key = secrets.token_hex(32)
app.config['SECRET_KEY'] = secret_key 


##CONNECT TO DB
db_name = "user.db"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_name
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True

login_manager = LoginManager()
login_manager.init_app(app)
db = SQLAlchemy(app)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fullname = db.Column(db.String, nullable=False)
    email = db.Column(db.String, nullable=False, unique=True)
    phone_number = db.Column(db.String, nullable=False, unique=True)
    password = db.Column(db.String, nullable=False)

with app.app_context():
    db.create_all()

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


def calculate_distance(zone, event_latitude, event_longitude):
    zone_latitude = zone['Latitude']
    zone_longitude = zone['Longitude']
    distance = haversine(event_latitude, event_longitude, zone_latitude, zone_longitude)
    return distance, zone['zone_type']

def determine_zone_type(event_latitude, event_longitude):
    try:
        # Read zone data from CSV file
        zone_data = pd.read_csv("data/zone_data.csv")
        
        # Ensure input validation
        if not (-90 <= event_latitude <= 90) or not (-180 <= event_longitude <= 180):
            raise ValueError("Invalid input latitude or longitude values.")
        
        # Use ThreadPoolExecutor to parallelize distance calculations
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(calculate_distance, zone, event_latitude, event_longitude) for _, zone in zone_data.iterrows()]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Find the closest zone based on minimum distance
        min_distance, closest_zone = min(results)
        return closest_zone
    
    except Exception as e:
        raise RuntimeError(f"Error determining zone type: {e}")

@app.route("/classify_zone")
@login_required
def classify_zone():
    try:
        event_latitude = float(request.args.get('event_latitude'))
        event_longitude = float(request.args.get('event_longitude'))
        zone_type = determine_zone_type(event_latitude, event_longitude)
        return jsonify({'zone_type': zone_type})
    except ValueError as ve:
        return jsonify(error=str(ve)), 400 
    except Exception as e:
        return jsonify(error=str(e)), 500  


@app.route("/get_event_data")
@login_required
def get_event_data():
    event_data = pd.read_csv("data/event_data.csv")
    return event_data.to_json(orient='records')


def fetch_ambulance_data_parallel(event_latitude, event_longitude):
    ambulance_data = pd.read_csv("data/ambulance_data.csv")

    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Create a list to store results
        results = []

        # Fetch ambulance data in parallel for each radius
        for radius in range(1, 6):
            # Create a list of futures for ambulance data within the current radius
            ambulance_futures = [executor.submit(fetch_ambulance_data_single, row, event_latitude, event_longitude, radius) for _, row in ambulance_data.iterrows()]

            # Wait for any ambulance found within the current radius
            for future in concurrent.futures.as_completed(ambulance_futures):
                try:
                    ambulance_json, ambulance_radius = future.result()
                    if ambulance_json is not None:
                        results.append({"ambulance_data": ambulance_json, "radius": ambulance_radius})
                except Exception as e:
                    # print(f"Error processing ambulance data: {e}")
                    pass

        # Return the ambulance if it is available
        if results:
            for result in results:
                if ast.literal_eval(result['ambulance_data'])[3] == "Available":
                    return result

    # Handle the case where no ambulance was found
    return {"ambulance_data": pd.DataFrame().to_json(orient='records'), "radius": None}



def fetch_ambulance_data_single(row, event_latitude, event_longitude, radius):
    if haversine(event_latitude, event_longitude, row['Latitude'], row['Longitude']) <= radius:
        return row.to_json(orient='records'), radius
    else:
        return None


@app.route("/get_ambulance_data")
@login_required
def get_ambulance_data():
    try:
        event_latitude = float(request.args.get('event_latitude'))
        event_longitude = float(request.args.get('event_longitude'))
        ambulance_data_json = fetch_ambulance_data_parallel(event_latitude, event_longitude)

        if ambulance_data_json:
            return jsonify(ambulance_data_json)
        else:
            return pd.DataFrame().to_json(orient='records')

    except Exception as e:
        return jsonify(error=str(e))


@app.route("/get_shortest_path")
@login_required
def get_shortest_path():
    try:
        start_latitude = float(request.args.get('start_latitude'))
        start_longitude = float(request.args.get('start_longitude'))
        end_latitude = float(request.args.get('end_latitude'))
        end_longitude = float(request.args.get('end_longitude'))

        start_location = Point(start_longitude, start_latitude)
        end_location = Point(end_longitude, end_latitude)

        path_finder = ShortestPathFinder()

        # Use parallel processing to find the shortest path
        with concurrent.futures.ThreadPoolExecutor() as executor:
            shortest_path_future = executor.submit(path_finder.find_shortest_path, start_location, end_location)

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
@login_required
def get_hospital_data():
    try: 
        event_latitude = float(request.args.get('event_latitude'))
        event_longitude = float(request.args.get('event_longitude'))
        hospital_data = pd.read_csv("data/hospital_data.csv")
        hospital_data['Distance'] = hospital_data.apply(lambda row: haversine(event_latitude, event_longitude, row['Latitude'], row['Longitude']), axis=1)
        # Find the closest hospital
        closest_hospital = hospital_data.loc[hospital_data['Distance'].idxmin()]
        return ast.literal_eval(closest_hospital.to_json(orient='records'))
    except Exception as e:
        return pd.DataFrame().to_json(orient='records')



@app.route("/generate_pdf", methods=["POST"])
@login_required
def generate_pdf():
    # Retrieve data from the frontend
    data = request.json
    patient_name = data.get('patient_name')
    patient_condition = data.get('patient_condition')

    # Generate PDF using reportlab
    pdf_buffer = BytesIO()
    pdf = canvas.Canvas(pdf_buffer)

    # Add content to the PDF
    pdf.drawString(100, 800, f"Patient Name: {patient_name}")
    pdf.drawString(100, 780, f"Patient Condition: {patient_condition}")

    # Save the PDF to the buffer
    pdf.save()

    # Move buffer position to the beginning
    pdf_buffer.seek(0)

    # Return the generated PDF file to the client
    return send_file(pdf_buffer, as_attachment=True, download_name='patient_report.pdf')


@app.route("/login", methods=["POST", "GET"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["pwd"]
        user = User.query.filter_by(email=email).first()
        if not user:
            flash("That email does not exist, please try again.")
            return redirect(url_for('login'))
        elif not check_password_hash(user.password, password):
            flash('Password incorrect, please try again.')
            return redirect(url_for('login'))
        else:
            login_user(user)
            return redirect(url_for("home"))
    return render_template("login.html")



@app.route("/register", methods=["POST", "GET"])
def register():
    if request.method == "POST":
        if User.query.filter_by(email=request.form["email"]).first():
            # User already exists
            flash("You've already signed up with that email, log in instead!")
            return redirect(url_for('login'))
        first_name = request.form["fname"]
        last_name = request.form["lname"]
        full_name = f"{first_name} {last_name}"
        email = request.form["email"]
        phone_number = request.form["phone"]
        password = request.form["pwd"]
        hashed_password = generate_password_hash(
            password, 
            method='pbkdf2:sha256', 
            salt_length=8
            )
        new_user = User(
            fullname=full_name,
            email=email,
            phone_number = phone_number,
            password=hashed_password
        )
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for("home"))
    return render_template("register.html", current_user=current_user)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))


@app.route("/map")
@login_required
def map():
    if not current_user.is_authenticated:
        return redirect(url_for("login"))
    return render_template("map.html")


@app.route("/aboutus")
def aboutus():
    return render_template("aboutus.html")


@app.route("/gallery")
def gallery():
    return render_template("gallery.html")


@app.route("/services")
def services():
    return render_template("services.html")


@app.route("/contactus")
def contactus():
    return render_template("contactus.html")


@app.route("/")
def home():
    return render_template("home.html", current_user=current_user)

if __name__ == "__main__":
    app.run(debug=True)