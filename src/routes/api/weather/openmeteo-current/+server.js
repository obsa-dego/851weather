import { json, error } from '@sveltejs/kit';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		// locationKey는 "latitude_longitude" 형식
		const [latitude, longitude] = locationKey.split('_');

		if (!latitude || !longitude) {
			throw error(400, 'Invalid location key format');
		}

		const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m&timezone=Asia/Seoul`;

		console.log('Open-Meteo Current URL:', currentUrl);

		const response = await fetch(currentUrl);

		if (!response.ok) {
			throw error(response.status, `Current weather fetch failed: ${response.status}`);
		}

		const data = await response.json();
		console.log('Open-Meteo Current Response:', data);

		// 풍향을 텍스트로 변환하는 함수
		function getWindDirection(degrees) {
			if (degrees === null || degrees === undefined) return 'N/A';
			const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
			const index = Math.round(degrees / 45) % 8;
			return directions[index];
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

		// AccuWeather 형식과 유사하게 변환
		const transformedData = [{
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
			RelativeHumidity: data.current.relative_humidity_2m,
			WeatherText: getWeatherDescription(data.current.weather_code),
			WeatherIcon: data.current.weather_code,
			Wind: {
				Speed: {
					Metric: {
						Value: data.current.wind_speed_10m
					}
				},
				Direction: {
					Degrees: data.current.wind_direction_10m,
					Localized: getWindDirection(data.current.wind_direction_10m),
					English: getWindDirection(data.current.wind_direction_10m)
				}
			},
			DateTime: new Date().toISOString(),
			IsDaylight: true // 간단한 구현
		}];

		return json(transformedData);
	} catch (err) {
		console.error('Current weather error:', err);
		throw error(err.status || 500, err.body?.message || 'Failed to get current weather');
	}
}