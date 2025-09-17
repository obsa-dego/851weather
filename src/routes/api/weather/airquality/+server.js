import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL for Air Quality
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/air-quality';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');
	const type = url.searchParams.get('type') || 'current'; // current, hourly, daily, observation
	const hours = url.searchParams.get('hours') || '24';
	const days = url.searchParams.get('days') || '5';
	const pollutants = url.searchParams.get('pollutants') || 'true';

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		// Use new Air Quality Edge Function with direct parameters
		const apiUrl = `${EDGE_FUNCTION_URL}?locationKey=${locationKey}&type=${type}&hours=${hours}&days=${days}&pollutants=${pollutants}`;
		console.log('Air Quality API URL:', apiUrl);

		const response = await fetch(apiUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});

		if (!response.ok) {
			throw error(response.status, `Air quality fetch failed: ${response.status}`);
		}

		const data = await response.json();
		console.log('Air quality data:', JSON.stringify(data, null, 2));

		// Extract PM10 and PM2.5 if available
		let pmData = null;
		if (data && Array.isArray(data)) {
			const firstItem = data[0];
			if (firstItem?.Pollutants) {
				const pm25 = firstItem.Pollutants.find(p => p.Name === 'PM2.5');
				const pm10 = firstItem.Pollutants.find(p => p.Name === 'PM10');
				if (pm25 || pm10) {
					pmData = { PM25: pm25, PM10: pm10 };
					console.log('PM data extracted:', pmData);
				}
			}
		} else if (data?.Pollutants) {
			const pm25 = data.Pollutants.find(p => p.Name === 'PM2.5');
			const pm10 = data.Pollutants.find(p => p.Name === 'PM10');
			if (pm25 || pm10) {
				pmData = { PM25: pm25, PM10: pm10 };
				console.log('PM data extracted:', pmData);
			}
		}

		return json({
			locationKey,
			type,
			data,
			pmData,
			success: true
		});
	} catch (err) {
		console.error('Air quality error:', err);
		throw error(err.status || 500, err.body?.message || 'Failed to get air quality data');
	}
}