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
    console.log(buses);
    handleAvailableBuses(buses);
  });

  socket.emit("get_available_buses");

  document.getElementById("bus-select").addEventListener("change", (event) => {
    console.log(event.target.value);
    if (event.target.value !== "clear") {
      busId = event.target.value;
    }
    handleBusSelection(event.target.value);
  });
  socket.on("locations_update", (locations) => {
    updateBusLocations(locations);
  });
});
function handleSingleBusLocationUpdate(busData, id, isPolyline = false) {
  const { location, bus_name } = busData;

  if (!location) {
    console.warn(`No location data received for bus ${busId}`);
    return;
  }

  const latlng = [location.latitude, location.longitude];

  let marker = busMarkers[id];

  if (marker) {
    if (map.hasLayer(marker)) {
      if (isPolyline) {
        polyLines[id].addLatLng(latlng);
      }
      marker.setLatLng(latlng);
      marker.addEventListener("click", () => {
        console.log("bus");
        const busSelect = document.getElementById("bus-select");
        console.log(busSelect);
        busSelect.value = busId;
        console.log(busSelect.value);
        busId = id;
        handleBusSelection(busId);
      });
      marker
        .getPopup()
        .setContent(
          `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
        );
    } else {
      console.log("Bus", id, "no longer in service.");

      delete busMarkers[id];
    }
  } else {
    marker = L.marker(latlng).addTo(map);
    marker
      .bindPopup(
        `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}`,
      )
      .openPopup();
    busMarkers[id] = marker;
    console.log(Object.keys(busMarkers).length);
    // if (Object.keys(busMarkers).length === 1)
    map.setView(latlng);
  }
}

function updateBusLocations(locations) {
  console.log(busId, locations[busId]);
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
  // if (busMarkers[busId]) {
  //   busMarkers[busId].remove();
  // }
  if (polyLines[busId]) {
    polyLines[busId].remove();
  }
  const latlngs = data.map((location) => [location[0], location[1]]);
  const polyline = L.polyline(latlngs, { color: "blue", weight: 5 }).addTo(map);
  polyLines[busId] = polyline;

  const lastLocation = data[data.length - 1];

  busMarkers[busId].setLatLng([lastLocation[0], lastLocation[1]]);
  busMarkers[busId].openPopup();

  // if (lastLocation) {
  //   const marker = L.marker([lastLocation[0], lastLocation[1]]).addTo(map);
  // busMarkers[busId] = marker;
  //   marker.bindPopup(busId);
  // }

  if (data.length > 0) {
    map.fitBounds(polyline.getBounds(), {
      paddingTopLeft: [100, 200], // Increase top padding
      paddingBottomRight: [100, 100],
    });
    map.setView(busMarkers[busId].getLatLng(), 13);
  }
}

function fitBoundsToMarkers() {
  if (busMarkers.length === 0) {
    return;
  } else if (busMarkers.length === 1) {
    const [singleMarker] = busMarkers;
    map.setView(singleMarker);
  }
  const group = new L.featureGroup(busMarkers);
  console.log(group);
  if (group.getBounds().isValid()) {
    console.log("group is valid");
    const zoom = map.zoom;
    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [0, 200],
      paddingBottomRight: [50, 50],
    });
    map.setView(map.getLatLng(), zoom);
  }
}

function handleAvailableBuses(buses) {
  const busSelect = document.getElementById("bus-select");
  const noBusDialog = document.getElementById("no-bus-dialog");
  console.log(Object.keys(buses).length === 0);
  if (Object.keys(buses).length === 0) {
    busSelect.classList.add("hidden");
    noBusDialog.classList.remove("hidden");
  } else {
    noBusDialog.classList.add("hidden");
    busSelect.classList.remove("hidden");
    busSelect.innerHTML = "";
  }
  for (const busId in buses) {
    const bus = buses[busId];
    const option = document.createElement("option");
    option.value = busId;
    option.textContent = bus.bus_name;
    busSelect.appendChild(option);
  }
}
function handleBusSelection(busId) {
  if (busId === "clear") {
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
