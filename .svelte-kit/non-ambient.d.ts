
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/weather" | "/api/weather/airquality" | "/api/weather/alerts" | "/api/weather/current" | "/api/weather/forecast" | "/api/weather/indices" | "/api/weather/location" | "/api/weather/minutecast" | "/api/weather/openmeteo-airquality" | "/api/weather/openmeteo-current" | "/api/weather/openmeteo-forecast" | "/api/weather/openmeteo-search" | "/api/weather/search-text" | "/api/weather/search";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/weather": Record<string, never>;
			"/api/weather/airquality": Record<string, never>;
			"/api/weather/alerts": Record<string, never>;
			"/api/weather/current": Record<string, never>;
			"/api/weather/forecast": Record<string, never>;
			"/api/weather/indices": Record<string, never>;
			"/api/weather/location": Record<string, never>;
			"/api/weather/minutecast": Record<string, never>;
			"/api/weather/openmeteo-airquality": Record<string, never>;
			"/api/weather/openmeteo-current": Record<string, never>;
			"/api/weather/openmeteo-forecast": Record<string, never>;
			"/api/weather/openmeteo-search": Record<string, never>;
			"/api/weather/search-text": Record<string, never>;
			"/api/weather/search": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/weather" | "/api/weather/" | "/api/weather/airquality" | "/api/weather/airquality/" | "/api/weather/alerts" | "/api/weather/alerts/" | "/api/weather/current" | "/api/weather/current/" | "/api/weather/forecast" | "/api/weather/forecast/" | "/api/weather/indices" | "/api/weather/indices/" | "/api/weather/location" | "/api/weather/location/" | "/api/weather/minutecast" | "/api/weather/minutecast/" | "/api/weather/openmeteo-airquality" | "/api/weather/openmeteo-airquality/" | "/api/weather/openmeteo-current" | "/api/weather/openmeteo-current/" | "/api/weather/openmeteo-forecast" | "/api/weather/openmeteo-forecast/" | "/api/weather/openmeteo-search" | "/api/weather/openmeteo-search/" | "/api/weather/search-text" | "/api/weather/search-text/" | "/api/weather/search" | "/api/weather/search/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}