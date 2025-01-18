# MECLABS Bus Tracker

This project aims to provide real-time bus tracking information to help users determine if they've missed their bus or not. It achieves this by utilizing live location sharing from a sender website (installed on the bus) and displaying the bus's location on a main website using OpenStreetMap.

**This project is currently in its early stages of development.**

## Features

- **Real-time bus tracking:** See the current location of the bus on a map.
- **OpenStreetMap integration:** Uses OpenStreetMap for accurate and up-to-date map rendering.
- **Simple and intuitive interface:** Easy to use.

## Technologies Used

- **Flask (Python):** Backend framework for both the sender and main websites.
- **OpenStreetMap:** Map rendering.

## Installation

## Requirements

```bash
python
Flask
FlaskSocketIO

```

clone this repository
and open it

```bash
cd meclabs-bus-tracker
```

install necessary packages

```bash
python3 -m venv .venv
. ./bin/activate
pip install -r requirements.txt

```

```bash
python3 app.py # using 'flask run' may not work properly
```

## Usage

- **Sender Website:** The sender application running on the bus will periodically send the bus's location to the main website.
- **Main Website:** Users can access the main website through their web browser to view the bus's location on the map.

## Future Development

- Implement sender authentication.
- Add estimated time of arrival (ETA) calculations.
- Improve UI/UX.
- Implement database storage
- Use other data to improve relaiability

## Disclaimer

This project is in its early stages and may have bugs or incomplete features. Use at your own risk.
