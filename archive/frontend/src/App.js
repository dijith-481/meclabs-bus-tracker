import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const App = () => {
  const [busLocation, setBusLocation] = useState({ lat: 10.8505, lng: 76.2711 }); // Default location

  useEffect(() => {
    // Connect to the Flask backend via WebSocket
    const socket = io('http://127.0.0.1:5000'); // Replace with your backend URL if deployed
    socket.on('bus_location', (data) => {
      console.log('Received bus location:', data);
      setBusLocation(data); // Update state with new location
    });

    // Cleanup on unmount
    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      <MapContainer
        center={busLocation}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* Marker for bus location */}
        <Marker position={busLocation} />
      </MapContainer>
    </div>
  );
};

export default App;
