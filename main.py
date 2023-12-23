from flask import Flask, render_template
import pandas as pd


app = Flask(__name__)


@app.route("/get_event_data")
def get_event_data():
    event_data = pd.read_csv("data/event_data.csv")
    return event_data.to_json(orient='records')


@app.route("/get_ambulance_data")
def get_ambulance_data():
    ambulance_data = pd.read_csv("data/ambulance_data.csv")
    return ambulance_data.to_json(orient='records')

@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)