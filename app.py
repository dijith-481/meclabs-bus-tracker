import os
import random
import time
import uuid

from flask import Flask, jsonify, render_template, request, session
from flask_apscheduler import APScheduler
from flask_socketio import SocketIO

from flask_session import Session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)


scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()
connection_data = {}


app.config["TEMP_FOLDER"] = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "temp"
)
if not os.path.exists(app.config["TEMP_FOLDER"]):
    os.makedirs(app.config["TEMP_FOLDER"])

TEMP_FILE_TIMEOUT = 900


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/send_location")
def send_location():
    return render_template("locationsend.html")


@app.route("/register", methods=["POST"])
def register_connection():
    data = request.get_json()
    bus_name = data.get("busName")
    print(bus_name, "busname")
    if not bus_name:
        return jsonify({"error": "busName is required"}), 400
    connection_id = str(uuid.uuid4())
    connection_data[connection_id] = bus_name
    return jsonify({"connection_id": connection_id}), 201


# updates the location of the sender
@app.route("/update_location", methods=["POST"])
def update_location():
    try:
        data = request.get_json()
        sender_id = data["sender_id"]
        latitude = data["latitude"]
        longitude = data["longitude"]
        timestamp = data.get("timestamp", time.time())

        sender_dir = os.path.join(app.config["TEMP_FOLDER"], str(sender_id))
        if not os.path.exists(sender_dir):
            os.makedirs(sender_dir)
        filepath = os.path.join(sender_dir, "location_log.txt")
        with open(filepath, "a") as f:
            log_entry = f"{latitude},{longitude},{timestamp}\n"
            f.write(log_entry)

        return jsonify({"message": "Location updated"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/locationsend")
def location_sender():
    print("locationsend acessed")
    return render_template("index.html")


# Simulate real-time bus location updates
def bus_location_simulator():
    while True:
        lat = 10.8505 + random.uniform(-0.01, 0.01)
        lng = 76.2711 + random.uniform(-0.01, 0.01)
        socketio.emit("bus_location", {"lat": lat, "lng": lng})
        time.sleep(2)  # Simulate data every 2 seconds


@socketio.on("connect")
def handle_connect():
    locations = get_all_latest_locations()
    socketio.emit("locations_update", locations)


@socketio.on("get_latest_locations")
def handle_get_latest_locations():
    locations = get_all_latest_locations()
    socketio.emit("locations_update", locations)


def send_location_updates():
    while True:
        locations = get_all_latest_locations()
        socketio.emit("locations_update", locations)
        time.sleep(5)


def get_latest_location_from_log(sender_id):
    sender_dir = os.path.join(app.config["TEMP_FOLDER"], str(sender_id))
    log_filepath = os.path.join(sender_dir, "location_log.txt")

    if os.path.exists(log_filepath):
        try:
            with open(log_filepath, "r") as f:
                lines = f.readlines()
                if lines:
                    last_line = lines[-1].strip()
                    latitude, longitude, timestamp_str = last_line.split(",")
                    timestamp = float(timestamp_str)
                    return {
                        "latitude": float(latitude),
                        "longitude": float(longitude),
                        "timestamp": timestamp,
                    }
        except (FileNotFoundError, ValueError, IndexError):

            return None

    return None


def get_all_latest_locations():
    all_locations = {}

    for sender_dir in os.listdir(app.config["TEMP_FOLDER"]):
        try:
            sender_id = sender_dir

            location = get_latest_location_from_log(sender_id)

            bus_name = connection_data[sender_id]
            if location and bus_name:
                all_locations[sender_id] = {"location": location, "bus_name": bus_name}
        except Exception as e:
            print(e)
            pass
    print(all_locations, "164")

    return all_locations


if __name__ == "__main__":
    import threading

    location_thread = threading.Thread(target=send_location_updates)
    location_thread.daemon = True
    location_thread.start()

    socketio.run(app, debug=True, ssl_context="adhoc", host="0.0.0.0")
