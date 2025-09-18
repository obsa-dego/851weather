<script>
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';

  // State variables
  let currentTime = '';
  let currentDate = '';
  let currentTemp = '--';
  let weatherCondition = 'Loading...';
  let windSpeed = 0;
  let location = 'Gimpo, Korea';
  let showRainEffect = false;
  let currentWeatherCode = 0;
  let greeting = '';

  // 5-day forecast data
  let fiveDayForecast = [];

  // Hourly forecast data (24시간)
  let hourlyForecast = [];
  let allHourlyData = []; // 5일간의 모든 시간별 데이터
  let airQualityData = []; // 미세먼지 데이터

  // Selected day for hourly forecast
  let selectedDay = null;
  let selectedDayIndex = null;
  let selectedDayHourlyData = [];
  let showHourlyDetail = false;
  let transitioning = false;
  let currentPage = 0;

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
    const hour = now.getHours();

    // Set greeting based on time
    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good Evening';
    } else {
      greeting = 'Good Night';
    }

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
            hour: formatTime(h.DateTime), // 'hour' 필드 추가
            temp: Math.round(h.Temperature?.Value || 0),
            feelsLike: Math.round(h.RealFeelTemperature?.Value || h.Temperature?.Value || 0), // 체감온도 추가
            icon: getWeatherIcon(h.WeatherIcon),
            dateTime: h.DateTime,
            date: new Date(h.DateTime).toDateString(),
            precipitation: h.PrecipitationProbability || 0,
            pm10: 0, // 초기값
            pm25: 0  // 초기값
          }));

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

          // 미세먼지 데이터를 allHourlyData에 병합
          if (allHourlyData.length > 0 && airQualityData.length > 0) {
            allHourlyData = allHourlyData.map((hour, index) => {
              const airDataForHour = airQualityData[index] || {};
              return {
                ...hour,
                pm10: Math.round(airDataForHour.PM10 || 0),
                pm25: Math.round(airDataForHour.PM25 || 0)
              };
            });
          }

          // 하단 섹션 업데이트
          updateHourlyForecastForDay(0);

          // 만약 상세 보기 중이었다면 데이터 다시 업데이트
          if (selectedDayIndex !== null && showHourlyDetail) {
            updateSelectedDayHourlyForecast(selectedDayIndex);
          }
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

    // 미세먼지 데이터와 결합
    hourlyForecast = dayHourlyData.map((h, index) => {
      const airData = airQualityData.find(air => air.DateTime === h.dateTime);
      return {
        ...h,
        pm10: Math.round((airData?.PM10) || 0),
        pm25: Math.round((airData?.PM25) || 0)
      };
    });
  }

  // 날짜 선택 핸들러
  function selectDay(index) {
    console.log("Day clicked:", index);

    if (selectedDay === index) {
      // 같은 날짜 클릭 시 토글
      selectedDay = null;
      selectedDayHourlyData = null;
      selectedDayIndex = null;
    } else {
      // 선택된 날짜의 시간별 데이터 설정
      if (allHourlyData && allHourlyData.length > 0) {
        const startIndex = index * 24;
        selectedDayHourlyData = allHourlyData.slice(startIndex, startIndex + 24);
        console.log("Selected day hourly data sample:", selectedDayHourlyData.slice(0, 3));
      } else {
        selectedDayHourlyData = [];
        console.log("No hourly data available");
      }
      selectedDay = index;
      selectedDayIndex = index;
    }
  }

  // 선택된 날짜의 시간별 예보 업데이트
  function updateSelectedDayHourlyForecast(dayIndex) {
    if (!allHourlyData.length) {
      return;
    }

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayIndex);
    const targetDateString = targetDate.toDateString();

    // 해당 날짜의 24시간 데이터 필터링
    const dayHourlyData = allHourlyData.filter(h => {
      const itemDate = new Date(h.dateTime);
      return itemDate.toDateString() === targetDateString;
    });

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

