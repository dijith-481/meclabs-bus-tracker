# MECLABS Bus Tracker

This project aims to provide real-time bus tracking information to help users determine if they've missed their bus or not. It achieves this by utilizing live location sharing from a sender website (installed on the bus) and displaying the bus's location on a main website using OpenStreetMap.

**This project is currently in its early stages of development.**

<https://meclabs-bus-tracker.onrender.com/>

## Features

- **Real-time bus tracking:** See the current location of the bus on a map.
- **OpenStreetMap integration:** Uses OpenStreetMap for accurate and up-to-date map rendering.
- **Simple and intuitive interface:** Easy to use.

## Technologies Used

- **Flask (Python):** Backend framework for both the sender and main websites.
- **OpenStreetMap:** Map rendering.

## Requirements

```bash
python3
```

## Installation

clone this repository
and open it

```bash
 git clone https://github.com/dijith-481/meclabs-bus-tracker.git  && cd meclabs-bus-tracker
```

install necessary packages

```bash
python3 -m venv .venv
. ./bin/activate
pip install -r requirements.txt

```

```bash
# to setup secure connection
#only for testing
 openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365
# use gunicorn and eventlet
 gunicorn   --certfile=cert.pem --keyfile=key.pem  --worker-class eventlet -w 1 app:app

```

## Usage

- **Sender Website:** The sender application running on the bus will periodically send the bus's location to the main website.
- **Main Website:** Users can access the main website through their web browser to view the bus's location on the map.

## Future Development

- Implement sender authentication.
- Add estimated time of arrival (ETA) calculations.
- Improve UI/UX.
- Implement database storage
- Use other data to improve reliability
- Optimization
- Migration to TypeScript for better error handling

[Learn More](https://meclabs-bus-tracker.onrender.com)

## Disclaimer

This project is in its early stages and may have bugs or incomplete features. Use at your own risk.
