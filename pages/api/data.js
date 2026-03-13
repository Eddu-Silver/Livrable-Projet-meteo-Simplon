import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // 1. LIRE LE FICHIER DE CONFIGURATION
    const configPath = path.join(process.cwd(), "config.json");
    const configFile = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configFile);

    const { latitude, longitude, city, country } = config;

    // 2. APPEL À L'API OPEN-METEO AVEC TOUTES LES DONNÉES DISPONIBLES
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,pressure_msl&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=Europe/Paris`,
    );

    const data = await response.json();

    // 3. CONVERTIR LES DATES ISO EN TIMESTAMPS UNIX
    const sunriseTimestamp = Math.floor(
      new Date(data.daily.sunrise[0]).getTime() / 1000,
    );
    const sunsetTimestamp = Math.floor(
      new Date(data.daily.sunset[0]).getTime() / 1000,
    );

    // 4. CALCULER LE DÉCALAGE HORAIRE
    const timezoneOffset = new Date().getTimezoneOffset() * 60 * -1;

    // 5. TRANSFORMER LES DONNÉES AU FORMAT ATTENDU PAR L'APPLICATION
    const formattedData = {
      // Informations sur la ville (depuis config.json)
      name: city,
      sys: {
        country: country,
        sunrise: sunriseTimestamp,
        sunset: sunsetTimestamp,
      },
      // Données météo principales
      main: {
        temp: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        feels_like: data.current.temperature_2m,
        pressure: data.current.pressure_msl,
        temp_min: data.daily.temperature_2m_min[0],
        temp_max: data.daily.temperature_2m_max[0],
      },
      // Description et icône
      weather: [
        {
          id: data.current.weather_code,
          main: getWeatherMain(data.current.weather_code),
          description: getWeatherDescription(data.current.weather_code),
          icon: getWeatherIcon(data.current.weather_code),
        },
      ],
      // Vent avec direction réelle
      wind: {
        speed: data.current.wind_speed_10m,
        deg: data.current.wind_direction_10m,
      },
      // Visibilité (valeur par défaut)
      visibility: 10000,
      // Timestamp de la donnée
      dt: Math.floor(Date.now() / 1000),
      // Fuseau horaire
      timezone: timezoneOffset,
      // Code de succès
      cod: 200,
    };

    // 6. RENVOYER LES DONNÉES FORMATÉES
    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Erreur météo:", error);
    res
      .status(500)
      .json({ error: "Impossible de récupérer les données météo" });
  }
}

// 7. FONCTIONS UTILITAIRES POUR LES CODES MÉTÉO

function getWeatherMain(code) {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Clouds";
  if (code === 3) return "Clouds";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain";
  if (code >= 85 && code <= 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Clear";
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "ciel dégagé",
    1: "principalement dégagé",
    2: "partiellement nuageux",
    3: "nuageux",
    45: "brouillard",
    48: "brouillard givrant",
    51: "bruine légère",
    53: "bruine modérée",
    55: "bruine dense",
    56: "bruine verglaçante légère",
    57: "bruine verglaçante dense",
    61: "pluie légère",
    63: "pluie modérée",
    65: "pluie forte",
    66: "pluie verglaçante légère",
    67: "pluie verglaçante forte",
    71: "neige légère",
    73: "neige modérée",
    75: "neige forte",
    77: "grains de neige",
    80: "averses de pluie légères",
    81: "averses de pluie modérées",
    82: "averses de pluie violentes",
    85: "averses de neige légères",
    86: "averses de neige fortes",
    95: "orage",
    96: "orage avec grêle légère",
    99: "orage avec grêle forte",
  };
  return descriptions[code] || "état inconnu";
}

function getWeatherIcon(code) {
  if (code === 0) return "01d";
  if (code === 1) return "02d";
  if (code === 2) return "03d";
  if (code === 3) return "04d";
  if (code >= 45 && code <= 48) return "50d";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "10d";
  if (code >= 71 && code <= 77) return "13d";
  if (code >= 85 && code <= 86) return "13d";
  if (code >= 95) return "11d";
  return "01d";
}
