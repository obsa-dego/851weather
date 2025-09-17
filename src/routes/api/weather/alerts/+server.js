import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		// Edge Function 호출
		const edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=alerts&locationKey=${locationKey}`;

		const response = await fetch(edgeFunctionUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});

		if (!response.ok) {
			throw error(response.status, `Weather alerts fetch failed: ${response.status}`);
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error('Weather alerts error:', err);
		throw error(500, 'Failed to get weather alerts');
	}
}