import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');

	if (!locationKey && (!lat || !lon)) {
		throw error(400, 'Location key or coordinates (lat, lon) are required');
	}

	try {
		// Edge Function 호출
		let edgeFunctionUrl;
		if (lat && lon) {
			edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=minutecast&lat=${lat}&lon=${lon}`;
		} else {
			edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=minutecast&locationKey=${locationKey}`;
		}

		const response = await fetch(edgeFunctionUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});

		if (!response.ok) {
			throw error(response.status, `MinuteCast fetch failed: ${response.status}`);
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error('MinuteCast error:', err);
		throw error(500, 'Failed to get MinuteCast data');
	}
}