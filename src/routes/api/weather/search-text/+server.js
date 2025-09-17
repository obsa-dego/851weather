import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const query = url.searchParams.get('q');

	if (!query) {
		throw error(400, 'Search query is required');
	}

	try {
		console.log('Trying text search for:', query);

		// Edge Function 호출
		const edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=location-search&q=${encodeURIComponent(query)}`;
		console.log('Edge Function URL:', edgeFunctionUrl);

		const response = await fetch(edgeFunctionUrl, {
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
			}
		});
		console.log('Text search response status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Text search API Error:', errorText);
			throw error(response.status, `Text search failed: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		console.log('Text search response data:', data);
		console.log('Text search response headers:', Object.fromEntries(response.headers.entries()));

		return json(data);
	} catch (err) {
		console.error('Text search error:', err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to search locations');
	}
}