<div class="weather-app">
  <!-- Main Content -->
  <div class="main-content">
    <!-- Left Section -->
    <div class="left-section">
      <div class="greeting-container">
        <h1 class="greeting">{greeting}</h1>
        <p class="subtitle">Get ready for your weather forecast 😎</p>
      </div>

      <!-- 3D Weather Visual -->
      <div class="weather-visual">
        {#if currentWeatherCode >= 61 && currentWeatherCode <= 99}
          <div class="cloud-rain">
            <div class="cloud"></div>
            <div class="rain-drops">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        {:else if currentWeatherCode >= 3 && currentWeatherCode <= 48}
          <div class="cloud-only">
            <div class="cloud"></div>
          </div>
        {:else}
          <div class="sun-cloud">
            <div class="sun"></div>
            <div class="small-cloud"></div>
          </div>
        {/if}
      </div>

      <!-- Location Button -->
      <button class="location-btn" on:click={openLocationSearch}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        {location}
      </button>
    </div>

    <!-- Center Section - Temperature -->
    <div class="center-section">
      <div class="temperature-container">
        <span class="temp-value">{currentTemp}</span>
        <span class="temp-unit">°C</span>
      </div>
      <div class="weather-status">{weatherCondition}</div>
      <div class="wind-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
        </svg>
        Wind {windSpeed} km/h
      </div>
    </div>

    <!-- Right Section - Weekly Forecast -->
    <div class="right-section">
      <!-- Dynamic Header -->
      <div class="weekly-header">
        {#if selectedDay === null}
          <div class="header-content" in:fade={{duration: 300, easing: cubicInOut}}>
            <h3>THIS WEEK</h3>
            <span class="current-date">{currentDate}</span>
          </div>
        {:else}
          <div class="header-content selected" in:fade={{duration: 300, easing: cubicInOut}}>
            <button class="back-btn" on:click={() => {selectedDay = null; selectedDayIndex = null;}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <h3>{fiveDayForecast[selectedDay]?.day === '토' || fiveDayForecast[selectedDay]?.day === '일' ? fiveDayForecast[selectedDay]?.day + '요일' : selectedDay === 0 ? '오늘' : fiveDayForecast[selectedDay]?.day + '요일'}</h3>
            <span class="selected-date">{fiveDayForecast[selectedDay]?.date}일</span>
          </div>
        {/if}
      </div>

      <!-- Content Area with Transitions -->
      <div class="weekly-content">
        {#if selectedDay === null}
          <!-- Weekly List -->
          <div class="weekly-list"
               in:fly={{y: 20, duration: 400, easing: cubicInOut}}
               out:fly={{y: -20, duration: 300, easing: cubicInOut}}>
            {#each fiveDayForecast as day, index}
              <button
                class="day-card"
                class:active={index === selectedDayIndex}
                on:click={() => selectDay(index)}
              >
                <div class="day-left">
                  <span class="day-name">{index === 0 ? 'Today' : day.day}</span>
                  <span class="day-icon">{day.icon}</span>
                </div>
                <div class="day-right">
                  <span class="day-temp">{day.high}°</span>
                  <span class="day-temp-low">{day.low}°</span>
                  {#if day.precipitation > 30}
                    <span class="rain-badge">💧 {day.precipitation}%</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {:else if selectedDayHourlyData}
          <!-- Hourly Detail -->
          <div class="weekly-hourly-detail"
               in:fly={{y: 20, duration: 400, easing: cubicInOut}}
               out:fly={{y: -20, duration: 300, easing: cubicInOut}}>
            <div class="weekly-hourly-scroll">
              {#each selectedDayHourlyData as hour, i}
                <div class="weekly-hour-item"
                     in:fly={{y: 10, delay: Math.min(i * 30, 300), duration: 300, easing: cubicInOut}}>
                  <div class="weekly-hour-time">{hour.hour || hour.time?.split(":")[0] + 'h' || '0h'}</div>
                  <div class="weekly-hour-data">
                    <div class="data-row">
                      <span class="data-label">기온:</span>
                      <span class="data-value">{hour.temp || hour.temperature || 0}°C</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">체감:</span>
                      <span class="data-value">{hour.feelsLike || 0}°C</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">강수:</span>
                      <span class="data-value">{hour.precipitation || 0}mm</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">PM10:</span>
                      <span class="data-value">{hour.pm10 || 0}µg/m³</span>
                    </div>
                    <div class="data-row">
                      <span class="data-label">PM2.5:</span>
                      <span class="data-value">{hour.pm25 || 0}µg/m³</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom Section - Hourly Forecast -->
  <div class="bottom-section">
    <div class="hourly-header">
      <h3>TODAY'S HOURLY</h3>
      {#if showHourlyDetail && selectedDayIndex !== null}
        <button class="back-btn" on:click={() => {showHourlyDetail = false; selectedDayIndex = null;}}>
          Back to Today
        </button>
      {/if}
    </div>

    <div class="hourly-scroll">
      {#if !showHourlyDetail}
        <!-- Today's hourly forecast -->
        {#each hourlyForecast.slice(0, 24) as hour}
          <div class="hour-card">
            <span class="hour-time">{hour.time}</span>
            <span class="hour-icon">{hour.icon}</span>
            <span class="hour-temp">{hour.temp}°</span>
            {#if hour.precipitation > 0}
              <span class="hour-rain">💧{hour.precipitation}%</span>
            {/if}
          </div>
        {/each}
      {:else}
        <!-- Selected day's detailed hourly forecast -->
        {#each selectedDayHourlyData as hour}
          <div class="hour-detail-card">
            <div class="hour-detail-time">{hour.hour}</div>
            <div class="hour-detail-icon">{hour.icon}</div>
            <div class="hour-detail-info">
              <div class="info-row">
                <span class="info-label">기온</span>
                <span class="info-value">{hour.temp}°</span>
              </div>
              <div class="info-row">
                <span class="info-label">체감</span>
                <span class="info-value">{hour.feelsLike}°</span>
              </div>
              <div class="info-row">
                <span class="info-label">강수</span>
                <span class="info-value">{hour.precipitation}%</span>
              </div>
              <div class="info-row">
                <span class="info-label">PM10</span>
                <span class="info-value" class:good={hour.pm10 < 30} class:bad={hour.pm10 >= 80}>
                  {hour.pm10}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">PM2.5</span>
                <span class="info-value" class:good={hour.pm25 < 15} class:bad={hour.pm25 >= 35}>
                  {hour.pm25}
                </span>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Location Search Modal -->
  {#if showLocationSearch}
    <div class="modal-overlay" on:click={closeLocationSearch}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h3>Search Location</h3>
          <button class="close-btn" on:click={closeLocationSearch}>×</button>
        </div>

        <div class="search-container">
          <input
            type="text"
            class="search-input"
            placeholder="Enter city name..."
            bind:value={searchQuery}
            on:keydown={(e) => e.key === 'Enter' && searchLocations()}
          />
          <button class="search-btn" on:click={searchLocations}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>

        <div class="search-results">
          {#if isSearching}
            <div class="searching">Searching...</div>
          {:else if searchResults.length > 0}
            {#each searchResults as result}
              <button class="result-item" on:click={() => selectLocation(result)}>
                <span class="result-name">{result.name}</span>
                <span class="result-full">{result.fullName}</span>
              </button>
            {/each}
          {:else if searchQuery && !isSearching}
            <div class="no-results">No results found</div>
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .weather-app {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    color: white;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr auto 300px;
    gap: 60px;
    padding: 40px 60px;
    align-items: center;
  }

  /* Left Section */
  .left-section {
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .greeting-container {
    animation: fadeInUp 0.6s ease-out;
  }

  .greeting {
    font-size: 3.5rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    margin: 10px 0 0 0;
  }

  /* 3D Weather Visual */
  .weather-visual {
    width: 250px;
    height: 200px;
    position: relative;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .sun {
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, #FFD93D 0%, #FF6B6B 100%);
    border-radius: 50%;
    position: absolute;
    top: 20px;
    left: 100px;
    box-shadow: 0 20px 40px rgba(255, 107, 107, 0.4);
    animation: rotate 20s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .cloud, .small-cloud {
    background: linear-gradient(135deg, #ffffff 0%, #e8f4ff 100%);
    border-radius: 100px;
    position: absolute;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  .cloud {
    width: 160px;
    height: 60px;
    top: 80px;
    left: 20px;
  }

  .cloud::before, .cloud::after {
    content: '';
    background: linear-gradient(135deg, #ffffff 0%, #e8f4ff 100%);
    position: absolute;
    border-radius: 100px;
  }

  .cloud::before {
    width: 80px;
    height: 80px;
    top: -40px;
    left: 20px;
  }

  .cloud::after {
    width: 60px;
    height: 60px;
    top: -30px;
    right: 20px;
  }

  .small-cloud {
    width: 80px;
    height: 30px;
    top: 40px;
    left: 20px;
    opacity: 0.8;
  }

  .cloud-rain .cloud, .cloud-only .cloud {
    background: linear-gradient(135deg, #a8b8d8 0%, #8898c8 100%);
  }

  .cloud-rain .cloud::before, .cloud-rain .cloud::after,
  .cloud-only .cloud::before, .cloud-only .cloud::after {
    background: linear-gradient(135deg, #a8b8d8 0%, #8898c8 100%);
  }

  .rain-drops {
    position: absolute;
    top: 140px;
    left: 40px;
    display: flex;
    gap: 15px;
  }

  .rain-drops span {
    width: 3px;
    height: 20px;
    background: linear-gradient(to bottom, transparent, #4FC3F7);
    border-radius: 10px;
    animation: rain 1s linear infinite;
  }

  .rain-drops span:nth-child(2) { animation-delay: 0.2s; }
  .rain-drops span:nth-child(3) { animation-delay: 0.4s; }
  .rain-drops span:nth-child(4) { animation-delay: 0.6s; }
  .rain-drops span:nth-child(5) { animation-delay: 0.8s; }

  @keyframes rain {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(30px); opacity: 0; }
  }

  .location-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 30px;
    color: white;
    padding: 12px 20px;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    width: fit-content;
  }

  .location-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  /* Center Section */
  .center-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    animation: fadeInUp 0.8s ease-out 0.2s both;
  }

  .temperature-container {
    display: flex;
    align-items: flex-start;
  }

  .temp-value {
    font-size: 8rem;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .temp-unit {
    font-size: 3rem;
    font-weight: 400;
    margin-top: 15px;
    opacity: 0.8;
  }

  .weather-status {
    font-size: 1.3rem;
    opacity: 0.9;
    text-align: center;
  }

  .wind-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.95rem;
    opacity: 0.8;
  }

  /* Right Section */
  .right-section {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border-radius: 30px;
    padding: 25px 20px;
    animation: fadeInUp 1s ease-out 0.4s both;
    height: 420px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .weekly-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    height: 35px;
    flex-shrink: 0;
  }

  .weekly-header h3 {
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    margin: 0;
    opacity: 0.9;
  }

  .current-date {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
  }

  .header-content.selected {
    justify-content: flex-start;
    gap: 15px;
  }

  .back-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: white;
  }

  .back-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(-2px);
  }

  .back-btn:active {
    transform: scale(0.95) translateX(-2px);
  }

  .selected-date {
    font-size: 0.8rem;
    opacity: 0.7;
    margin-left: auto;
  }

  .weekly-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .weekly-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    overflow-y: auto;
  }

  .day-card {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 15px;
    padding: 15px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    color: white;
  }

  .day-card:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(-5px);
  }

  .day-card.active {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .day-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .day-name {
    font-size: 0.95rem;
    font-weight: 500;
    min-width: 50px;
  }

  .day-icon {
    font-size: 1.5rem;
  }

  .day-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .day-temp {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .day-temp-low {
    font-size: 0.9rem;
    opacity: 0.6;
  }

  .rain-badge {
    font-size: 0.75rem;
    background: rgba(66, 165, 245, 0.3);
    padding: 2px 6px;
    border-radius: 10px;
  }

  /* Weekly Hourly Detail Section */
  .weekly-hourly-detail {
    display: flex;
    flex-direction: column;
    flex: 1;
    position: relative;
    overflow: hidden;
    height: 100%;
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 8%,
      black 92%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 8%,
      black 92%,
      transparent 100%
    );
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .weekly-hourly-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .weekly-hourly-header h4 {
    margin: 0;
    font-size: 0.9rem;
    color: white;
    opacity: 0.9;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.3s ease;
  }

  .close-btn:hover {
    opacity: 1;
  }

  .weekly-hourly-scroll {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 5px 80px 5px;
    height: calc(100% - 10px);
    /* 스크롤바 완전 숨김 */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 10+ */
  }

  /* Webkit 브라우저 스크롤바 완전 숨김 */
  .weekly-hourly-scroll::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .weekly-hour-item {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s ease;
    min-height: 120px;
  }

  .weekly-hour-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(3px);
  }

  .weekly-hour-time {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    min-width: 60px;
  }

  .weekly-hour-data {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .data-label {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  .data-value {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    gap: 5px;
    color: white;
    animation: fadeInUp 0.4s ease forwards;
  }

  .weekly-hour-time {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .weekly-hour-icon {
    font-size: 1.4rem;
  }

  .weekly-hour-temp {
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Bottom Section */
  .bottom-section {
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    padding: 25px 60px;
    animation: fadeInUp 1.2s ease-out 0.6s both;
  }

  .hourly-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .hourly-header h3 {
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    margin: 0;
    opacity: 0.9;
  }

  .back-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    color: white;
    padding: 8px 16px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .back-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .hourly-scroll {
    display: flex;
    gap: 15px;
    overflow-x: auto;
    padding-bottom: 15px;
  }

  .hourly-scroll::-webkit-scrollbar {
    height: 6px;
  }

  .hourly-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .hourly-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
  }

  .hour-card {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 20px 25px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    min-width: 80px;
    transition: all 0.3s ease;
  }

  .hour-card:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-5px);
  }

  .hour-time {
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .hour-icon {
    font-size: 1.8rem;
  }

  .hour-temp {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .hour-rain {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .hour-detail-card {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 20px;
    min-width: 140px;
    transition: all 0.3s ease;
  }

  .hour-detail-card:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-5px);
  }

  .hour-detail-time {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 10px;
    text-align: center;
  }

  .hour-detail-icon {
    font-size: 2rem;
    text-align: center;
    margin-bottom: 15px;
  }

  .hour-detail-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
  }

  .info-label {
    opacity: 0.7;
  }

  .info-value {
    font-weight: 500;
  }

  .info-value.good {
    color: #4CAF50;
  }

  .info-value.bad {
    color: #FF5252;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }

  .modal {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 30px;
    padding: 30px;
    width: 90%;
    max-width: 500px;
    max-height: 70vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.4s ease;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 1.5rem;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }

  .search-container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .search-input {
    flex: 1;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 15px;
    color: white;
    padding: 12px 20px;
    font-size: 1rem;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .search-btn {
    background: rgba(255, 255, 255, 0.3);
    border: none;
    border-radius: 15px;
    color: white;
    padding: 0 20px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .search-btn:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  .search-results {
    flex: 1;
    overflow-y: auto;
  }

  .result-item {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 15px;
    padding: 15px 20px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    text-align: left;
    color: white;
  }

  .result-item:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(5px);
  }

  .result-name {
    display: block;
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 5px;
  }

  .result-full {
    display: block;
    font-size: 0.85rem;
    opacity: 0.7;
  }

  .searching, .no-results {
    text-align: center;
    padding: 30px;
    opacity: 0.7;
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(50px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .main-content {
      grid-template-columns: 1fr;
      gap: 40px;
      padding: 30px;
    }

    .center-section {
      order: -1;
    }

    .right-section {
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
    }

    .greeting {
      font-size: 2.5rem;
    }

    .temp-value {
      font-size: 6rem;
    }

    .weather-visual {
      width: 200px;
      height: 150px;
    }

    .sun {
      width: 80px;
      height: 80px;
    }

    .cloud {
      width: 120px;
      height: 45px;
    }
  }

  @media (max-width: 768px) {
    .weather-app {
      display: flex;
      flex-direction: column;
    }

    .main-content {
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 30px;
    }

    /* 1. Good afternoon 같은 멘트와 Get ready 멘트 */
    .left-section {
      order: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .greeting-container {
      order: 1;
      text-align: center;
    }

    .greeting {
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 1rem;
      opacity: 0.9;
    }

    /* 2. 지역 버튼 */
    .location-btn {
      order: 2;
      align-self: center;
      margin: 0;
    }

    /* 3. 날씨 애니메이션 */
    .weather-visual {
      order: 3;
      margin: 20px auto;
    }

    /* 4. 온도와 날씨 상태 */
    .center-section {
      order: 2;
      text-align: center;
    }

    .temperature-container {
      justify-content: center;
      margin-bottom: 10px;
    }

    .temp-value {
      font-size: 5rem;
    }

    .temp-unit {
      font-size: 2rem;
    }

    /* 5. 날씨 상태 (대체로 맑음 같은) */
    .weather-status {
      font-size: 1.2rem;
      margin-bottom: 15px;
    }

    /* 6. 풍향 정보 */
    .wind-info {
      justify-content: center;
      font-size: 1rem;
      margin-bottom: 20px;
    }

    /* 7. Today's Hourly (This Week보다 위에 표시) */
    .bottom-section {
      order: 3 !important;
      padding: 20px;
      margin: 0 -20px;
      display: block !important;
    }

    /* 모바일에서 시간별 예보를 세로 리스트로 변경 */
    .hourly-scroll {
      display: flex !important;
      flex-direction: column !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      gap: 10px;
      max-height: 450px;
      padding-right: 5px;
      /* 스크롤바 숨김 */
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .hourly-scroll::-webkit-scrollbar {
      display: none;
    }

    /* 각 시간 카드를 가로로 펼쳐서 표시 */
    .hour-card {
      display: flex !important;
      flex-direction: row !important;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 12px 15px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .hour-card:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .hour-time {
      font-size: 0.95rem;
      min-width: 50px;
      font-weight: 500;
    }

    .hour-icon {
      font-size: 1.4rem;
      min-width: 35px;
      text-align: center;
    }

    .hour-temp {
      font-size: 1rem;
      font-weight: 600;
      min-width: 45px;
    }

    .hour-rain {
      font-size: 0.85rem;
      min-width: 50px;
      text-align: right;
    }

    /* 8. This Week (Today's Hourly 아래에 표시) */
    .right-section {
      order: 4 !important;
      width: 100%;
      max-width: 100%;
      margin: 0;
      height: auto;
      min-height: 400px;
      display: block !important;
    }
  }
</style>