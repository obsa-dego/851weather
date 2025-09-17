import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		const apiUrl = `${EDGE_FUNCTION_URL}?endpoint=current&locationKey=${locationKey}`;
		const response = await fetch(apiUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});

		if (!response.ok) {
			throw error(response.status, `Current conditions fetch failed: ${response.status}`);
		}

		const data = await response.json();
		console.log('Current conditions API response:', data);

		// API가 배열을 반환하면 첫 번째 요소, 아니면 그대로 반환
		const result = Array.isArray(data) ? data[0] : data;
		return json(result);
	} catch (err) {
		console.error('Current conditions error:', err);
		console.error('Error details:', err.message);
		throw error(err.status || 500, err.body?.message || 'Failed to get current conditions');
	}
}