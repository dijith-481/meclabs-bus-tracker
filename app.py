import os
import shutil
import threading
import time
import uuid

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO

# from flask_session import Session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
# Session(app)


app.config["TEMP_FOLDER"] = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "temp"
)
if not os.path.exists(app.config["TEMP_FOLDER"]):
    os.makedirs(app.config["TEMP_FOLDER"])

connection_data = {}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/live_bus_locations")
def live_bus_locations():
    return render_template("index.html")


@app.route("/send_location")
def send_location():
    return render_template("locationsend.html")


@app.route("/register", methods=["POST"])
def register_connection():
    data = request.get_json()
    bus_name = data.get("busName")
    if not bus_name:
        return jsonify({"error": "busName is required"}), 400
    connection_id = str(uuid.uuid4())
    connection_data[connection_id] = {"bus_name": bus_name, "time": time.time()}
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
        connection_data[sender_id]["time"] = time.time()

        return jsonify({"message": "Location updated"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/locationsend")
def location_sender():
    print("locationsend acessed")
    return render_template("index.html")


# @socketio.on("connect")
# def handle_connect():
#     locations = get_all_latest_locations()
#     socketio.emit("locations_update", locations)


@socketio.on("get_latest_locations")
def handle_get_latest_locations():
    locations = get_all_latest_locations()
    socketio.emit("locations_update", locations)


@socketio.on("get_available_buses")
def handle_get_available_buses():
    buses = get_buses()
    socketio.emit("available_buses", buses)


def get_buses():
    buses = {}

    for connection_id, values in connection_data.items():
        buses[connection_id] = {"bus_name": values["bus_name"]}
    return buses


def send_location_updates():
    while True:
        locations = get_all_latest_locations()
        socketio.emit("locations_update", locations)
        time.sleep(2)


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
    for sender_id, values in connection_data.items():
        try:

            location = get_latest_location_from_log(sender_id)
            bus_name = values["bus_name"]
            if location and bus_name:
                all_locations[sender_id] = {"location": location, "bus_name": bus_name}
        except Exception as e:
            print(e, "error")
            pass

    return all_locations


@socketio.on("bus_location_request")
def bus_location_request(data):
    busId = data.get("busId")
    bus_data = get_bus_locations_history(busId)
    socketio.emit(f"location_{busId}", bus_data)


def get_bus_locations_history(sender_id):
    sender_dir = os.path.join(app.config["TEMP_FOLDER"], str(sender_id))
    log_filepath = os.path.join(sender_dir, "location_log.txt")

    if os.path.exists(log_filepath):
        try:
            with open(log_filepath, "r") as f:
                lines = f.readlines()
                data = []
                if lines:
                    for i, line in enumerate(lines):
                        if i == 0:
                            continue
                        latitude, longitude, timestamp_str = line.split(",")
                        data.append([float(latitude), float(longitude)])
                    return data
        except (FileNotFoundError, ValueError, IndexError):

            return None

    return None


def clear_temp_folder():
    temp_folder = app.config["TEMP_FOLDER"]
    for filename in os.listdir(temp_folder):
        file_path = os.path.join(temp_folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")


def delete_inactive_directories(inactive_threshold=600):
    while True:
        print("deleting")
        current_time = time.time()
        dirs_to_delete = []

        for dir_path, values in connection_data.items():
            last_activity = values["time"]
            if current_time - last_activity > inactive_threshold:
                dirs_to_delete.append(dir_path)

        for dir_path in dirs_to_delete:
            full_path = os.path.join(app.config["TEMP_FOLDER"], dir_path)
            try:
                shutil.rmtree(full_path)
                del connection_data[dir_path]
                print(f"Deleted inactive directory: {dir_path}")
            except OSError as e:
                print(f"Error deleting directory {dir_path}: {e}")

        time.sleep(600)


if __name__ == "__main__":

    socketio.start_background_task(send_location_updates)
    clear_temp_folder()
    cleanup_thread = threading.Thread(target=delete_inactive_directories, daemon=True)
    cleanup_thread.start()

    socketio.run(app, debug=True, ssl_context="adhoc", host="0.0.0.0")
