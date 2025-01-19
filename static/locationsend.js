let busName = null;
let currentRandomLatitude = createRandomLocation(true);
let currentRandomLongitude = createRandomLocation(false);
let watchId = null;
let randomLocationIntervalId = null;
let sender_id = null;
let bearing = Math.random() * 2 * Math.PI;
let speed = 10;
timeInterval = 2000;
function createRandomLocation(isLatitue) {
  const minLatitude = 9.3;
  const maxLatitude = 10.6;
  const minLongitude = 76.2;
  const maxLongitude = 76.5;
  let minvalue = 0;
  let maxvalue = 0;
  if (isLatitue) {
    minvalue = minLatitude;
    maxvalue = maxLatitude;
  } else {
    minvalue = minLongitude;
    maxvalue = maxLongitude;
  }
  return minvalue + Math.random() * (maxvalue - minvalue);
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("randomLocation").addEventListener("click", () => {
    document.getElementById("randomLocation").classList.add("hidden");
    if (watchId) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentRandomLatitude = position.coords.latitude;
          currentRandomLongitude = position.coords.longitude;
        },
        () => {},
      );

      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (!randomLocationIntervalId)
      randomLocationIntervalId = setInterval(sendLocation, timeInterval);
    errorCallback(navigator.geolocation);
  });

  document.getElementById("setBusName").addEventListener("click", () => {
    busName = document.getElementById("busName").value;
    if (busName) {
      document.getElementById("status").textContent =
        "Bus name set to: " + busName;
      getSenderId(busName);
      document.getElementById("randomLocation").classList.remove("hidden");
      document.getElementById("setBusName").classList.add("hidden");
    } else {
      document.getElementById("status").textContent =
        "Please enter a bus name.";
    }
  });

  getLocationRepeatedly();
});

function getLocationRepeatedly() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(sendLocation, errorCallback);
    watchId = navigator.geolocation.watchPosition(sendLocation, errorCallback, {
      enableHighAccuracy: true,
    });
  } else {
    document.getElementById("status").textContent =
      "Geolocation is not supported by this browser.";
  }
}

async function getSenderId(busName) {
  try {
    const registerResponse = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ busName: busName }),
    });
    const { connection_id } = await registerResponse.json();
    sender_id = connection_id;
    sendLocation();
  } catch (error) {
    document.getElementById("status").textContent =
      `Error updating location: ${error} `;

    console.error("Error:", error);
  }
}
function sendLocation(position = null) {
  const data = position ? getLocation(position) : getRandomLocation();
  console.log(data);

  fetch("/update_location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("status").textContent =
        `Location updated: ${JSON.stringify(data)} at time ${new Date().toLocaleTimeString()}`;
    })
    .catch((error) => {
      document.getElementById("status").textContent =
        `Error updating location: ${error} at time ${new Date().toLocaleTimeString()}`;
      console.error("Error:", error);
    });
}

function errorCallback(error) {
  document.getElementById("status").textContent =
    `Error getting location: ${error.message} at time ${new Date().toLocaleTimeString()}`;
  console.error("Geolocation error:", error);
}
function getRandomLocation() {
  bearing += (Math.random() - 0.5) * 0.5;
  if (currentRandomLongitude < 9.35) {
    bearing *= -1;
  }
  speed = Math.random() * 20;
  const distance = (speed * timeInterval) / 1000;
  const earthRadius = 6371000;
  const latChange =
    (distance / earthRadius) * (180 / Math.PI) * Math.cos(bearing);
  const lonChange =
    ((distance / earthRadius) * (180 / Math.PI) * Math.sin(bearing)) /
    Math.cos((currentRandomLatitude * Math.PI) / 180);

  currentRandomLatitude += latChange;
  currentRandomLongitude += lonChange;
  const timestamp = Date.now();

  console.log(currentRandomLongitude);
  return {
    sender_id: sender_id,
    latitude: currentRandomLatitude,
    longitude: currentRandomLongitude,
    timestamp: timestamp,
  };
}
function getLocation(position) {
  return {
    sender_id: sender_id,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: position.coords.timestamp,
  };
}
