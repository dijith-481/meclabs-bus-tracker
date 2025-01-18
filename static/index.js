document.addEventListener("DOMContentLoaded", function () {
  const socket = io();
  const map = L.map("map").setView([37.7749, -122.4194], 13); // Default location (San Francisco)

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const busMarkers = {};

  socket.on("connect", () => {
    console.log("Connected to server");
    socket.emit("get_latest_locations");
  });

  socket.on("locations_update", (locations) => {
    if (map) {
      // Check if map is initialized
      for (const busId in locations) {
        const location = locations[busId].location;
        const busName = locations[busId].bus_name;
        console.log("location:", location);
        const latlng = [location.latitude, location.longitude];
        console.log("latlng:", latlng);

        if (busMarkers[busId] && map.hasLayer(busMarkers[busId])) {
          busMarkers[busId].setLatLng(latlng);
          if (busMarkers[busId]._popup) {
            busMarkers[busId]
              .getPopup()
              .setContent(
                `Bus ${busName}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
              );
          } else {
            busMarkers[busId]
              .bindPopup(
                `Bus ${busName}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
              )
              .openPopup();
          }
        } else if (busMarkers[busId]) {
          console.log("Bus", busId, "no longer in service.");
          delete busMarkers[busId];
        } else {
          busMarkers[busId] = L.marker(latlng).addTo(map);
          busMarkers[busId]
            .bindPopup(
              `Bus ${busName}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
            )
            .openPopup();
        }
      }

      for (const busId in busMarkers) {
        //remove markers
        if (!(busId in locations)) {
          map.removeLayer(busMarkers[busId]);
          delete busMarkers[busId];
        }
      }
    }
  });
});
