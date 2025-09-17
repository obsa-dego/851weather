export class AccuWeatherAPI {
	constructor(apiKey) {
		// API 키는 서버에서 관리하므로 더이상 필요하지 않음
		this.baseUrl = '/api/weather';
	}

	async searchLocation(cityName) {
		try {
			const url = `${this.baseUrl}/search?q=${encodeURIComponent(cityName)}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Location search failed: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Location search error:', error);
			throw error;
		}
	}

	async getCurrentConditions(locationKey) {
		try {
			const url = `${this.baseUrl}/current?locationKey=${locationKey}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Current conditions fetch failed: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Current conditions error:', error);
			throw error;
		}
	}

	async getDailyForecast(locationKey, days = 5) {
		try {
			const url = `${this.baseUrl}/forecast?locationKey=${locationKey}&days=${days}&type=daily`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Daily forecast fetch failed: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Daily forecast error:', error);
			throw error;
		}
	}

	async getHourlyForecast(locationKey, hours = 12) {
		try {
			// AccuWeather API는 1, 12, 24, 72, 120, 240시간을 지원
			// 120시간 요청 시 실제로 120hour 엔드포인트 사용
			let apiHours = hours;
			if (hours > 72 && hours <= 120) {
				apiHours = 120;
			} else if (hours > 24 && hours <= 72) {
				apiHours = 72;
			} else if (hours > 12 && hours <= 24) {
				apiHours = 24;
			} else if (hours > 1 && hours <= 12) {
				apiHours = 12;
			} else {
				apiHours = 1;
			}

			const url = `${this.baseUrl}/forecast?locationKey=${locationKey}&hours=${apiHours}&type=hourly`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Hourly forecast fetch failed: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Hourly forecast error:', error);
			throw error;
		}
	}

	async getAirQuality(locationKey) {
		try {
			// AccuWeather의 대기질 지수 API (Edge Function 사용)
			const url = `${this.baseUrl}/indices?locationKey=${locationKey}&groupId=8`;
			const response = await fetch(url);

			if (!response.ok) {
				console.warn('Air quality data not available, using fallback');
				return null;
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Air quality error:', error);
			return null;
		}
	}

	async getWeatherIndices(locationKey) {
		try {
			// 여러 지수들을 병렬로 가져오기
			const [airQuality, outdoor, driving] = await Promise.allSettled([
				this.getIndicesByGroup(locationKey, 8), // 대기질
				this.getIndicesByGroup(locationKey, 1), // 야외활동
				this.getIndicesByGroup(locationKey, 12) // 운전
			]);

			return {
				airQuality: airQuality.status === 'fulfilled' ? airQuality.value : null,
				outdoor: outdoor.status === 'fulfilled' ? outdoor.value : null,
				driving: driving.status === 'fulfilled' ? driving.value : null
			};
		} catch (error) {
			console.error('Weather indices error:', error);
			return null;
		}
	}

	async getIndicesByGroup(locationKey, groupId) {
		try {
			const url = `${this.baseUrl}/indices?locationKey=${locationKey}&groupId=${groupId}`;
			const response = await fetch(url);

			if (!response.ok) {
				return null;
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Indices fetch error:', error);
			return null;
		}
	}

	async getLocationInfo(locationKey) {
		try {
			const url = `${this.baseUrl}/location?locationKey=${locationKey}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Location info fetch failed: ${response.status}`);
			}

			return response.json();
		} catch (error) {
			console.error('Location info error:', error);
			throw error;
		}
	}

	getWeatherIcon(iconNumber) {
		// AccuWeather 아이콘 번호를 이미지 URL로 변환
		const paddedIcon = String(iconNumber).padStart(2, '0');
		return `https://developer.accuweather.com/sites/default/files/${paddedIcon}-s.png`;
	}
}