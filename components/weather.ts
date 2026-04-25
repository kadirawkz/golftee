export type DailyWeatherForecast = {
  dateKey: string;
  dateLabel: string;
  tempMin: number;
  tempMax: number;
  description: string;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
};

type OpenMeteoForecastResponse = {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    relative_humidity_2m_mean?: number[];
  };
  error?: boolean;
  reason?: string;
};

const weatherRequests = new Map<string, Promise<DailyWeatherForecast[]>>();
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

type CachedForecast = {
  forecast: DailyWeatherForecast[];
  fetchedAt: number;
};

const weatherCache = new Map<string, CachedForecast>();

function createWeatherCacheKey(coordinates: { latitude: number; longitude: number }) {
  return `${coordinates.latitude.toFixed(3)}:${coordinates.longitude.toFixed(3)}`;
}

export async function getFourteenDayForecast(coordinates: {
  latitude: number;
  longitude: number;
}): Promise<DailyWeatherForecast[]> {
  const cacheKey = createWeatherCacheKey(coordinates);
  const cachedForecast = weatherCache.get(cacheKey);
  if (cachedForecast && Date.now() - cachedForecast.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return cachedForecast.forecast;
  }

  if (cachedForecast) {
    weatherCache.delete(cacheKey);
  }

  const pendingForecast = weatherRequests.get(cacheKey);
  if (pendingForecast) {
    return pendingForecast;
  }

  const request = (async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}` +
      `&longitude=${coordinates.longitude}` +
      `&forecast_days=14` +
      `&timezone=auto` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_mean`;

    const response = await fetch(url);
    const payload = (await response.json()) as OpenMeteoForecastResponse;

    if (
      !response.ok ||
      !payload.daily ||
      !payload.daily.time ||
      !payload.daily.temperature_2m_max ||
      !payload.daily.temperature_2m_min ||
      !payload.daily.weather_code ||
      !payload.daily.wind_speed_10m_max
    ) {
      throw new Error(typeof payload.reason === "string" ? payload.reason : "weather_unavailable");
    }

    const forecast = payload.daily.time.slice(0, 14).map((dateValue, index) => ({
      dateKey: dateValue,
      dateLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(dateValue)),
      tempMin: Math.round(payload.daily!.temperature_2m_min[index]),
      tempMax: Math.round(payload.daily!.temperature_2m_max[index]),
      description: getWeatherCodeLabel(payload.daily!.weather_code[index]),
      weatherCode: payload.daily!.weather_code[index],
      humidity: Math.round(payload.daily!.relative_humidity_2m_mean?.[index] ?? 0),
      windSpeed: Math.round(payload.daily!.wind_speed_10m_max[index]),
    }));

    weatherCache.set(cacheKey, {
      forecast,
      fetchedAt: Date.now(),
    });
    return forecast;
  })();

  weatherRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    weatherRequests.delete(cacheKey);
  }
}

export function getWeatherCodeLabel(code: number) {
  if (code === 0) {
    return "Clear sky";
  }
  if ([1, 2].includes(code)) {
    return "Partly cloudy";
  }
  if (code === 3) {
    return "Overcast";
  }
  if ([45, 48].includes(code)) {
    return "Fog";
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return "Drizzle";
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "Rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "Snow";
  }
  if ([95, 96, 99].includes(code)) {
    return "Thunderstorm";
  }
  return "Forecast unavailable";
}

export function getWeatherCodeIconName(code: number) {
  if (code === 0) {
    return "sunny-outline";
  }
  if ([1, 2, 3].includes(code)) {
    return "partly-sunny-outline";
  }
  if ([45, 48].includes(code)) {
    return "cloud-outline";
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rainy-outline";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow-outline";
  }
  if ([95, 96, 99].includes(code)) {
    return "thunderstorm-outline";
  }
  return "cloud-outline";
}
