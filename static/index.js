let selectedBus = null;
let isAllBusView = true;
let polyLines = {};
let busMarkers = {};
let busId = null;
let locationHistoryInterval = null;
let busInitialLatLng = null;
let busFinalLatLng = null;
let userLatLng = null;
const socket = io();
let watchId = null;
let busMissed = null;
let busMissCheckId = null;
let map;
document.addEventListener("DOMContentLoaded", function () {
  socket.on("connect", function () {
    console.log("Connected to server");
    socket.emit("get_available_buses");
    socket.emit("get_latest_locations");
  });
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
  getUserLocation();
  socket.on("available_buses", (buses) => {
    handleAvailableBuses(buses);
  });

  document.getElementById("bus-select").addEventListener("change", (event) => {
    busMissed = null;

    if (event.target.value !== "clear") {
      busId = event.target.value;
    }
    busMarkers[busId]
      .getPopup()
      .setContent(
        `Time: ${new Date(location.timestamp).toLocaleString()}<br>Checking if bus is missed ....`,
      );
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
      marker.setLatLng(latlng);
      marker.addEventListener("click", () => {
        busMissed = null;
        busMarkers[id]
          .getPopup()
          .setContent(
            `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}<br>Checking if bus is missed ....`,
          );
        const busSelect = document.getElementById("bus-select");
        busSelect.value = busId;
        busId = id;
        handleBusSelection(busId);
      });

      if (isPolyline) {
        polyLines[id].addLatLng(latlng);
      } else {
        if (busMissed && busMissCheckId == busId) {
          marker
            .getPopup()
            .setContent(
              `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}<br>${busMissed}`,
            );
        } else {
          marker
            .getPopup()
            .setContent(
              `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}<br>Checking if bus is missed....`,
            );
        }

        // marker
        //   .getPopup()
        //   .setContent(
        //     `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}<br>click to see route`,
        //   );
      }
    } else {
      console.log("Bus", id, "no longer in service.");

      delete busMarkers[id];
    }
  } else {
    if (!isAllBusView) return;
    marker = L.marker(latlng).addTo(map);
    marker
      .bindPopup(
        `Bus ${bus_name}<br>Time: ${new Date(location.timestamp).toLocaleString()}<br>click to see route`,
      )
      .openPopup();
    busMarkers[id] = marker;
    // if (Object.keys(busMarkers).length === 1)
    map.setView(latlng);
  }
}

function updateBusLocations(locations) {
  console.log("location recieved");
  if (!isAllBusView) {
    const { location, bus_name } = locations[busId];
    const latlng = [location.latitude, location.longitude];
    busFinalLatLng = latlng;
    busMissed = checkIfMissedBus();
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

  busInitialLatLng = latlngs[0];
  busFinalLatLng = latlngs[latlngs.length - 1];

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
    // map.setView(busMarkers[busId].getLatLng(), 13);
  }
  busMissed = checkIfMissedBus();
}

function fitBoundsToMarkers() {
  if (busMarkers.length === 0) {
    return;
  } else if (busMarkers.length === 1) {
    const [singleMarker] = busMarkers;
    map.setView(singleMarker);
  }
  const group = new L.featureGroup(busMarkers);
  if (group.getBounds().isValid()) {
    const zoom = map.zoom;
    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [0, 200],
      paddingBottomRight: [50, 50],
    });
    // map.setView(map.getLatLng(), zoom);
  }
}

function handleAvailableBuses(buses) {
  const busSelect = document.getElementById("bus-select");
  const noBusDialog = document.getElementById("no-bus-dialog");
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

function checkIfMissedBus() {
  if (!(userLatLng && busFinalLatLng && busInitialLatLng)) return;
  const busDirectionX = Number(busFinalLatLng[1]) - Number(busInitialLatLng[1]);
  const busDirectionY = Number(busFinalLatLng[0]) - Number(busInitialLatLng[0]);

  const userVectorX = Number(userLatLng[1]) - Number(busInitialLatLng[1]);
  const userVectorY = Number(userLatLng[0]) - Number(busInitialLatLng[0]);

  const dotProduct = busDirectionX * userVectorX + busDirectionY * userVectorY;

  busMissCheckId = busId;
  if (dotProduct < 0) {
    return "Wrong Route";
  } else if (
    dotProduct >
    busDirectionX * busDirectionX + busDirectionY * busDirectionY
  ) {
    return "Awaiting Arrival";
  } else {
    return "Missed Bus";
  }
}
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(saveUserLocation, askForLocation);
  } else {
    document.getElementById("status").textContent =
      "Geolocation is not supported by this browser.";
  }
}
function saveUserLocation(position) {
  userLatLng = [position.coords.latitude, position.coords.longitude];

  userMarker = L.circleMarker(userLatLng, {
    radius: 10,
    color: "blue",
    fillColor: "blue",
    fillOpacity: 0.5,
  }).addTo(map);
}
function errorCallback(error) {
  askForLocation();
  document.getElementById("status").textContent =
    `Error getting location: ${error.message} at time ${new Date().toLocaleTimeString()}`;
  console.error("Geolocation error:", error);
}

function askForLocation() {
  const lat = parseFloat(prompt("Enter your latitude:"));
  const lng = parseFloat(prompt("Enter your longitude:"));

  if (!isNaN(lat) && !isNaN(lng)) {
    userLatLng = [lat, lng];

    userMarker = L.circleMarker(userLatLng, {
      radius: 10,
      color: "blue",
      fillColor: "blue",
      fillOpacity: 0.5,
    }).addTo(map);
  } else {
    alert("Invalid coordinates. Please enter numeric values.");
  }
}
