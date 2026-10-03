# WeatherFlow

WeatherFlow is a modern weather app built with React Native + Expo.

This app does not use fake data. It fetches real weather data from the Open-Meteo API and geocoding API.

## Features
- Current weather for your location or a search city
- Temperature, humidity, pressure, and wind speed
- 7-day forecast
- City search by name
- Clean dark UI with responsive layout

## Tech stack
- React Native
- Expo
- Open-Meteo API
- expo-location
- expo-linear-gradient

## Run locally

1. Install dependencies
   ```bash
   npm install
   ```

2. Start the app
   ```bash
   npm start
   ```

3. Run Android or iOS
   ```bash
   npm run android
   # or
   npm run ios
   ```

## Important note
The app uses real-time weather data from Open-Meteo, including geocoding and forecast endpoints. No mock or static weather values are used.
