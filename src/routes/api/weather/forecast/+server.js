import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');
	const days = url.searchParams.get('days') || '5';
	const type = url.searchParams.get('type') || 'daily'; // daily or hourly

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		let endpoint;
		if (type === 'hourly') {
			let hours = url.searchParams.get('hours') || '12';
			// AccuWeather는 특정 시간만 지원: 1, 12, 24, 72, 120
			if (hours > 72) hours = '120';
			else if (hours > 24) hours = '72';
			else if (hours > 12) hours = '24';
			else if (hours > 1) hours = '12';
			else hours = '1';

			endpoint = `hourly${hours}`;
		} else {
			endpoint = `forecast${days}day`;
		}

		// Edge Function 호출
		const edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=${endpoint}&locationKey=${locationKey}`;
		const response = await fetch(edgeFunctionUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});

		if (!response.ok) {
			throw error(response.status, `${type} forecast fetch failed: ${response.status}`);
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error(`${type} forecast error:`, err);
		throw error(500, `Failed to get ${type} forecast`);
	}
}