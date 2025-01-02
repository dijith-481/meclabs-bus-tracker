from flask import Flask, jsonify
from flask_socketio import SocketIO
import random
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def home():
    return jsonify({"message": "Backend is running!"})

# Simulate real-time bus location updates
def bus_location_simulator():
    while True:
        lat = 10.8505 + random.uniform(-0.01, 0.01)
        lng = 76.2711 + random.uniform(-0.01, 0.01)
        socketio.emit('bus_location', {'lat': lat, 'lng': lng})
        time.sleep(2)  # Simulate data every 2 seconds

@socketio.on('connect')
def handle_connect():
    print('Client connected!')

if __name__ == '__main__':
    socketio.start_background_task(bus_location_simulator)
    socketio.run(app, debug=True)


