<script>
  import { onMount } from 'svelte';

  // State variables
  let currentTime = '';
  let currentDate = '';
  let currentTemp = '--';
  let weatherCondition = 'Loading...';
  let windSpeed = 0;
  let location = 'Gimpo, Korea';
  let showRainEffect = false;
  let currentWeatherCode = 0;

  // 5-day forecast data
  let fiveDayForecast = [];

  // Hourly forecast data (24시간)
  let hourlyForecast = [];
  let allHourlyData = []; // 5일간의 모든 시간별 데이터
  let airQualityData = []; // 미세먼지 데이터

  // Selected day for hourly forecast
  let selectedDayIndex = null;
  let selectedDayHourlyData = [];
  let viewMode = 'list'; // 'list' or 'detail'

  // Location search
  let showLocationSearch = false;
  let searchQuery = '';
  let searchResults = [];
  let isSearching = false;

  // API data loading
  let loading = true;
  let locationKey = '37.6_126.70001';

  onMount(() => {
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    loadWeatherData();
    return () => clearInterval(interval);
  });

  function updateDateTime() {
    const now = new Date();
    currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    currentDate = now.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  async function loadWeatherData() {
    loading = true;
    try {
      // Current weather
      const currentResponse = await fetch(`/api/weather/openmeteo-current?locationKey=${locationKey}`);
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        // API returns an array with one object
        if (currentData && currentData[0]) {
          const current = currentData[0];
          currentTemp = Math.round(current.Temperature.Metric.Value);
          weatherCondition = current.WeatherText; // Already in Korean from API
          windSpeed = Math.round(current.Wind?.Speed?.Metric?.Value || 0);
          currentWeatherCode = current.WeatherIcon || 0;

          // Show rain effect for rain-related weather codes
          showRainEffect = shouldShowRain(currentWeatherCode);
        }
      }

      // 5일간의 시간별 데이터 가져오기 (120시간)
      const hourlyResponse = await fetch(`/api/weather/openmeteo-forecast?locationKey=${locationKey}&type=hourly&hours=120`);
      if (hourlyResponse.ok) {
        const hourlyData = await hourlyResponse.json();
        // API returns an array directly
        if (Array.isArray(hourlyData)) {
          allHourlyData = hourlyData.map(h => ({
            time: formatTime(h.DateTime),
            temp: Math.round(h.Temperature?.Value || 0),
            icon: getWeatherIcon(h.WeatherIcon),
            dateTime: h.DateTime,
            date: new Date(h.DateTime).toDateString(),
            precipitation: h.PrecipitationProbability || 0
          }));
          console.log('🌤️ Weather data loaded:', allHourlyData.length, 'records');
          console.log('🌤️ First weather record:', allHourlyData[0]);
          console.log('🌤️ Sample weather times:', allHourlyData.slice(0, 5).map(h => h.dateTime));

          // 하단 섹션은 항상 오늘(0일차) 데이터로 고정
          updateHourlyForecastForDay(0);
        }
      }

      // 미세먼지 데이터 가져오기 (120시간)
      const airQualityResponse = await fetch(`/api/weather/openmeteo-airquality?locationKey=${locationKey}&type=hourly&hours=120`);
      if (airQualityResponse.ok) {
        const airData = await airQualityResponse.json();
        if (Array.isArray(airData)) {
          airQualityData = airData;
          console.log('🌫️ Air quality data loaded:', airQualityData.length, 'records');
          console.log('🌫️ First air quality record:', airQualityData[0]);
          console.log('🌫️ Sample air quality times:', airQualityData.slice(0, 5).map(a => a.DateTime));

          // 미세먼지 데이터 로딩 완료 후 다시 매칭
          if (allHourlyData.length > 0) {
            console.log('🔄 Re-running hourly forecast update with air quality data...');
            updateHourlyForecastForDay(0);

            // 만약 상세 보기 중이었다면 데이터 다시 업데이트
            if (selectedDayIndex !== null && viewMode === 'detail') {
              updateSelectedDayHourlyForecast(selectedDayIndex);
            }
          }
        } else {
          console.error('❌ Air quality data is not an array:', airData);
        }
      }

      // Daily forecast
      const dailyResponse = await fetch(`/api/weather/openmeteo-forecast?locationKey=${locationKey}&type=daily&days=5`);
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        // API returns object with DailyForecasts array
        if (dailyData && dailyData.DailyForecasts) {
          fiveDayForecast = dailyData.DailyForecasts.map(d => {
            const date = new Date(d.Date);
            const dayName = date.toLocaleDateString('ko-KR', {
              weekday: 'short'
            });
            return {
              day: dayName,
              date: date.getDate(),
              condition: d.Day?.IconPhrase || 'Unknown',
              high: Math.round(d.Temperature?.Maximum?.Value || 0),
              low: Math.round(d.Temperature?.Minimum?.Value || 0),
              precipitation: d.Day?.PrecipitationProbability || 0,
              icon: getWeatherIcon(d.Day?.Icon || 0)
            };
          });
        }
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
    } finally {
      loading = false;
    }
  }

  // WMO Weather Code to emoji icon mapping
  function getWeatherIcon(code) {
    if (code === 0 || code === 1) return '☀️'; // Clear/Sunny
    if (code === 2) return '⛅'; // Partly cloudy
    if (code === 3) return '☁️'; // Overcast
    if (code >= 45 && code <= 48) return '🌫️'; // Fog
    if (code >= 51 && code <= 57) return '🌦️'; // Drizzle
    if (code >= 61 && code <= 67) return '🌧️'; // Rain
    if (code >= 71 && code <= 77) return '🌨️'; // Snow
    if (code >= 80 && code <= 82) return '🌧️'; // Rain showers
    if (code >= 85 && code <= 86) return '❄️'; // Snow showers
    if (code >= 95 && code <= 99) return '⛈️'; // Thunderstorm
    return '☁️'; // Default
  }

  // Determine if rain effect should be shown based on weather code
  function shouldShowRain(code) {
    // Show rain for drizzle, rain, rain showers, and thunderstorms
    return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
  }

  // 시간 형식 변환
  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.getHours().toString().padStart(2, '0') + ':00';
  }

  // 선택된 날짜의 24시간 데이터 업데이트
  function updateHourlyForecastForDay(dayIndex) {
    if (!allHourlyData.length) return;

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayIndex);

    const targetDateString = targetDate.toDateString();

    // 해당 날짜의 24시간 데이터 필터링
    const dayHourlyData = allHourlyData.filter(h => {
      const itemDate = new Date(h.dateTime);
      return itemDate.toDateString() === targetDateString;
    });

    // 미세먼지 데이터와 결합 - 간단한 DateTime 매칭
    console.log('🔄 Starting air quality matching...');
    console.log('🔄 Day hourly data count:', dayHourlyData.length);
    console.log('🔄 Air quality data count:', airQualityData.length);

    hourlyForecast = dayHourlyData.map((h, index) => {
      const airData = airQualityData.find(air => air.DateTime === h.dateTime);
      if (airData) {
        console.log(`✅ Match found for ${h.dateTime}: PM10=${airData.PM10}, PM25=${airData.PM25}`);
      } else {
        console.log(`❌ No match for ${h.dateTime}`);
      }
      return {
        ...h,
        pm10: Math.round((airData?.PM10) || 0),
        pm25: Math.round((airData?.PM25) || 0)
      };
    });
  }


  // 날짜 선택 핸들러
  function selectDay(index) {
    console.log('Selecting day:', index);
    selectedDayIndex = index;
    updateSelectedDayHourlyForecast(index);
    viewMode = 'detail';
    console.log('Selected day hourly data:', selectedDayHourlyData);
  }

  // 리스트 뷰로 돌아가기
  function backToList() {
    viewMode = 'list';
    selectedDayIndex = null;
    selectedDayHourlyData = [];
  }

  // 선택된 날짜의 시간별 예보 업데이트
  function updateSelectedDayHourlyForecast(dayIndex) {
    console.log('Updating hourly forecast for day:', dayIndex);
    console.log('All hourly data length:', allHourlyData.length);

    if (!allHourlyData.length) {
      console.log('No hourly data available');
      return;
    }

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayIndex);
    const targetDateString = targetDate.toDateString();
    console.log('Target date:', targetDateString);

    // 해당 날짜의 24시간 데이터 필터링
    const dayHourlyData = allHourlyData.filter(h => {
      const itemDate = new Date(h.dateTime);
      return itemDate.toDateString() === targetDateString;
    });

    console.log('Filtered hourly data count:', dayHourlyData.length);

    // 미세먼지 데이터와 결합
    selectedDayHourlyData = dayHourlyData.map(h => {
      const airData = airQualityData.find(air => air.DateTime === h.dateTime);
      const hour = new Date(h.dateTime).getHours();

      // 체감온도 간단 계산 (실제 계산식은 더 복잡함)
      const feelsLike = h.temp - (h.precipitation > 50 ? 2 : 0);

      return {
        hour: `${hour.toString().padStart(2, '0')}시`,
        temp: h.temp,
        feelsLike: Math.round(feelsLike),
        precipitation: h.precipitation,
        pm10: airData?.PM10 ? Math.round(airData.PM10) : 0,
        pm25: airData?.PM25 ? Math.round(airData.PM25) : 0,
        icon: h.icon
      };
    });

    console.log('Final selectedDayHourlyData:', selectedDayHourlyData);
  }

  // 지역 클릭 핸들러
  function openLocationSearch() {
    showLocationSearch = true;
    searchQuery = '';
    searchResults = [];
  }

  // 검색 모달 닫기
  function closeLocationSearch() {
    showLocationSearch = false;
    searchQuery = '';
    searchResults = [];
  }

  // 지역 검색 함수 (실제 API 사용)
  async function searchLocations() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    isSearching = true;
    try {
      // OpenStreetMap Nominatim API 사용
      const encodedQuery = encodeURIComponent(searchQuery);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&countrycodes=kr&limit=10&addressdetails=1&accept-language=ko`;

      const response = await fetch(nominatimUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Nominatim API response:', data);

      // API 응답을 우리 형식으로 변환
      const locations = data.map(item => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const coordinates = `${lat}_${lon}`;

        // 지역명 추출 (한국어 우선)
        let name = '';
        let fullName = item.display_name;

        if (item.address) {
          // 시/군/구 이름 추출
          name = item.address.city ||
                 item.address.town ||
                 item.address.county ||
                 item.address.suburb ||
                 item.address.municipality ||
                 searchQuery;
        } else {
          // display_name에서 첫 번째 부분 추출
          name = item.display_name.split(',')[0];
        }

        return {
          name: name,
          coordinates: coordinates,
          fullName: fullName
        };
      });

      // 중복 제거 (같은 좌표의 결과)
      const uniqueLocations = locations.filter((location, index, self) =>
        index === self.findIndex(l => l.coordinates === location.coordinates)
      );

      searchResults = uniqueLocations.slice(0, 8); // 최대 8개 결과만 표시
    } catch (error) {
      console.error('Location search error:', error);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  // 지역 선택 함수
  async function selectLocation(selectedLocation) {
    location = selectedLocation.fullName;
    locationKey = selectedLocation.coordinates;

    // 모달 닫기
    closeLocationSearch();

    // 새로운 지역의 날씨 데이터 로드
    await loadWeatherData();
  }
</script>

<div class="weather-container">
  <!-- Rain effect overlay -->
  {#if showRainEffect}
    <div class="rain-effect"></div>
  {/if}

  <!-- Main App Grid -->
  <main class="app">
    <!-- Current Weather Section -->
    <section class="current">
      <!-- Header -->
      <header class="header">
        <div class="date-time">
          <div class="date">{currentDate}</div>
          <div class="time">{currentTime}</div>
        </div>
      </header>

      <!-- Main weather display -->
      <div class="temperature-display">
        <div class="location" on:click={openLocationSearch} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && openLocationSearch()}>
          <svg class="location-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          {location}
          <svg class="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div class="temp-value">{currentTemp}°C</div>
        <div class="weather-status">{weatherCondition}</div>
        <div class="wind-info">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
          </svg>
          <span>Northwest {windSpeed} km/h</span>
        </div>
      </div>
    </section>

    <!-- Hourly Forecast Section -->
    <section class="hourly">
      <div class="hourly-track">
        {#each hourlyForecast as hour}
          <div class="hour-card">
            <div class="hour-card-top">
              <div class="hour-time">{hour.time}</div>
              <div class="hour-icon">{hour.icon}</div>
              <div class="hour-temp">{hour.temp}°C</div>
            </div>
            <div class="hour-card-bottom">
              <div class="hour-precipitation">💧 {hour.precipitation}%</div>
              <div class="hour-air-quality">
                <div class="pm-value pm10">PM10: {hour.pm10}</div>
                <div class="pm-value pm25">PM2.5: {hour.pm25}</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Sidebar - Weekly Forecast -->
    <aside class="sidebar">
      <div class="weekly-section">
        <div class="weekly-header">
          <h2>주간 날씨</h2>
          <div class="weekly-subtitle">5일간 예보</div>
        </div>

        <div class="weekly-content">
          <div class="weekly-slider" style="transform: translateX({viewMode === 'detail' ? '-50%' : '0'})">
            <!-- 주간 날씨 리스트 페이지 -->
            <div class="weekly-page">
              <div class="weekly-list">
                {#each fiveDayForecast as day, index}
                  <div
                    class="day-item"
                    class:today={index === 0}
                    on:click={() => selectDay(index)}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => e.key === 'Enter' && selectDay(index)}
                  >
                    <div class="day-info">
                      <div class="day-name">{day.day}</div>
                      <div class="day-date">{day.date}일</div>
                    </div>

                    <div class="day-weather">
                      <div class="day-icon">{day.icon}</div>
                      <div class="day-condition">{day.condition}</div>
                    </div>

                    <div class="day-temps">
                      <div class="temp-high">{day.high}°</div>
                      <div class="temp-low">{day.low}°</div>
                    </div>

                    <div class="day-rain">
                      <span class="rain-icon">💧</span>
                      <span class="rain-percent">{day.precipitation}%</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- 시간별 예보 상세 페이지 -->
            <div class="weekly-page">
              <div class="detail-header">
                <button class="back-button" on:click={backToList}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <h3>
                  {#if selectedDayIndex !== null && fiveDayForecast[selectedDayIndex]}
                    {fiveDayForecast[selectedDayIndex].day} {fiveDayForecast[selectedDayIndex].date}일
                  {:else}
                    시간별 예보
                  {/if}
                </h3>
              </div>
              <div class="hourly-forecast-list">
                {#if selectedDayHourlyData.length > 0}
                  {#each selectedDayHourlyData as hour}
                    <div class="hourly-item">
                      <div class="hourly-time">{hour.hour}</div>
                      <div class="hourly-icon">{hour.icon}</div>
                      <div class="hourly-details">
                        <div class="hourly-temp">
                          <span class="temp-label">기온</span>
                          <span class="temp-value">{hour.temp}°</span>
                        </div>
                        <div class="hourly-feels">
                          <span class="feels-label">체감</span>
                          <span class="feels-value">{hour.feelsLike}°</span>
                        </div>
                        <div class="hourly-rain">
                          <span class="rain-label">💧</span>
                          <span class="rain-value">{hour.precipitation}%</span>
                        </div>
                        <div class="hourly-dust">
                          <div class="dust-item">
                            <span class="dust-label">PM10</span>
                            <span class="dust-value" class:good={hour.pm10 < 30} class:moderate={hour.pm10 >= 30 && hour.pm10 < 80} class:bad={hour.pm10 >= 80}>
                              {hour.pm10}
                            </span>
                          </div>
                          <div class="dust-item">
                            <span class="dust-label">PM2.5</span>
                            <span class="dust-value" class:good={hour.pm25 < 15} class:moderate={hour.pm25 >= 15 && hour.pm25 < 35} class:bad={hour.pm25 >= 35}>
                              {hour.pm25}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  {/each}
                {:else}
                  <div class="loading-placeholder">
                    <span>데이터를 불러오는 중...</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>

      </div>
    </aside>
  </main>

  <!-- Location Search Modal -->
  {#if showLocationSearch}
    <div class="location-search-overlay" on:click={closeLocationSearch}>
      <div class="location-search-modal" on:click|stopPropagation>
        <div class="search-header">
          <h3>지역 검색</h3>
          <button class="close-button" on:click={closeLocationSearch}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="search-input-container">
          <button class="search-button" on:click={searchLocations} type="button">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          <input
            type="text"
            class="search-input"
            placeholder="도시명을 입력하세요..."
            bind:value={searchQuery}
            on:keydown={(e) => e.key === 'Enter' && searchLocations()}
            autocomplete="off"
          />
          {#if isSearching}
            <div class="search-loading">검색 중...</div>
          {/if}
        </div>

        <div class="search-results">
          {#if searchResults.length > 0}
            {#each searchResults as result}
              <div
                class="search-result-item"
                on:click={() => selectLocation(result)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && selectLocation(result)}
              >
                <div class="result-main">
                  <div class="result-name">{result.name}</div>
                  <div class="result-full-name">{result.fullName}</div>
                </div>
                <svg class="result-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </div>
            {/each}
          {:else if searchQuery.trim() && !isSearching}
            <div class="no-results">검색 결과가 없습니다.</div>
          {:else if !searchQuery.trim()}
            <div class="search-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <p>찾고 싶은 지역명을 입력해주세요</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }

  .weather-container {
    min-height: 100vh;
    background: linear-gradient(180deg, #0a1929 0%, #1e3a5f 100%);
    color: white;
    position: relative;
    overflow: hidden;
  }

  /* Rain effect */
  .rain-effect {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0.3;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cline x1='50' y1='0' x2='50' y2='10' stroke='%23ffffff' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 50px 100px;
    animation: rain 1s linear infinite;
  }

  @keyframes rain {
    0% {
      transform: translateY(-100px);
    }
    100% {
      transform: translateY(100px);
    }
  }

  :root {
    --gap: 12px;
  }

  .app {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(220px, 20vw, 300px);
    grid-template-rows: auto auto;
    grid-template-areas:
      "current sidebar"
      "hourly sidebar";
    gap: var(--gap);
    align-items: start;
    padding: 4px 1px;
    min-height: 100vh;
    width: 98vw;
    margin: 0 auto;
  }

  /* Section Areas */
  .current {
    grid-area: current;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(6px);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .hourly {
    grid-area: hourly;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(6px);
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
    overflow-y: visible;
    min-height: 160px;
  }

  .sidebar {
    grid-area: sidebar;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(6px);
    border-radius: 12px;
    padding: 20px;
    position: sticky;
    top: 16px;
    height: fit-content;
    max-height: calc(100vh - 32px);
    overflow: hidden;
  }

  /* Header within current section */
  .header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .date-time {
    display: flex;
    gap: 2rem;
    align-items: center;
  }

  .date {
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .time {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .location {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1.3rem;
    opacity: 0.9;
    margin-bottom: 1.5rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 12px;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .location:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .location-icon {
    opacity: 0.7;
  }

  .edit-icon {
    opacity: 0.5;
    transition: opacity 0.3s ease;
  }

  .location:hover .edit-icon {
    opacity: 0.8;
  }

  .temperature-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    flex: 1;
    justify-content: center;
  }

  .temp-value {
    font-size: 6rem;
    font-weight: 300;
    line-height: 1;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .weather-status {
    font-size: 2.5rem;
    font-weight: 300;
    opacity: 0.9;
    letter-spacing: 2px;
  }

  .wind-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    opacity: 0.7;
    margin-top: 1rem;
  }

  /* Hourly Track */
  .hourly-track {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 6px;
    overflow: hidden;
    padding-bottom: 8px;
  }

  /* 주간 날씨 섹션 스타일 */
  .weekly-section {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .weekly-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .weekly-slider {
    display: flex;
    width: 200%;
    height: 100%;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .weekly-page {
    width: 50%;
    height: 100%;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .weekly-header {
    text-align: center;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .weekly-header h2 {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 0.3rem 0;
    color: white;
    letter-spacing: -0.02em;
  }

  .weekly-subtitle {
    font-size: 0.85rem;
    opacity: 0.6;
    font-weight: 400;
    color: white;
  }

  .weekly-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    overflow-y: auto;
  }

  .day-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    gap: 1rem;
    cursor: pointer;
  }

  .day-item:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(-3px);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .day-item.today {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }


  .day-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 45px;
  }

  .day-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: white;
  }

  .day-date {
    font-size: 0.75rem;
    opacity: 0.6;
  }

  .day-weather {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
    text-align: center;
  }

  .day-icon {
    font-size: 1.8rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  }

  .day-condition {
    font-size: 0.7rem;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }

  .day-temps {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .temp-high {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
  }

  .temp-low {
    font-size: 0.9rem;
    opacity: 0.6;
  }

  .day-rain {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 45px;
    justify-content: flex-end;
  }

  .rain-icon {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .rain-percent {
    font-size: 0.85rem;
    color: #66B2FF;
    font-weight: 500;
  }

  /* Detail Header Styles */
  .detail-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem 1rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 1rem;
  }

  .detail-header h3 {
    flex: 1;
    text-align: center;
    font-size: 1.1rem;
    font-weight: 500;
    color: white;
    margin: 0;
  }

  .back-button {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    color: white;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(-2px);
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }

  .hourly-forecast-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 0.5rem;
    height: calc(100% - 70px);
    overflow-y: auto;
  }

  .hourly-item {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.8rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.3s ease;
  }

  .hourly-item:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .hourly-time {
    font-size: 0.85rem;
    font-weight: 500;
    color: white;
    opacity: 0.8;
    min-width: 35px;
  }

  .hourly-icon {
    font-size: 1.4rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  }

  .hourly-details {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .hourly-temp, .hourly-feels, .hourly-rain {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .temp-label, .feels-label {
    font-size: 0.7rem;
    opacity: 0.6;
    color: white;
  }

  .temp-value, .feels-value {
    font-size: 0.9rem;
    font-weight: 500;
    color: white;
  }

  .rain-label {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .rain-value {
    font-size: 0.85rem;
    color: #66B2FF;
    font-weight: 500;
  }

  .hourly-dust {
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }

  .dust-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .dust-label {
    font-size: 0.65rem;
    opacity: 0.5;
    color: white;
  }

  .dust-value {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.15rem 0.3rem;
    border-radius: 4px;
  }

  .dust-value.good {
    background: rgba(76, 175, 80, 0.2);
    color: #4CAF50;
  }

  .dust-value.moderate {
    background: rgba(255, 167, 38, 0.2);
    color: #FFA726;
  }

  .dust-value.bad {
    background: rgba(244, 67, 54, 0.2);
    color: #F44336;
  }

  /* Scrollbar for hourly forecast list */
  .hourly-forecast-list::-webkit-scrollbar {
    width: 4px;
  }

  .hourly-forecast-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
  }

  .hourly-forecast-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }

  .hourly-forecast-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .hour-card {
    display: flex;
    flex-direction: column;
    width: 70px;
    height: 130px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    transition: all 0.3s;
    justify-content: space-between;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .hour-card-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
    justify-content: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }

  .hour-card-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
    justify-content: center;
    padding-top: 0.5rem;
  }

  .hour-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  .hour-time {
    font-size: 0.7rem;
    opacity: 0.7;
    font-weight: 500;
  }

  .hour-icon {
    font-size: 1.2rem;
  }

  .hour-temp {
    font-size: 0.8rem;
    font-weight: 500;
  }

  .hour-precipitation {
    font-size: 0.6rem;
    color: #66B2FF;
    opacity: 0.9;
    margin-bottom: 0.15rem;
  }

  .hour-air-quality {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    text-align: center;
  }

  .pm-value {
    font-size: 0.6rem;
    opacity: 0.8;
    padding: 0.1rem 0.25rem;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.05);
    line-height: 1.2;
  }

  .pm-value.pm10 {
    color: #ffa726;
  }

  .pm-value.pm25 {
    color: #ff7043;
  }


  /* Responsive */
  @media (max-width: 1024px) {
    .app {
      grid-template-columns: 1fr;
      grid-template-rows: auto 2.5fr 0.4fr;
      grid-template-areas:
        "current"
        "hourly"
        "sidebar";
      gap: calc(var(--gap) * 0.75);
      min-height: 100vh;
    }

    .sidebar {
      position: static;
      max-height: none;
    }

    .details-grid {
      grid-template-columns: 1fr;
      gap: 0.8rem;
    }

    .hourly {
      padding: 20px 20px;
    }

    .hourly-track {
      display: grid;
      grid-template-rows: repeat(2, 1fr);
      grid-auto-flow: column;
      grid-auto-columns: 100px;
      overflow-x: auto;
      overflow-y: hidden;
      gap: 6px;
      padding-bottom: 4px;
    }

    .hour-card {
      width: 80px;
      height: 120px;
      padding: 4px 1px;
    }

    .temp-value {
      font-size: 4rem;
    }

    .weather-status {
      font-size: 2rem;
    }
  }

  @media (max-width: 768px) {
    :root {
      --gap: 8px;
    }

    .app {
      padding: 4px 1px;
      grid-template-rows: auto auto 1fr;
      min-height: 100vh;
    }

    .header {
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
      padding: 12px 16px;
    }

    .date-time {
      flex-direction: column;
      gap: 0.25rem;
    }

    .temp-value {
      font-size: 3.5rem;
    }

    .weather-status {
      font-size: 1.5rem;
    }

    .sidebar {
      max-height: none;
      padding: 16px;
    }

    .details-grid {
      grid-template-columns: 1fr;
      gap: 0.8rem;
    }

    .hourly {
      padding: 6px 16px;
    }

    .hourly-track {
      display: grid;
      grid-template-rows: repeat(2, 1fr);
      grid-auto-flow: column;
      grid-auto-columns: 90px;
      overflow-x: auto;
      overflow-y: hidden;
      gap: 8px;
      padding-bottom: 4px;
    }

    .hour-card {
      width: 70px;
      height: 110px;
      padding: 6px;
    }

    .hour-time {
      font-size: 0.7rem;
    }

    .hour-icon {
      font-size: 1.2rem;
    }

    .hour-temp {
      font-size: 0.8rem;
    }

    .pm-value {
      font-size: 0.55rem;
    }
  }

  /* Location Search Modal Styles */
  .location-search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: overlayFadeIn 0.3s ease-out;
  }

  @keyframes overlayFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .location-search-modal {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .search-header h3 {
    margin: 0;
    color: white;
    font-size: 1.3rem;
    font-weight: 600;
  }

  .close-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    color: white;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  .search-input-container {
    position: relative;
    padding: 1.5rem 2rem 1rem 2rem;
  }

  .search-button {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 2;
  }

  .search-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-50%) scale(1.1);
  }

  .search-icon {
    color: rgba(255, 255, 255, 0.7);
    transition: color 0.3s ease;
  }

  .search-button:hover .search-icon {
    color: rgba(255, 255, 255, 0.9);
  }

  .search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 1rem 1rem 1rem 4rem;
    color: white;
    font-size: 1rem;
    outline: none;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .search-input:focus {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  .search-loading {
    position: absolute;
    right: 3rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }

  .search-results {
    max-height: 400px;
    overflow-y: auto;
    padding: 0 1rem 1.5rem 1rem;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    margin: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .search-result-item:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateX(4px);
  }

  .result-main {
    flex: 1;
  }

  .result-name {
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.2rem;
  }

  .result-full-name {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }

  .result-arrow {
    color: rgba(255, 255, 255, 0.4);
    transition: all 0.3s ease;
  }

  .search-result-item:hover .result-arrow {
    color: rgba(255, 255, 255, 0.8);
    transform: translateX(4px);
  }

  .no-results {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
  }

  .search-placeholder {
    text-align: center;
    padding: 3rem 2rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .search-placeholder svg {
    opacity: 0.3;
    margin-bottom: 1rem;
  }

  .search-placeholder p {
    margin: 0;
    font-size: 1rem;
  }

  .search-results::-webkit-scrollbar {
    width: 6px;
  }

  .search-results::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .search-results::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .search-results::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>