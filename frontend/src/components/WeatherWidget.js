import React, { useState, useEffect } from 'react';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Using OpenWeatherMap API - you need to add REACT_APP_WEATHER_API_KEY
        const API_KEY = process.env.REACT_APP_WEATHER_API_KEY || 'demo_key';
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Grabow,DE&appid=${API_KEY}&units=metric&lang=de`
        );
        
        if (!response.ok) {
          throw new Error('Weather data unavailable');
        }
        
        const data = await response.json();
        setWeather(data);
        setLoading(false);
      } catch (err) {
        // Fallback to mock data for demo
        setWeather({
          name: "Grabow",
          main: {
            temp: 18,
            feels_like: 20,
            humidity: 65,
            pressure: 1013
          },
          weather: [{
            main: "Clouds",
            description: "leicht bewölkt",
            icon: "02d"
          }],
          wind: {
            speed: 3.2,
            deg: 225
          },
          visibility: 10000,
          dt: Date.now() / 1000
        });
        setLoading(false);
        setError('Demo-Wetterdaten');
      }
    };

    fetchWeather();
    // Update every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (iconCode, description) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  };

  const getFarmingAdvice = (temp, humidity, windSpeed) => {
    if (temp < 5) return { text: "Zu kalt für Feldarbeiten", color: "text-blue-600" };
    if (temp > 30) return { text: "Sehr heiß - Bewässerung empfohlen", color: "text-red-600" };
    if (humidity > 80) return { text: "Hohe Luftfeuchtigkeit - Pilzgefahr", color: "text-yellow-600" };
    if (windSpeed > 6) return { text: "Starker Wind - Spritzarbeiten vermeiden", color: "text-orange-600" };
    return { text: "Gute Bedingungen für Feldarbeiten", color: "text-green-600" };
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-4 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-white bg-opacity-30 rounded mb-2"></div>
          <div className="h-8 bg-white bg-opacity-30 rounded"></div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-gray-600">Wetterdaten nicht verfügbar</p>
      </div>
    );
  }

  const advice = getFarmingAdvice(weather.main.temp, weather.main.humidity, weather.wind.speed);

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">🌾 Wetter Grabow</h3>
          <p className="text-sm opacity-90">39291, Deutschland</p>
        </div>
        <div className="text-right">
          <div className="text-2xl">{getWeatherIcon(weather.weather[0].icon)}</div>
          <p className="text-sm capitalize">{weather.weather[0].description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-3xl font-bold">{Math.round(weather.main.temp)}°C</div>
          <div className="text-sm opacity-90">Gefühlt {Math.round(weather.main.feels_like)}°C</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <span className="w-4">💧</span>
            <span>{weather.main.humidity}% Luftfeuchte</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="w-4">💨</span>
            <span>{Math.round(weather.wind.speed * 3.6)} km/h Wind</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="w-4">📊</span>
            <span>{weather.main.pressure} hPa</span>
          </div>
        </div>
      </div>

      <div className="bg-white bg-opacity-20 rounded-lg p-3">
        <h4 className="font-semibold text-sm mb-1">🚜 Landwirtschaftlicher Hinweis:</h4>
        <p className={`text-sm ${advice.color.replace('text-', 'text-white')} font-medium`}>
          {advice.text}
        </p>
      </div>

      {error && (
        <div className="mt-2 text-xs opacity-75">
          {error}
        </div>
      )}

      <div className="mt-2 text-xs opacity-75">
        Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE')}
      </div>
    </div>
  );
};

export default WeatherWidget;