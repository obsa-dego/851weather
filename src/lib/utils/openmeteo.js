export class OpenMeteoAPI {
	constructor() {
		this.baseUrl = '/api/weather';
		this.geocodingBaseUrl = 'https://geocoding-api.open-meteo.com/v1';
		this.weatherBaseUrl = 'https://api.open-meteo.com/v1';
	}

	async searchLocation(cityName) {
		try {
			const url = `${this.geocodingBaseUrl}/search?name=${encodeURIComponent(cityName)}&count=10&language=ko&format=json`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Location search failed: ${response.status}`);
			}

			const data = await response.json();

			// 결과가 있으면 AccuWeather 형식과 유사하게 변환
			if (data.results && data.results.length > 0) {
				return data.results.map(result => ({
					Key: `${result.latitude}_${result.longitude}`,
					LocalizedName: result.name,
					EnglishName: result.name,
					Country: {
						LocalizedName: result.country,
						EnglishName: result.country
					},
					AdministrativeArea: {
						LocalizedName: result.admin1 || '',
						EnglishName: result.admin1 || ''
					},
					IsAlias: false,
					latitude: result.latitude,
					longitude: result.longitude,
					timezone: result.timezone || 'Asia/Seoul'
				}));
			}

			return [];
		} catch (error) {
			console.error('Location search error:', error);
			throw error;
		}
	}

	async getCurrentConditions(locationKey) {
		try {
			// locationKey는 "latitude_longitude" 형식
			const [latitude, longitude] = locationKey.split('_');

			const url = `${this.weatherBaseUrl}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia/Seoul`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Current conditions fetch failed: ${response.status}`);
			}

			const data = await response.json();

			// AccuWeather 형식과 유사하게 변환
			return [{
				Temperature: {
					Metric: {
						Value: data.current.temperature_2m
					}
				},
				ApparentTemperature: {
					Metric: {
						Value: data.current.apparent_temperature
					}
				},
				WeatherText: this.getWeatherDescription(data.current.weather_code),
				WeatherIcon: data.current.weather_code,
				Wind: {
					Speed: {
						Metric: {
							Value: data.current.wind_speed_10m
						}
					},
					Direction: {
						Degrees: data.current.wind_direction_10m,
						Localized: this.getWindDirection(data.current.wind_direction_10m),
						English: this.getWindDirection(data.current.wind_direction_10m)
					}
				},
				DateTime: new Date().toISOString()
			}];
		} catch (error) {
			console.error('Current conditions error:', error);
			throw error;
		}
	}

	async getDailyForecast(locationKey, days = 5) {
		try {
			const [latitude, longitude] = locationKey.split('_');

			const url = `${this.weatherBaseUrl}/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Seoul&forecast_days=${days}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Daily forecast fetch failed: ${response.status}`);
			}

			const data = await response.json();

			// AccuWeather 형식과 유사하게 변환
			const dailyForecasts = data.daily.time.map((date, index) => ({
				Date: date,
				Temperature: {
					Maximum: {
						Value: data.daily.temperature_2m_max[index]
					},
					Minimum: {
						Value: data.daily.temperature_2m_min[index]
					}
				},
				Day: {
					Icon: data.daily.weather_code[index],
					IconPhrase: this.getWeatherDescription(data.daily.weather_code[index]),
					PrecipitationProbability: data.daily.precipitation_probability_max[index] || 0
				}
			}));

			return {
				DailyForecasts: dailyForecasts
			};
		} catch (error) {
			console.error('Daily forecast error:', error);
			throw error;
		}
	}

	async getHourlyForecast(locationKey, hours = 12) {
		try {
			const [latitude, longitude] = locationKey.split('_');

			// 최대 168시간(7일) 지원
			const hoursToRequest = Math.min(hours, 168);

			const url = `${this.weatherBaseUrl}/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&timezone=Asia/Seoul&forecast_hours=${hoursToRequest}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Hourly forecast fetch failed: ${response.status}`);
			}

			const data = await response.json();

			// AccuWeather 형식과 유사하게 변환
			return data.hourly.time.slice(0, hours).map((time, index) => ({
				DateTime: time,
				Temperature: {
					Value: data.hourly.temperature_2m[index]
				},
				ApparentTemperature: {
					Value: data.hourly.apparent_temperature[index]
				},
				PrecipitationProbability: data.hourly.precipitation_probability[index] || 0,
				WeatherIcon: data.hourly.weather_code[index],
				IsDaylight: this.isDaylight(time)
			}));
		} catch (error) {
			console.error('Hourly forecast error:', error);
			throw error;
		}
	}

	async getAirQuality(locationKey) {
		try {
			const [latitude, longitude] = locationKey.split('_');

			const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=Asia/Seoul`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Air quality fetch failed: ${response.status}`);
			}

			const data = await response.json();

			// AccuWeather 형식과 유사하게 변환
			return [{
				Pollutants: [
					{
						Name: 'PM10',
						Value: data.current.pm10,
						Category: this.getPMCategory(data.current.pm10, 'PM10')
					},
					{
						Name: 'PM2.5',
						Value: data.current.pm2_5,
						Category: this.getPMCategory(data.current.pm2_5, 'PM2.5')
					}
				]
			}];
		} catch (error) {
			console.error('Air quality error:', error);
			throw error;
		}
	}

	async getHourlyAirQuality(locationKey, hours = 24) {
		try {
			const [latitude, longitude] = locationKey.split('_');

			const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=Asia/Seoul`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Hourly air quality fetch failed: ${response.status}`);
			}

			const data = await response.json();

			return data.hourly.time.slice(0, hours).map((time, index) => ({
				DateTime: time,
				PM10: data.hourly.pm10[index],
				PM25: data.hourly.pm2_5[index],
				CO: data.hourly.carbon_monoxide[index],
				NO2: data.hourly.nitrogen_dioxide[index],
				O3: data.hourly.ozone[index]
			}));
		} catch (error) {
			console.error('Hourly air quality error:', error);
			throw error;
		}
	}

	// WMO Weather Codes를 한국어 설명으로 변환
	getWeatherDescription(code) {
		const descriptions = {
			0: '맑음',
			1: '대체로 맑음',
			2: '부분적으로 흐림',
			3: '흐림',
			45: '안개',
			48: '착빙 안개',
			51: '가벼운 이슬비',
			53: '보통 이슬비',
			55: '심한 이슬비',
			56: '가벼운 어는 이슬비',
			57: '심한 어는 이슬비',
			61: '가벼운 비',
			63: '보통 비',
			65: '심한 비',
			66: '가벼운 어는비',
			67: '심한 어는비',
			71: '가벼운 눈',
			73: '보통 눈',
			75: '심한 눈',
			77: '진눈깨비',
			80: '가벼운 소나기',
			81: '보통 소나기',
			82: '폭우',
			85: '가벼운 눈 소나기',
			86: '심한 눈 소나기',
			95: '뇌우',
			96: '가벼운 우박을 동반한 뇌우',
			99: '심한 우박을 동반한 뇌우'
		};

		return descriptions[code] || '알 수 없음';
	}

	// 풍향을 텍스트로 변환
	getWindDirection(degrees) {
		if (degrees === null || degrees === undefined) return 'N/A';

		const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
		const index = Math.round(degrees / 45) % 8;
		return directions[index];
	}

	// 낮/밤 판단 (간단한 구현)
	isDaylight(timeString) {
		const hour = new Date(timeString).getHours();
		return hour >= 6 && hour < 18;
	}

	// PM 농도 카테고리 반환
	getPMCategory(value, type) {
		if (value === null || value === undefined) return 'N/A';

		if (type === 'PM10') {
			if (value <= 30) return '좋음';
			if (value <= 50) return '보통';
			if (value <= 100) return '나쁨';
			return '매우나쁨';
		} else if (type === 'PM2.5') {
			if (value <= 15) return '좋음';
			if (value <= 25) return '보통';
			if (value <= 50) return '나쁨';
			return '매우나쁨';
		}

		return 'N/A';
	}

	// WMO 코드를 이모지로 변환
	getWeatherIconEmoji(code) {
		const icons = {
			0: '☀️',    // Clear sky
			1: '🌤️',    // Mainly clear
			2: '⛅',     // Partly cloudy
			3: '☁️',     // Overcast
			45: '🌫️',   // Fog
			48: '🌫️',   // Depositing rime fog
			51: '🌦️',   // Light drizzle
			53: '🌦️',   // Moderate drizzle
			55: '🌧️',   // Dense drizzle
			56: '🌧️',   // Light freezing drizzle
			57: '🌧️',   // Dense freezing drizzle
			61: '🌧️',   // Slight rain
			63: '🌧️',   // Moderate rain
			65: '🌧️',   // Heavy rain
			66: '🌧️',   // Light freezing rain
			67: '🌧️',   // Heavy freezing rain
			71: '❄️',    // Slight snow fall
			73: '❄️',    // Moderate snow fall
			75: '❄️',    // Heavy snow fall
			77: '❄️',    // Snow grains
			80: '🌦️',   // Slight rain showers
			81: '🌧️',   // Moderate rain showers
			82: '🌧️',   // Violent rain showers
			85: '❄️',    // Slight snow showers
			86: '❄️',    // Heavy snow showers
			95: '⛈️',    // Thunderstorm
			96: '⛈️',    // Thunderstorm with slight hail
			99: '⛈️'     // Thunderstorm with heavy hail
		};

		return icons[code] || '☁️';
	}
}