import { json, error } from '@sveltejs/kit';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');
	const type = url.searchParams.get('type') || 'daily'; // daily, hourly
	const days = parseInt(url.searchParams.get('days')) || 5;
	const hours = parseInt(url.searchParams.get('hours')) || 12;

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		// locationKey는 "latitude_longitude" 형식
		const [latitude, longitude] = locationKey.split('_');

		if (!latitude || !longitude) {
			throw error(400, 'Invalid location key format');
		}

		// WMO Weather Codes를 한국어 설명으로 변환
		function getWeatherDescription(code) {
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

		// 낮/밤 판단 (간단한 구현)
		function isDaylight(timeString) {
			const hour = new Date(timeString).getHours();
			return hour >= 6 && hour < 18;
		}

		if (type === 'daily') {
			// 일별 예보
			const dailyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean&timezone=Asia/Seoul&forecast_days=${days}`;

			console.log('Open-Meteo Daily URL:', dailyUrl);

			const response = await fetch(dailyUrl);

			if (!response.ok) {
				throw error(response.status, `Daily forecast fetch failed: ${response.status}`);
			}

			const data = await response.json();
			console.log('Open-Meteo Daily Response:', data);

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
					IconPhrase: getWeatherDescription(data.daily.weather_code[index]),
					PrecipitationProbability: data.daily.precipitation_probability_max[index] || 0,
					RelativeHumidity: {
						Average: data.daily.relative_humidity_2m_mean[index] || null
					}
				}
			}));

			return json({
				DailyForecasts: dailyForecasts
			});

		} else if (type === 'hourly') {
			// 시간별 예보
			const hoursToRequest = Math.min(hours, 384); // 최대 384시간(16일)
			const daysToRequest = Math.ceil(hoursToRequest / 24);

			const hourlyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,relative_humidity_2m,wind_speed_10m&timezone=Asia/Seoul&forecast_days=${Math.min(daysToRequest, 16)}`;

			console.log('Open-Meteo Hourly URL:', hourlyUrl);

			const response = await fetch(hourlyUrl);

			if (!response.ok) {
				throw error(response.status, `Hourly forecast fetch failed: ${response.status}`);
			}

			const data = await response.json();
			console.log('Open-Meteo Hourly Response (sample):', {
				totalHours: data.hourly.time.length,
				firstHour: data.hourly.time[0],
				lastHour: data.hourly.time[data.hourly.time.length - 1]
			});

			// AccuWeather 형식과 유사하게 변환
			const hourlyForecasts = data.hourly.time.slice(0, hours).map((time, index) => ({
				DateTime: time,
				Temperature: {
					Value: data.hourly.temperature_2m[index]
				},
				ApparentTemperature: {
					Value: data.hourly.apparent_temperature[index]
				},
				PrecipitationProbability: data.hourly.precipitation_probability[index] || 0,
				WeatherIcon: data.hourly.weather_code[index],
				WeatherText: getWeatherDescription(data.hourly.weather_code[index]),
				IsDaylight: isDaylight(time),
				RelativeHumidity: data.hourly.relative_humidity_2m[index],
				Wind: {
					Speed: {
						Metric: {
							Value: data.hourly.wind_speed_10m[index]
						}
					}
				}
			}));

			return json(hourlyForecasts);
		}

		throw error(400, 'Invalid forecast type. Use daily or hourly');

	} catch (err) {
		console.error('Forecast error:', err);
		throw error(err.status || 500, err.body?.message || 'Failed to get forecast data');
	}
}