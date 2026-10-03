import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

type WeatherCodeEntry = {
  label: string;
  icon: string;
};

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    pressure_msl: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
  timezone: string;
  latitude: number;
  longitude: number;
};

type WeatherResult = WeatherData & {
  locationLabel: string;
};

const WEATHER_CODES: Record<number, WeatherCodeEntry> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Light freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '⛈️' },
};

const DEFAULT_CITY = 'Cairo';

const formatDay = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
};

const getWeatherInfo = (code: number) => WEATHER_CODES[code] || { label: 'Weather update', icon: '🌤️' };

const fetchWeatherByCoordinates = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to load weather data.');
  }

  return (await response.json()) as WeatherData;
};

const fetchWeatherByCity = async (city: string): Promise<WeatherResult> => {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoResponse = await fetch(geoUrl);

  if (!geoResponse.ok) {
    throw new Error('Unable to find city information.');
  }

  const geoData = (await geoResponse.json()) as {
    results?: Array<{ name: string; country?: string; latitude: number; longitude: number }>;
  };

  const result = geoData.results?.[0];

  if (!result) {
    throw new Error('No matching city was found.');
  }

  const weather = await fetchWeatherByCoordinates(result.latitude, result.longitude);

  return {
    ...weather,
    locationLabel: `${result.name}${result.country ? `, ${result.country}` : ''}`,
  };
};

export default function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDefaultWeather = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWeatherByCity(DEFAULT_CITY);
      setWeather(result);
      setQuery('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentLocationWeather = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission was not granted.');
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const data = await fetchWeatherByCoordinates(location.coords.latitude, location.coords.longitude);

      setWeather({
        ...data,
        locationLabel: 'Your location',
      });
      setQuery('');
    } catch (loadError) {
      Alert.alert(
        'Location unavailable',
        'We could not access your location, so the app will show Cairo weather instead.',
      );
      await loadDefaultWeather();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      await loadDefaultWeather();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWeatherByCity(trimmed);
      setWeather(result);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'City not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentLocationWeather();
  }, []);

  const current = weather?.current;
  const dailyForecast = weather?.daily;
  const currentInfo = current ? getWeatherInfo(current.weather_code) : null;

  return (
    <LinearGradient colors={['#081A2A', '#113A5D', '#1B5F8A']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#081A2A" />

        <View style={styles.container}>
          <View style={styles.searchContainer}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search city"
              placeholderTextColor="#B9D3E6"
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading weather...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {weather && current && currentInfo ? (
                <>
                  <View style={styles.headerRow}>
                    <Text style={styles.locationText}>{weather.locationLabel}</Text>
                    <Pressable onPress={loadCurrentLocationWeather}>
                      <Text style={styles.locationButton}>Use my location</Text>
                    </Pressable>
                  </View>

                  <View style={styles.mainCard}>
                    <Text style={styles.weatherIcon}>{currentInfo.icon}</Text>
                    <Text style={styles.temperature}>{Math.round(current.temperature_2m)}°</Text>
                    <Text style={styles.condition}>{currentInfo.label}</Text>
                    <Text style={styles.feelsLike}>Feels like {Math.round(current.apparent_temperature)}°</Text>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Humidity</Text>
                      <Text style={styles.statValue}>{current.relative_humidity_2m}%</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Wind</Text>
                      <Text style={styles.statValue}>{Math.round(current.wind_speed_10m)} km/h</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Pressure</Text>
                      <Text style={styles.statValue}>{Math.round(current.pressure_msl)} hPa</Text>
                    </View>
                  </View>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>7-Day Forecast</Text>
                    {dailyForecast?.time.slice(0, 7).map((day, index) => {
                      const dayWeather = getWeatherInfo(dailyForecast.weather_code[index]);
                      const maxTemp = Math.round(dailyForecast.temperature_2m_max[index]);
                      const minTemp = Math.round(dailyForecast.temperature_2m_min[index]);

                      return (
                        <View key={day} style={styles.forecastRow}>
                          <Text style={styles.forecastDay}>{formatDay(day)}</Text>
                          <Text style={styles.forecastIcon}>{dayWeather.icon}</Text>
                          <Text style={styles.forecastCondition}>{dayWeather.label}</Text>
                          <Text style={styles.forecastTemps}>{maxTemp}° / {minTemp}°</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  searchButton: {
    backgroundColor: '#5FD1FF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  searchButtonText: {
    color: '#021B2D',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#E7F5FF',
    fontSize: 18,
  },
  errorText: {
    color: '#FFD4D4',
    fontSize: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  locationText: {
    color: '#F5FBFF',
    fontSize: 24,
    fontWeight: '700',
    maxWidth: '66%',
  },
  locationButton: {
    color: '#9FE3FF',
    fontSize: 12,
    fontWeight: '600',
  },
  mainCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  weatherIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  temperature: {
    fontSize: 78,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 78,
  },
  condition: {
    color: '#DEF6FF',
    fontSize: 20,
    marginTop: 8,
  },
  feelsLike: {
    color: '#C3E8FF',
    fontSize: 14,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    color: '#CBEAFF',
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionContainer: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  forecastDay: {
    flex: 1.2,
    color: '#F2FAFF',
    fontWeight: '700',
  },
  forecastIcon: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
  },
  forecastCondition: {
    flex: 2,
    color: '#D9F2FF',
    fontSize: 12,
  },
  forecastTemps: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
