let selectedBus = null;
let isAllBusView = true;
let polyLines = {};
let busMarkers = {};
let busId = null;
locationHistoryInterval = null;
const socket = io();
let map;
document.addEventListener("DOMContentLoaded", function () {
  map = L.map("map").setView([10.0284, 76.3285], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // socket.on("connect", () => {
  //   console.log("Connected to server");
  //   socket.emit("get_latest_locations");
  //   socket.emit("");
  // });
  socket.on("available_buses", (buses) => {
    handleAvailableBuses(buses);
  });

  socket.emit("get_available_buses");

  document.getElementById("bus-select").addEventListener("click", (event) => {
    socket.emit("get_available_buses");
  });
  document.getElementById("bus-select").addEventListener("change", (event) => {
    socket.emit("get_available_buses");
    handleBusSelection(event);
  });
  socket.on("locations_update", (locations) => {
    updateBusLocations(locations);
  });
});
function handleSingleBusLocationUpdate(busData, busId, isPolyline = false) {
  const { location, bus_name } = busData;

  if (!location) {
    console.warn(`No location data received for bus ${busId}`);
    return;
  }

  const latlng = [location.latitude, location.longitude];

  let marker = busMarkers[busId];

  if (marker) {
    if (map.hasLayer(marker)) {
      if (isPolyline) {
        polyLines[busId].addLatLng(latlng);
      }
      marker.setLatLng(latlng);
      marker
        .getPopup()
        .setContent(
          `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
        );
    } else {
      console.log("Bus", busId, "no longer in service.");

      delete busMarkers[busId];
    }
  } else {
    marker = L.marker(latlng).addTo(map);
    marker
      .bindPopup(
        `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
      )
      .openPopup();
    busMarkers[busId] = marker;
  }
}

function updateBusLocations(locations) {
  if (!isAllBusView) {
    handleSingleBusLocationUpdate(locations[busId], busId, true);
  }
  if (map) {
    for (const busId in locations) {
      handleSingleBusLocationUpdate(locations[busId], busId);
    }
    for (const busId in busMarkers) {
      if (!(busId in locations)) {
        map.removeLayer(busMarkers[busId]);
        delete busMarkers[busId];
      }
    }
  }
}

function busLocationHistoryUpdate(data) {
  if (busMarkers[busId]) {
    busMarkers[busId].remove();
  }
  if (polyLines[busId]) {
    polyLines[busId].remove();
  }
  const latlngs = data.map((location) => [location[0], location[1]]);
  const polyline = L.polyline(latlngs, { color: "blue" }).addTo(map);
  polyLines[busId] = polyline;

  const lastLocation = data[data.length - 1];

  // if (lastLocation) {
  //   const marker = L.marker([lastLocation[0], lastLocation[1]]).addTo(map);
  //   busMarkers[busId] = marker;
  //   marker.bindPopup(busId);
  // }

  if (data.length > 0) {
    map.fitBounds(polyline.getBounds());
  }
}

function fitBoundsToMarkers() {
  if (busMarkers.length === 0) {
    return;
  }
  const group = new L.featureGroup(busMarkers);
  map.fitBounds(group.getBounds());
}

function handleAvailableBuses(buses) {
  const busSelect = document.getElementById("bus-select");
  console.log(Object.keys(buses).length === 0);
  if (Object.keys(buses).length === 0) {
    busSelect.innerHTML = '<option value="all">No buses available</option>';
  } else busSelect.innerHTML = '<option value="all">all Buses</option>';
  for (const busId in buses) {
    const bus = buses[busId];
    const option = document.createElement("option");
    option.value = busId;
    option.textContent = bus.bus_name;
    busSelect.appendChild(option);
  }
}
function handleBusSelection(event) {
  busId = event.target.value;
  if (busId === "all") {
    isAllBusView = true;
    for (id in polyLines) {
      const polyLine = polyLines[id];
      map.removeLayer(polyLine);
    }
    polyLines = {};
    fitBoundsToMarkers();
  } else {
    isAllBusView = false;
    socket.emit("bus_location_request", { busId: busId });
    socket.on(`location_${busId}`, (data) => busLocationHistoryUpdate(data));
  }
}
