import { json, error } from '@sveltejs/kit';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');
	const type = url.searchParams.get('type') || 'current'; // current, hourly
	const hours = parseInt(url.searchParams.get('hours')) || 24;

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		// locationKey는 "latitude_longitude" 형식
		const [latitude, longitude] = locationKey.split('_');

		if (!latitude || !longitude) {
			throw error(400, 'Invalid location key format');
		}

		// PM 농도 카테고리 반환
		function getPMCategory(value, pmType) {
			if (value === null || value === undefined) return 'N/A';

			if (pmType === 'PM10') {
				if (value <= 30) return '좋음';
				if (value <= 50) return '보통';
				if (value <= 100) return '나쁨';
				return '매우나쁨';
			} else if (pmType === 'PM2.5') {
				if (value <= 15) return '좋음';
				if (value <= 25) return '보통';
				if (value <= 50) return '나쁨';
				return '매우나쁨';
			}

			return 'N/A';
		}

		if (type === 'current') {
			// 현재 대기질
			const currentUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=Asia/Seoul`;

			console.log('Open-Meteo Air Quality Current URL:', currentUrl);

			const response = await fetch(currentUrl);

			if (!response.ok) {
				throw error(response.status, `Air quality fetch failed: ${response.status}`);
			}

			const data = await response.json();
			console.log('Open-Meteo Air Quality Current Response:', data);

			// AccuWeather 형식과 유사하게 변환
			const transformedData = [{
				DateTime: new Date().toISOString(),
				Pollutants: [
					{
						Name: 'PM10',
						Value: data.current.pm10,
						Category: getPMCategory(data.current.pm10, 'PM10')
					},
					{
						Name: 'PM2.5',
						Value: data.current.pm2_5,
						Category: getPMCategory(data.current.pm2_5, 'PM2.5')
					},
					{
						Name: 'CO',
						Value: data.current.carbon_monoxide,
						Unit: 'μg/m³'
					},
					{
						Name: 'NO2',
						Value: data.current.nitrogen_dioxide,
						Unit: 'μg/m³'
					},
					{
						Name: 'O3',
						Value: data.current.ozone,
						Unit: 'μg/m³'
					}
				]
			}];

			return json(transformedData);

		} else if (type === 'hourly') {
			// 시간별 대기질
			const hoursToRequest = Math.min(hours, 384); // 최대 384시간(16일)
			const daysToRequest = Math.ceil(hoursToRequest / 24);

			const hourlyUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=Asia/Seoul&forecast_days=${Math.min(daysToRequest, 16)}`;

			console.log('Open-Meteo Air Quality Hourly URL:', hourlyUrl);

			const response = await fetch(hourlyUrl);

			if (!response.ok) {
				throw error(response.status, `Hourly air quality fetch failed: ${response.status}`);
			}

			const data = await response.json();
			console.log('Open-Meteo Air Quality Hourly Response (sample):', {
				totalHours: data.hourly.time.length,
				firstHour: data.hourly.time[0],
				lastHour: data.hourly.time[data.hourly.time.length - 1]
			});

			const hourlyData = data.hourly.time.slice(0, hours).map((time, index) => ({
				DateTime: time,
				PM10: data.hourly.pm10[index],
				PM25: data.hourly.pm2_5[index],
				CO: data.hourly.carbon_monoxide[index],
				NO2: data.hourly.nitrogen_dioxide[index],
				O3: data.hourly.ozone[index],
				PM10Category: getPMCategory(data.hourly.pm10[index], 'PM10'),
				PM25Category: getPMCategory(data.hourly.pm2_5[index], 'PM2.5')
			}));

			return json(hourlyData);
		}

		throw error(400, 'Invalid air quality type. Use current or hourly');

	} catch (err) {
		console.error('Air quality error:', err);
		throw error(err.status || 500, err.body?.message || 'Failed to get air quality data');
	}
}