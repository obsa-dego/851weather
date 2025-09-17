import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const cityName = url.searchParams.get('q');

	if (!cityName) {
		throw error(400, 'City name is required');
	}

	try {
		console.log('Searching for city:', cityName);

		// 한글인지 영어인지 판단
		const isKorean = /[\u3131-\u318E\uAC00-\uD7A3]/.test(cityName);
		console.log('Is Korean:', isKorean);

		// Edge Function 호출
		const edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=location-search&q=${encodeURIComponent(cityName)}`;
		console.log('Edge Function URL:', edgeFunctionUrl);

		const response = await fetch(edgeFunctionUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});

		console.log('Response status:', response.status);
		console.log('Response headers:', Object.fromEntries(response.headers.entries()));

		if (!response.ok) {
			const errorText = await response.text();
			console.error('API Error response:', errorText);
			throw error(response.status, `Location search failed: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		console.log('Search response data:', data);

		return json(data);
	} catch (err) {
		console.error('Location search error:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to search location');
	}
}