import { json, error } from '@sveltejs/kit';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://rmokaebzldeyyovjrojj.supabase.co/functions/v1/weather-api';

export async function GET({ url }) {
	const locationKey = url.searchParams.get('locationKey');
	const groupId = url.searchParams.get('groupId') || 'all';
	const days = url.searchParams.get('days') || '5';

	if (!locationKey) {
		throw error(400, 'Location key is required');
	}

	try {
		// Try different endpoints for air quality data
		const endpoints = [
			// Indices endpoints with different group IDs for air quality
			{ endpoint: 'indices', params: `&groupId=10` }, // Air Quality group
			{ endpoint: 'indices', params: `&groupId=${groupId}` },
			{ endpoint: `indices${days}day`, params: '' },
			// AlarmData endpoint might have air quality alerts
			{ endpoint: 'alarms', params: `&days=${days}` },
			{ endpoint: `alarms${days}day`, params: '' },
		];

		const results = [];

		for (const { endpoint, params } of endpoints) {
			try {
				const edgeFunctionUrl = `${EDGE_FUNCTION_URL}?endpoint=${endpoint}&locationKey=${locationKey}${params}`;
				console.log('Testing endpoint:', endpoint, 'with params:', params);

				const response = await fetch(edgeFunctionUrl, {
					headers: {
						'Accept': 'application/json',
						'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtb2thZWJ6bGRleXlvdmpyb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODIyMjIsImV4cCI6MjA3MzU1ODIyMn0.6JaauG6prtoU01HR1O_1YAtCmNlx0aVSNnDYHDjVy_0'
					}
				});

				if (response.ok) {
					const data = await response.json();
					console.log(`Success for ${endpoint}:`, JSON.stringify(data, null, 2));
					results.push({
						endpoint,
						params,
						success: true,
						data
					});
				} else {
					console.warn(`Failed for ${endpoint}: ${response.status}`);
					results.push({
						endpoint,
						params,
						success: false,
						status: response.status
					});
				}
			} catch (err) {
				console.error(`Error for ${endpoint}:`, err.message);
				results.push({
					endpoint,
					params,
					success: false,
					error: err.message
				});
			}
		}

		// Return all results for analysis
		return json({
			locationKey,
			testedEndpoints: results,
			summary: `Tested ${results.length} endpoints, ${results.filter(r => r.success).length} successful`
		});
	} catch (err) {
		console.error('Indices error:', err);
		throw error(500, 'Failed to get indices data');
	}
}