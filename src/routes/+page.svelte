<script>
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // State variables
  let currentTime = '';
  let currentDate = '';
  let currentTemp = '--';
  let weatherCondition = 'Loading...';
  let windSpeed = 0;
  let location = 'Gimpo, Korea';
  let currentWeatherCode = 0;

  // 7-day forecast data
  let sevenDayForecast = [];

  // Hourly forecast data
  let hourlyForecast = [];
  let allHourlyData = [];
  let airQualityData = [];

  // UI State
  let selectedDay = 0;
  let showLocationSearch = false;
  let searchQuery = '';
  let searchResults = [];
  let isSearching = false;
  let loading = true;
  let locationKey = '37.6_126.70001';
  let activeView = 'overview'; // overview, hourly, weekly

  // Language State
  let showLanguageDropdown = false;
  let supportedLanguages = [
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' }
  ];
  let selectedLanguage = supportedLanguages[2]; // Default to English

  // Translation data
  const translations = {
    zh: {
      // Header
      searchLocation: '搜索位置',

      // View tabs
      overview: '概览',
      hourly: '逐时',
      weekly: '每周',

      // Weather sections
      todaysForecast: '今日预报',
      next7Days: '未来7天',
      airQuality: '空气质量',

      // Weather details
      temp: '温度',
      feels: '体感',
      rain: '降雨',
      wind: '风',
      humidity: '湿度',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality (6 levels)
      excellent: '极优',
      veryGood: '非常好',
      good: '良好',
      moderate: '中等',
      bad: '差',
      veryBad: '很差',
      hazardous: '危险',

      // Days
      today: '今天',
      mon: '周一',
      tue: '周二',
      wed: '周三',
      thu: '周四',
      fri: '周五',
      sat: '周六',
      sun: '周日',

      // Weather conditions
      sunny: '晴朗',
      partlyCloudy: '部分多云',
      cloudy: '多云',
      overcast: '阴天',
      rain: '雨',
      lightRain: '小雨',
      heavyRain: '大雨',
      snow: '雪',
      thunderstorm: '雷雨',

      // Buttons
      viewHourly: '查看逐时',
      chanceOfRain: '降雨概率',

      // Temperature labels
      high: '最高',
      low: '最低'
    },
    hi: {
      // Header
      searchLocation: 'स्थान खोजें',

      // View tabs
      overview: 'अवलोकन',
      hourly: 'घंटेवार',
      weekly: 'साप्ताहिक',

      // Weather sections
      todaysForecast: 'आज का पूर्वानुमान',
      next7Days: 'अगले 7 दिन',
      airQuality: 'हवा की गुणवत्ता',

      // Weather details
      temp: 'तापमान',
      feels: 'महसूस',
      rain: 'बारिश',
      wind: 'हवा',
      humidity: 'नमी',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality (6 levels)
      excellent: 'उत्कृष्ट',
      veryGood: 'बहुत अच्छा',
      good: 'अच्छा',
      moderate: 'मध्यम',
      bad: 'खराब',
      veryBad: 'बहुत खराब',
      hazardous: 'खतरनाक',

      // Days
      today: 'आज',
      mon: 'सोम',
      tue: 'मंगल',
      wed: 'बुध',
      thu: 'गुरु',
      fri: 'शुक्र',
      sat: 'शनि',
      sun: 'रवि',

      // Weather conditions
      sunny: 'धूप',
      partlyCloudy: 'आंशिक बादल',
      cloudy: 'बादल',
      overcast: 'घना बादल',
      rain: 'बारिश',
      lightRain: 'हल्की बारिश',
      heavyRain: 'भारी बारिश',
      snow: 'बर्फ',
      thunderstorm: 'गरज',

      // Buttons
      viewHourly: 'घंटेवार देखें',
      chanceOfRain: 'बारिश की संभावना',

      // Temperature labels
      high: 'अधिकतम',
      low: 'न्यूनतम'
    },
    es: {
      // Header
      searchLocation: 'Buscar Ubicación',

      // View tabs
      overview: 'Resumen',
      hourly: 'Por Hora',
      weekly: 'Semanal',

      // Weather sections
      todaysForecast: 'Pronóstico de Hoy',
      next7Days: 'Próximos 7 Días',
      airQuality: 'Calidad del Aire',

      // Weather details
      temp: 'Temp',
      feels: 'Sensación',
      rain: 'Lluvia',
      wind: 'Viento',
      humidity: 'Humedad',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality (6 levels)
      excellent: 'Excelente',
      veryGood: 'Muy Buena',
      good: 'Buena',
      moderate: 'Moderada',
      bad: 'Mala',
      veryBad: 'Muy Mala',
      hazardous: 'Peligrosa',

      // Days
      today: 'Hoy',
      mon: 'Lun',
      tue: 'Mar',
      wed: 'Mié',
      thu: 'Jue',
      fri: 'Vie',
      sat: 'Sáb',
      sun: 'Dom',

      // Weather conditions
      sunny: 'Soleado',
      partlyCloudy: 'Parcialmente Nublado',
      cloudy: 'Nublado',
      overcast: 'Encapotado',
      rain: 'Lluvia',
      lightRain: 'Lluvia Ligera',
      heavyRain: 'Lluvia Intensa',
      snow: 'Nieve',
      thunderstorm: 'Tormenta',

      // Buttons
      viewHourly: 'Ver por Hora',
      chanceOfRain: 'posibilidad de lluvia',

      // Temperature labels
      high: 'Máxima',
      low: 'Mínima'
    },
    ar: {
      // Header
      searchLocation: 'البحث عن موقع',

      // View tabs
      overview: 'نظرة عامة',
      hourly: 'كل ساعة',
      weekly: 'أسبوعي',

      // Weather sections
      todaysForecast: 'توقعات اليوم',
      next7Days: 'الأيام السبعة القادمة',
      airQuality: 'جودة الهواء',

      // Weather details
      temp: 'درجة الحرارة',
      feels: 'الشعور',
      rain: 'المطر',
      wind: 'الرياح',
      humidity: 'الرطوبة',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: 'جيد',
      moderate: 'متوسط',
      bad: 'سيء',
      veryBad: 'سيء جداً',

      // Days
      today: 'اليوم',
      mon: 'الإثنين',
      tue: 'الثلاثاء',
      wed: 'الأربعاء',
      thu: 'الخميس',
      fri: 'الجمعة',
      sat: 'السبت',
      sun: 'الأحد',

      // Weather conditions
      sunny: 'مشمس',
      partlyCloudy: 'غائم جزئياً',
      cloudy: 'غائم',
      overcast: 'ملبد بالغيوم',
      rain: 'مطر',
      lightRain: 'مطر خفيف',
      heavyRain: 'مطر غزير',
      snow: 'ثلج',
      thunderstorm: 'عاصفة رعدية',

      // Buttons
      viewHourly: 'عرض كل ساعة',
      chanceOfRain: 'احتمال المطر',

      // Temperature labels
      high: 'العليا',
      low: 'الدنيا'
    },
    bn: {
      // Header
      searchLocation: 'অবস্থান খুঁজুন',

      // View tabs
      overview: 'সংক্ষিপ্ত',
      hourly: 'ঘণ্টায়',
      weekly: 'সাপ্তাহিক',

      // Weather sections
      todaysForecast: 'আজকের পূর্বাভাস',
      next7Days: 'পরবর্তী ৭ দিন',
      airQuality: 'বায়ুর মান',

      // Weather details
      temp: 'তাপমাত্রা',
      feels: 'অনুভূতি',
      rain: 'বৃষ্টি',
      wind: 'বাতাস',
      humidity: 'আর্দ্রতা',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: 'ভাল',
      moderate: 'মাঝারি',
      bad: 'খারাপ',
      veryBad: 'খুব খারাপ',

      // Days
      today: 'আজ',
      mon: 'সোম',
      tue: 'মঙ্গল',
      wed: 'বুধ',
      thu: 'বৃহঃ',
      fri: 'শুক্র',
      sat: 'শনি',
      sun: 'রবি',

      // Weather conditions
      sunny: 'রৌদ্রোজ্জ্বল',
      partlyCloudy: 'আংশিক মেঘলা',
      cloudy: 'মেঘলা',
      overcast: 'ঘন মেঘ',
      rain: 'বৃষ্টি',
      lightRain: 'হালকা বৃষ্টি',
      heavyRain: 'ভারী বৃষ্টি',
      snow: 'তুষার',
      thunderstorm: 'বজ্রঝড়',

      // Buttons
      viewHourly: 'ঘণ্টায় দেখুন',
      chanceOfRain: 'বৃষ্টির সম্ভাবনা',

      // Temperature labels
      high: 'সর্বোচ্চ',
      low: 'সর্বনিম্ন'
    },
    ru: {
      // Header
      searchLocation: 'Поиск местоположения',

      // View tabs
      overview: 'Обзор',
      hourly: 'Почасово',
      weekly: 'Недельно',

      // Weather sections
      todaysForecast: 'Прогноз на сегодня',
      next7Days: 'Следующие 7 дней',
      airQuality: 'Качество воздуха',

      // Weather details
      temp: 'Темп',
      feels: 'Ощущается',
      rain: 'Дождь',
      wind: 'Ветер',
      humidity: 'Влажность',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: 'Хорошо',
      moderate: 'Умеренно',
      bad: 'Плохо',
      veryBad: 'Очень плохо',

      // Days
      today: 'Сегодня',
      mon: 'Пн',
      tue: 'Вт',
      wed: 'Ср',
      thu: 'Чт',
      fri: 'Пт',
      sat: 'Сб',
      sun: 'Вс',

      // Weather conditions
      sunny: 'Солнечно',
      partlyCloudy: 'Переменная облачность',
      cloudy: 'Облачно',
      overcast: 'Пасмурно',
      rain: 'Дождь',
      lightRain: 'Легкий дождь',
      heavyRain: 'Сильный дождь',
      snow: 'Снег',
      thunderstorm: 'Гроза',

      // Buttons
      viewHourly: 'Почасовой прогноз',
      chanceOfRain: 'вероятность дождя',

      // Temperature labels
      high: 'Макс',
      low: 'Мин'
    },
    fr: {
      // Header
      searchLocation: 'Rechercher un lieu',

      // View tabs
      overview: 'Aperçu',
      hourly: 'Horaire',
      weekly: 'Hebdomadaire',

      // Weather sections
      todaysForecast: 'Prévisions du jour',
      next7Days: '7 prochains jours',
      airQuality: 'Qualité de l\'air',

      // Weather details
      temp: 'Temp',
      feels: 'Ressenti',
      rain: 'Pluie',
      wind: 'Vent',
      humidity: 'Humidité',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: 'Bon',
      moderate: 'Modéré',
      bad: 'Mauvais',
      veryBad: 'Très mauvais',

      // Days
      today: 'Aujourd\'hui',
      mon: 'Lun',
      tue: 'Mar',
      wed: 'Mer',
      thu: 'Jeu',
      fri: 'Ven',
      sat: 'Sam',
      sun: 'Dim',

      // Weather conditions
      sunny: 'Ensoleillé',
      partlyCloudy: 'Partiellement nuageux',
      cloudy: 'Nuageux',
      overcast: 'Couvert',
      rain: 'Pluie',
      lightRain: 'Pluie légère',
      heavyRain: 'Pluie forte',
      snow: 'Neige',
      thunderstorm: 'Orage',

      // Buttons
      viewHourly: 'Voir horaire',
      chanceOfRain: 'risque de pluie',

      // Temperature labels
      high: 'Max',
      low: 'Min'
    },
    de: {
      // Header
      searchLocation: 'Standort suchen',

      // View tabs
      overview: 'Übersicht',
      hourly: 'Stündlich',
      weekly: 'Wöchentlich',

      // Weather sections
      todaysForecast: 'Heutige Vorhersage',
      next7Days: 'Nächste 7 Tage',
      airQuality: 'Luftqualität',

      // Weather details
      temp: 'Temp',
      feels: 'Gefühlt',
      rain: 'Regen',
      wind: 'Wind',
      humidity: 'Feuchtigkeit',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: 'Gut',
      moderate: 'Mäßig',
      bad: 'Schlecht',
      veryBad: 'Sehr schlecht',

      // Days
      today: 'Heute',
      mon: 'Mo',
      tue: 'Di',
      wed: 'Mi',
      thu: 'Do',
      fri: 'Fr',
      sat: 'Sa',
      sun: 'So',

      // Weather conditions
      sunny: 'Sonnig',
      partlyCloudy: 'Teilweise bewölkt',
      cloudy: 'Bewölkt',
      overcast: 'Bedeckt',
      rain: 'Regen',
      lightRain: 'Leichter Regen',
      heavyRain: 'Starker Regen',
      snow: 'Schnee',
      thunderstorm: 'Gewitter',

      // Buttons
      viewHourly: 'Stündlich anzeigen',
      chanceOfRain: 'Regenwahrscheinlichkeit',

      // Temperature labels
      high: 'Hoch',
      low: 'Tief'
    },
    ko: {
      // Header
      searchLocation: '위치 검색',

      // View tabs
      overview: '개요',
      hourly: '시간별',
      weekly: '주간',

      // Weather sections
      todaysForecast: '오늘의 예보',
      next7Days: '향후 7일',
      airQuality: '대기질',

      // Weather details
      temp: '온도',
      feels: '체감',
      rain: '강수',
      wind: '바람',
      humidity: '습도',
      pm10: '미세먼지',
      pm25: '초미세먼지',

      // Air quality (6 levels)
      excellent: '최상',
      veryGood: '매우좋음',
      good: '좋음',
      moderate: '보통',
      bad: '나쁨',
      veryBad: '매우나쁨',
      hazardous: '최악',

      // Days
      today: '오늘',
      mon: '월',
      tue: '화',
      wed: '수',
      thu: '목',
      fri: '금',
      sat: '토',
      sun: '일',

      // Weather conditions
      sunny: '맑음',
      partlyCloudy: '부분적으로 흐림',
      cloudy: '흐림',
      overcast: '흐림',
      rain: '비',
      lightRain: '가벼운 비',
      heavyRain: '큰 비',
      snow: '눈',
      thunderstorm: '뇌우',

      // Buttons
      viewHourly: '시간별 보기',
      chanceOfRain: '강수 확률',

      // Temperature labels
      high: '최고',
      low: '최저'
    },
    ja: {
      // Header
      searchLocation: '場所を検索',

      // View tabs
      overview: '概要',
      hourly: '時間別',
      weekly: '週間',

      // Weather sections
      todaysForecast: '今日の予報',
      next7Days: '今後7日間',
      airQuality: '大気質',

      // Weather details
      temp: '気温',
      feels: '体感',
      rain: '降水',
      wind: '風',
      humidity: '湿度',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: '良い',
      moderate: '普通',
      bad: '悪い',
      veryBad: 'とても悪い',

      // Days
      today: '今日',
      mon: '月',
      tue: '火',
      wed: '水',
      thu: '木',
      fri: '金',
      sat: '土',
      sun: '日',

      // Weather conditions
      sunny: '晴れ',
      partlyCloudy: '部分的に曇り',
      cloudy: '曇り',
      overcast: '曇り',
      rain: '雨',
      lightRain: '小雨',
      heavyRain: '大雨',
      snow: '雪',
      thunderstorm: '雷雨',

      // Buttons
      viewHourly: '時間別を見る',
      chanceOfRain: '降水確率',

      // Temperature labels
      high: '最高',
      low: '最低'
    },
    en: {
      // Header
      searchLocation: 'Search Location',

      // View tabs
      overview: 'Overview',
      hourly: 'Hourly',
      weekly: 'Weekly',

      // Weather sections
      todaysForecast: "Today's Forecast",
      next7Days: 'Next 7 Days',
      airQuality: 'Air Quality',

      // Weather details
      temp: 'Temp',
      feels: 'Feels',
      rain: 'Rain',
      wind: 'Wind',
      humidity: 'Humidity',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality (6 levels)
      excellent: 'Excellent',
      veryGood: 'Very Good',
      good: 'Good',
      moderate: 'Moderate',
      bad: 'Bad',
      veryBad: 'Very Bad',
      hazardous: 'Hazardous',

      // Days
      today: 'Today',
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',

      // Weather conditions
      sunny: 'Sunny',
      partlyCloudy: 'Partly Cloudy',
      cloudy: 'Cloudy',
      overcast: 'Overcast',
      rain: 'Rain',
      lightRain: 'Light Rain',
      heavyRain: 'Heavy Rain',
      snow: 'Snow',
      thunderstorm: 'Thunderstorm',

      // Buttons
      viewHourly: 'View Hourly',
      chanceOfRain: 'chance of rain',

      // Temperature labels
      high: 'High',
      low: 'Low'
    },
    pt: {
      // Header
      searchLocation: 'Buscar Local',

      // View tabs
      overview: 'Visão Geral',
      hourly: 'Por Hora',
      weekly: 'Semanal',

      // Weather sections
      todaysForecast: 'Previsão de Hoje',
      next7Days: 'Próximos 7 Dias',
      airQuality: 'Qualidade do Ar',

      // Weather details
      temp: 'Temp',
      feels: 'Sensação',
      rain: 'Chuva',
      wind: 'Vento',
      humidity: 'Umidade',
      pm10: 'PM10',
      pm25: 'PM2.5',

      // Air quality
      good: 'Boa',
      moderate: 'Moderada',
      bad: 'Ruim',
      veryBad: 'Muito Ruim',

      // Days
      today: 'Hoje',
      mon: 'Seg',
      tue: 'Ter',
      wed: 'Qua',
      thu: 'Qui',
      fri: 'Sex',
      sat: 'Sáb',
      sun: 'Dom',

      // Weather conditions
      sunny: 'Ensolarado',
      partlyCloudy: 'Parcialmente Nublado',
      cloudy: 'Nublado',
      overcast: 'Encoberto',
      rain: 'Chuva',
      lightRain: 'Chuva Leve',
      heavyRain: 'Chuva Forte',
      snow: 'Neve',
      thunderstorm: 'Tempestade',

      // Buttons
      viewHourly: 'Ver por Hora',
      chanceOfRain: 'chance de chuva',

      // Temperature labels
      high: 'Máxima',
      low: 'Mínima'
    }
  };

  // Translation function
  function t(key) {
    return translations[selectedLanguage.code]?.[key] || translations.en[key] || key;
  }

  // Weather condition translation function
  function translateWeatherCondition(condition) {
    if (!condition) return condition;

    const conditionMap = {
      'Clear': 'sunny',
      'Sunny': 'sunny',
      'Partly Cloudy': 'partlyCloudy',
      'Mostly Cloudy': 'partlyCloudy',
      'Cloudy': 'cloudy',
      'Overcast': 'overcast',
      'Rain': 'rain',
      'Light Rain': 'lightRain',
      'Heavy Rain': 'heavyRain',
      'Snow': 'snow',
      'Thunderstorm': 'thunderstorm'
    };

    const translationKey = conditionMap[condition];
    return translationKey ? t(translationKey) : condition;
  }

  // Day name translation function
  function translateDayName(dayName) {
    if (!dayName) return dayName;

    const dayMap = {
      'Today': 'today',
      'Mon': 'mon',
      'Tue': 'tue',
      'Wed': 'wed',
      'Thu': 'thu',
      'Fri': 'fri',
      'Sat': 'sat',
      'Sun': 'sun'
    };

    const translationKey = dayMap[dayName];
    return translationKey ? t(translationKey) : dayName;
  }

  onMount(() => {
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    loadWeatherData();

    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage) {
      const languageOption = supportedLanguages.find(lang => lang.code === savedLanguage);
      if (languageOption) {
        selectedLanguage = languageOption;
      }
    }

    // Add click outside listener for language dropdown
    document.addEventListener('click', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function updateDateTime() {
    const now = new Date();

    currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  async function loadWeatherData() {
    loading = true;
    try {
      // Current weather
      const currentResponse = await fetch(`/api/weather/openmeteo-current?locationKey=${locationKey}`);
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        if (currentData && currentData[0]) {
          const current = currentData[0];
          currentTemp = Math.round(current.Temperature.Metric.Value);
          weatherCondition = current.WeatherText;
          windSpeed = Math.round(current.Wind?.Speed?.Metric?.Value || 0);
          currentWeatherCode = current.WeatherIcon || 0;
        }
      }

      // Hourly forecast (168 hours for 7 days)
      const hourlyResponse = await fetch(`/api/weather/openmeteo-forecast?locationKey=${locationKey}&type=hourly&hours=168`);
      if (hourlyResponse.ok) {
        const hourlyData = await hourlyResponse.json();
        if (Array.isArray(hourlyData)) {
          console.log('Hourly Data Sample:', hourlyData[0]);
          allHourlyData = hourlyData.map(h => ({
            time: formatTime(h.DateTime),
            hour: formatTime(h.DateTime),
            temp: Math.round(h.Temperature?.Value || 0),
            feelsLike: Math.round(h.ApparentTemperature?.Value || h.Temperature?.Value || 0),
            icon: getWeatherIcon(h.WeatherIcon),
            dateTime: h.DateTime,
            date: new Date(h.DateTime).toDateString(),
            precipitation: h.PrecipitationProbability || 0,
            pm10: 0,
            pm25: 0
          }));

          updateHourlyForecastForDay(0);
        }
      }

      // Air quality data (168 hours for 7 days)
      const airQualityResponse = await fetch(`/api/weather/openmeteo-airquality?locationKey=${locationKey}&type=hourly&hours=168`);
      if (airQualityResponse.ok) {
        const airData = await airQualityResponse.json();
        if (Array.isArray(airData)) {
          airQualityData = airData;
          console.log('Air Quality Data Sample:', airQualityData[0]);

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

          updateHourlyForecastForDay(0);
          console.log('Final Hourly Forecast Sample:', hourlyForecast[0]);
        }
      }

      // Daily forecast (7 days)
      const dailyResponse = await fetch(`/api/weather/openmeteo-forecast?locationKey=${locationKey}&type=daily&days=7`);
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        if (dailyData && dailyData.DailyForecasts) {
          sevenDayForecast = dailyData.DailyForecasts.map((d, index) => {
            const date = new Date(d.Date);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
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

  function getWeatherIcon(code) {
    if (code === 0 || code === 1) return '☀️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '🌨️';
    if (code >= 80 && code <= 82) return '🌧️';
    if (code >= 85 && code <= 86) return '❄️';
    if (code >= 95 && code <= 99) return '⛈️';
    return '☁️';
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.getHours().toString().padStart(2, '0') + ':00';
  }

  function updateHourlyForecastForDay(dayIndex) {
    if (!allHourlyData.length) return;

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayIndex);

    const targetDateString = targetDate.toDateString();

    const dayHourlyData = allHourlyData.filter(h => {
      const itemDate = new Date(h.dateTime);
      return itemDate.toDateString() === targetDateString;
    });

    hourlyForecast = dayHourlyData.map((h) => {
      const airData = airQualityData.find(air => air.DateTime === h.dateTime);
      return {
        ...h,
        pm10: Math.round((airData?.PM10) || 0),
        pm25: Math.round((airData?.PM25) || 0)
      };
    });
  }

  function openLocationSearch() {
    showLocationSearch = true;
    searchQuery = '';
    searchResults = [];
  }

  function closeLocationSearch() {
    showLocationSearch = false;
    searchQuery = '';
    searchResults = [];
  }

  // Language functions
  function toggleLanguageDropdown() {
    showLanguageDropdown = !showLanguageDropdown;
  }

  function selectLanguage(language) {
    selectedLanguage = language;
    showLanguageDropdown = false;
    // Store preference in localStorage
    localStorage.setItem('preferred-language', language.code);
    // Trigger reactivity for translations
    selectedLanguage = selectedLanguage;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.language-dropdown')) {
      showLanguageDropdown = false;
    }
  }

  async function searchLocations() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    isSearching = true;
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&countrycodes=kr&limit=10&addressdetails=1&accept-language=ko`;

      const response = await fetch(nominatimUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const locations = data.map(item => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const coordinates = `${lat}_${lon}`;

        let name = '';
        let fullName = item.display_name;

        if (item.address) {
          name = item.address.city ||
                 item.address.town ||
                 item.address.county ||
                 item.address.suburb ||
                 item.address.municipality ||
                 searchQuery;
        } else {
          name = item.display_name.split(',')[0];
        }

        return {
          name: name,
          coordinates: coordinates,
          fullName: fullName
        };
      });

      const uniqueLocations = locations.filter((location, index, self) =>
        index === self.findIndex(l => l.coordinates === location.coordinates)
      );

      searchResults = uniqueLocations.slice(0, 8);
    } catch (error) {
      console.error('Location search error:', error);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  async function selectLocation(selectedLocation) {
    location = selectedLocation.name;
    locationKey = selectedLocation.coordinates;

    closeLocationSearch();
    await loadWeatherData();
  }

  // Get detailed air quality grade (6 levels)
  function getDetailedAirQualityGrade(value, type) {
    if (value === null || value === undefined) {
      return { grade: 'N/A', color: '#999999' };
    }

    // 6단계 등급 체계: 최상, 매우좋음, 좋음, 나쁨, 매우나쁨, 최악
    if (type === 'PM10') {
      if (value <= 15) return { grade: 'excellent', color: '#00e5ff' };      // 최상 (WHO 연평균 기준)
      else if (value <= 30) return { grade: 'veryGood', color: '#00ff00' };  // 매우좋음 (한국 '좋음' 기준)
      else if (value <= 50) return { grade: 'good', color: '#90ee90' };      // 좋음
      else if (value <= 100) return { grade: 'bad', color: '#ffaa00' };      // 나쁨
      else if (value <= 150) return { grade: 'veryBad', color: '#ff5722' };  // 매우나쁨
      else return { grade: 'hazardous', color: '#d50000' };                  // 최악
    } else if (type === 'PM2.5') {
      if (value <= 5) return { grade: 'excellent', color: '#00e5ff' };       // 최상 (WHO 연평균 기준)
      else if (value <= 15) return { grade: 'veryGood', color: '#00ff00' };  // 매우좋음 (한국 '좋음' 기준)
      else if (value <= 25) return { grade: 'good', color: '#90ee90' };      // 좋음
      else if (value <= 50) return { grade: 'bad', color: '#ffaa00' };       // 나쁨
      else if (value <= 75) return { grade: 'veryBad', color: '#ff5722' };   // 매우나쁨
      else return { grade: 'hazardous', color: '#d50000' };                  // 최악
    }

    return { grade: 'N/A', color: '#999999' };
  }

  function getAirQualityStatus(pm10, pm25) {
    if (!pm10 && !pm25) {
      return { text: 'N/A', color: '#999999' };
    }

    // Use the worse grade between PM10 and PM2.5
    const pm10Grade = getDetailedAirQualityGrade(pm10, 'PM10');
    const pm25Grade = getDetailedAirQualityGrade(pm25, 'PM2.5');

    // Priority order (worst to best)
    const gradePriority = ['hazardous', 'veryBad', 'bad', 'good', 'veryGood', 'excellent', 'N/A'];

    const pm10Priority = gradePriority.indexOf(pm10Grade.grade);
    const pm25Priority = gradePriority.indexOf(pm25Grade.grade);

    // Return the worse grade (lower index = worse)
    if (pm10Priority <= pm25Priority) {
      return { text: t(pm10Grade.grade), color: pm10Grade.color };
    } else {
      return { text: t(pm25Grade.grade), color: pm25Grade.color };
    }
  }

  function selectDay(index) {
    selectedDay = index;
    updateHourlyForecastForDay(index);
  }
</script>

<div class="weather-app">
  <!-- Header -->
  <header class="app-header">
    <div class="header-left">
      <div class="current-date">{currentDate}</div>
      <div class="current-time">{currentTime}</div>
    </div>

    <div class="header-center">
      <button class="location-button" on:click={openLocationSearch}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <span>{location}</span>
      </button>
    </div>

    <div class="header-right">
      <!-- Language Dropdown -->
      <div class="language-dropdown" class:open={showLanguageDropdown}>
        <button class="language-button" on:click={toggleLanguageDropdown}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>{selectedLanguage.name}</span>
          <svg
            class="dropdown-arrow"
            class:rotated={showLanguageDropdown}
            width="12" height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {#if showLanguageDropdown}
          <div class="language-menu" in:fly={{y: -10, duration: 200}} out:fly={{y: -10, duration: 150}}>
            {#each supportedLanguages as language, i}
              <button
                class="language-option"
                class:selected={selectedLanguage.code === language.code}
                on:click={() => selectLanguage(language)}
                in:fly={{y: -10, delay: i * 50, duration: 200}}
              >
                <span class="language-flag">{language.flag}</span>
                <span class="language-name">{language.name}</span>
                {#if selectedLanguage.code === language.code}
                  <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- View Tabs -->
      <nav class="view-tabs">
        <button
          class="tab-button"
          class:active={activeView === 'overview'}
          on:click={() => activeView = 'overview'}
        >
          {t('overview')}
        </button>
        <button
          class="tab-button"
          class:active={activeView === 'hourly'}
          on:click={() => activeView = 'hourly'}
        >
          {t('hourly')}
        </button>
        <button
          class="tab-button"
          class:active={activeView === 'weekly'}
          on:click={() => activeView = 'weekly'}
        >
          {t('weekly')}
        </button>
      </nav>
    </div>
  </header>

  <!-- Main Content -->
  <main class="main-content">
    {#if activeView === 'overview'}
      <!-- Overview View -->
      <div class="overview-view" in:fade={{duration: 300, easing: cubicOut}}>
        <!-- Current Weather Card -->
        <div class="current-weather-card">
          <div class="weather-main">
            <div class="temp-display">
              <span class="temp-value">{currentTemp}</span>
              <span class="temp-unit">°</span>
            </div>
            <div class="weather-info">
              <div class="weather-condition">{translateWeatherCondition(weatherCondition)}</div>
              <div class="weather-details">
                <span class="detail-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
                  </svg>
                  {windSpeed} km/h
                </span>
                {#if hourlyForecast[0]}
                  <span class="detail-item">
                    💧 {hourlyForecast[0].precipitation}%
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Air Quality -->
          {#if hourlyForecast[0]}
            {@const airStatus = getAirQualityStatus(hourlyForecast[0].pm10, hourlyForecast[0].pm25)}
            {@const pm10Grade = getDetailedAirQualityGrade(hourlyForecast[0].pm10, 'PM10')}
            {@const pm25Grade = getDetailedAirQualityGrade(hourlyForecast[0].pm25, 'PM2.5')}
            <div class="air-quality-section">
              <h3 class="section-title">{t('airQuality')}</h3>
              <div class="air-quality-card">
                <div class="air-status" style="color: {airStatus.color}">
                  {airStatus.text}
                </div>
                <div class="air-values">
                  <div class="air-item">
                    <span class="air-label">{t('pm10')}</span>
                    <span class="air-value">{hourlyForecast[0].pm10}</span>
                    <span class="air-grade" style="color: {pm10Grade.color}">{t(pm10Grade.grade)}</span>
                  </div>
                  <div class="air-item">
                    <span class="air-label">{t('pm25')}</span>
                    <span class="air-value">{hourlyForecast[0].pm25}</span>
                    <span class="air-grade" style="color: {pm25Grade.color}">{t(pm25Grade.grade)}</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Today's Hourly Preview -->
        <div class="today-hourly">
          <h3 class="section-title">{t('todaysForecast')}</h3>
          <div class="hourly-preview-detailed">
            {#each hourlyForecast as hour, i}
              {@const pm10HourGrade = getDetailedAirQualityGrade(hour.pm10, 'PM10')}
              {@const pm25HourGrade = getDetailedAirQualityGrade(hour.pm25, 'PM2.5')}
              <div class="hour-detail-card-overview" in:fly={{y: 20, delay: i * 20, duration: 300}}>
                <div class="hour-header">
                  <span class="hour-time-label">{hour.time}</span>
                  <span class="hour-weather-icon">{hour.icon}</span>
                </div>
                <div class="hour-body">
                  <div class="temp-info">
                    <div class="actual-temp">
                      <span class="temp-label">{t('temp')}</span>
                      <span class="temp-val">{hour.temp}°</span>
                    </div>
                    <div class="feels-temp">
                      <span class="temp-label">{t('feels')}</span>
                      <span class="temp-val">{hour.feelsLike}°</span>
                    </div>
                  </div>

                  <div class="precipitation-info">
                    <span class="precip-label">{t('rain')}</span>
                    <span class="precip-value">{hour.precipitation}%</span>
                  </div>

                  <div class="air-info">
                    <div class="air-metric">
                      <span class="metric-label">{t('pm10')}</span>
                      <span class="metric-value">{hour.pm10}</span>
                      <span class="metric-grade" style="color: {pm10HourGrade.color}; font-size: 0.7rem;">{t(pm10HourGrade.grade)}</span>
                    </div>
                    <div class="air-metric">
                      <span class="metric-label">{t('pm25')}</span>
                      <span class="metric-value">{hour.pm25}</span>
                      <span class="metric-grade" style="color: {pm25HourGrade.color}; font-size: 0.7rem;">{t(pm25HourGrade.grade)}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- 7 Day Preview -->
        <div class="week-preview">
          <h3 class="section-title">{t('next7Days')}</h3>
          <div class="days-grid">
            {#each sevenDayForecast as day, i}
              <button
                class="day-preview-card"
                class:today={i === 0}
                on:click={() => {selectDay(i); activeView = 'hourly';}}
                in:scale={{delay: i * 50, duration: 300}}
              >
                <div class="day-name">{translateDayName(day.day)}</div>
                <div class="day-icon">{day.icon}</div>
                <div class="day-temps">
                  <span class="temp-high">{day.high}°</span>
                  <span class="temp-low">{day.low}°</span>
                </div>
                {#if day.precipitation > 0}
                  <div class="day-rain">💧{day.precipitation}%</div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

    {:else if activeView === 'hourly'}
      <!-- Hourly View -->
      <div class="hourly-view" in:fade={{duration: 300, easing: cubicOut}}>
        <!-- Day Selector -->
        <div class="day-selector">
          {#each sevenDayForecast as day, i}
            <button
              class="day-tab"
              class:active={selectedDay === i}
              on:click={() => selectDay(i)}
            >
              {translateDayName(day.day)}
              <span class="day-date">{day.date}</span>
            </button>
          {/each}
        </div>

        <!-- Hourly Details -->
        <div class="hourly-details">
          <div class="hourly-grid">
            {#each hourlyForecast as hour, i}
              {@const pm10HourGrade = getDetailedAirQualityGrade(hour.pm10, 'PM10')}
              {@const pm25HourGrade = getDetailedAirQualityGrade(hour.pm25, 'PM2.5')}
              <div class="hour-detail-card" in:fly={{y: 20, delay: i * 20, duration: 300}}>
                <div class="hour-header">
                  <span class="hour-time-label">{hour.time}</span>
                  <span class="hour-weather-icon">{hour.icon}</span>
                </div>
                <div class="hour-body">
                  <div class="temp-info">
                    <div class="actual-temp">
                      <span class="temp-label">{t('temp')}</span>
                      <span class="temp-val">{hour.temp}°</span>
                    </div>
                    <div class="feels-temp">
                      <span class="temp-label">{t('feels')}</span>
                      <span class="temp-val">{hour.feelsLike}°</span>
                    </div>
                  </div>

                  {#if hour.precipitation > 0}
                    <div class="precipitation-info">
                      <span class="precip-label">{t('rain')}</span>
                      <span class="precip-value">{hour.precipitation}%</span>
                    </div>
                  {/if}

                  <div class="air-info">
                    <div class="air-metric">
                      <span class="metric-label">{t('pm10')}</span>
                      <span class="metric-value">{hour.pm10}</span>
                      <span class="metric-grade" style="color: {pm10HourGrade.color}; font-size: 0.7rem;">{t(pm10HourGrade.grade)}</span>
                    </div>
                    <div class="air-metric">
                      <span class="metric-label">{t('pm25')}</span>
                      <span class="metric-value">{hour.pm25}</span>
                      <span class="metric-grade" style="color: {pm25HourGrade.color}; font-size: 0.7rem;">{t(pm25HourGrade.grade)}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    {:else if activeView === 'weekly'}
      <!-- Weekly View -->
      <div class="weekly-view" in:fade={{duration: 300, easing: cubicOut}}>
        <div class="week-cards">
          {#each sevenDayForecast as day, i}
            <div class="week-day-card" in:scale={{delay: i * 100, duration: 400}}>
              <div class="week-day-header">
                <h3 class="week-day-name">{translateDayName(day.day)}</h3>
                <span class="week-day-date">{currentDate.split(' ')[0]} {day.date}</span>
              </div>

              <div class="week-day-weather">
                <div class="week-weather-icon">{day.icon}</div>
                <div class="week-weather-text">{translateWeatherCondition(day.condition)}</div>
              </div>

              <div class="week-day-temps">
                <div class="temp-range">
                  <div class="temp-item">
                    <span class="temp-type">{t('high')}</span>
                    <span class="temp-number">{day.high}°</span>
                  </div>
                  <div class="temp-divider"></div>
                  <div class="temp-item">
                    <span class="temp-type">{t('low')}</span>
                    <span class="temp-number">{day.low}°</span>
                  </div>
                </div>
              </div>

              {#if day.precipitation > 0}
                <div class="week-day-rain">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 13V11C16 8.24 13.76 6 11 6S6 8.24 6 11V13"/>
                    <path d="M12 13V21"/>
                    <path d="M8 17L8 21"/>
                    <path d="M16 17L16 21"/>
                  </svg>
                  <span>{day.precipitation}% {t('chanceOfRain')}</span>
                </div>
              {/if}

              <button
                class="view-hourly-btn"
                on:click={() => {selectDay(i); activeView = 'hourly';}}
              >
                {t('viewHourly')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18L15 12L9 6"/>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </main>

  <!-- Location Search Modal -->
  {#if showLocationSearch}
    <div class="modal-overlay" on:click={closeLocationSearch}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h3>{t('searchLocation')}</h3>
          <button class="modal-close" on:click={closeLocationSearch}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6L18 18"/>
            </svg>
          </button>
        </div>

        <div class="search-box">
          <input
            type="text"
            class="search-input"
            placeholder="Search city..."
            bind:value={searchQuery}
            on:keydown={(e) => e.key === 'Enter' && searchLocations()}
          />
          <button class="search-button" on:click={searchLocations}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>

        <div class="search-results">
          {#if isSearching}
            <div class="search-loading">Searching...</div>
          {:else if searchResults.length > 0}
            {#each searchResults as result}
              <button class="location-result" on:click={() => selectLocation(result)}>
                <span class="location-name">{result.name}</span>
                <span class="location-full">{result.fullName}</span>
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
  :global(html), :global(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
    background: #0a0a0a;
    color: #ffffff;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .weather-app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
    overflow: hidden;
  }

  /* Header */
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 10000;
  }

  .header-left, .header-right {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .header-center {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .header-right {
    justify-content: flex-end;
    gap: 1.5rem;
  }

  .location-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 2rem;
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .location-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .current-date {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.25rem;
  }

  .current-time {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }

  .view-tabs {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .tab-button {
    padding: 0.625rem 1.25rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 2rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-button:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-button.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Main Content */
  .main-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 2rem;
  }

  /* Scrollbar styling */
  .main-content::-webkit-scrollbar {
    width: 8px;
  }

  .main-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }

  .main-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  /* Overview View */
  .overview-view {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    gap: 2rem;
  }

  .current-weather-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    padding: 2.5rem;
  }

  .weather-main {
    display: flex;
    align-items: center;
    gap: 3rem;
    margin-bottom: 2rem;
  }

  .temp-display {
    display: flex;
    align-items: flex-start;
    line-height: 1;
  }

  .temp-value {
    font-size: 6rem;
    font-weight: 200;
    letter-spacing: -0.05em;
  }

  .temp-unit {
    font-size: 3rem;
    font-weight: 200;
    margin-top: 0.5rem;
    opacity: 0.5;
  }

  .weather-info {
    flex: 1;
  }

  .weather-condition {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .weather-details {
    display: flex;
    gap: 1.5rem;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
  }

  /* Air Quality */
  .air-quality-section {
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 1rem 0;
  }

  .air-quality-card {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .air-status {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .air-values {
    display: flex;
    gap: 1.5rem;
  }

  .air-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .air-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .air-grade {
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 0.125rem;
  }

  .air-value {
    font-size: 1.125rem;
    font-weight: 600;
  }

  /* Today's Hourly */
  .today-hourly {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1.5rem;
    padding: 1.5rem;
  }

  .hourly-preview-detailed {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }

  .hour-detail-card-overview {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1.25rem;
    transition: all 0.2s ease;
  }

  .hour-detail-card-overview:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  /* Week Preview */
  .week-preview {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1.5rem;
    padding: 1.5rem;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  .day-preview-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1.25rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #ffffff;
  }

  .day-preview-card.today {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .day-preview-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  .day-name {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .day-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .day-temps {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .temp-high {
    font-weight: 600;
  }

  .temp-low {
    color: rgba(255, 255, 255, 0.5);
  }

  .day-rain {
    font-size: 0.75rem;
    color: #60a5fa;
  }

  /* Hourly View */
  .hourly-view {
    max-width: 1400px;
    margin: 0 auto;
  }

  .day-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1rem;
  }

  .day-tab {
    flex: 1;
    padding: 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .day-tab:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .day-tab.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .day-date {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .hourly-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }

  .hour-detail-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1.25rem;
    transition: all 0.2s ease;
  }

  .hour-detail-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  .hour-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hour-time-label {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .hour-weather-icon {
    font-size: 1.25rem;
  }

  .hour-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .temp-info {
    display: flex;
    justify-content: space-between;
  }

  .actual-temp, .feels-temp {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .temp-label {
    font-size: 0.625rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .temp-val {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .precipitation-info {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(96, 165, 250, 0.1);
    border-radius: 0.5rem;
  }

  .precip-label {
    font-size: 0.75rem;
    color: #60a5fa;
  }

  .precip-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #60a5fa;
  }

  .air-info {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0.5rem;
  }

  .air-metric {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-grade {
    font-weight: 600;
    margin-top: 0.125rem;
  }

  .metric-label {
    font-size: 0.625rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }

  .metric-value {
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* Weekly View */
  .weekly-view {
    max-width: 1400px;
    margin: 0 auto;
  }

  .week-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .week-day-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .week-day-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-4px);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .week-day-header {
    margin-bottom: 1.5rem;
  }

  .week-day-name {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }

  .week-day-date {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .week-day-weather {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .week-weather-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .week-weather-text {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .week-day-temps {
    margin-bottom: 1.5rem;
  }

  .temp-range {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0.75rem;
  }

  .temp-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .temp-type {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .temp-number {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .temp-divider {
    width: 1px;
    height: 2rem;
    background: rgba(255, 255, 255, 0.1);
  }

  .week-day-rain {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(96, 165, 250, 0.1);
    border-radius: 0.75rem;
    color: #60a5fa;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .view-hourly-btn {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .view-hourly-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .modal {
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    width: 90%;
    max-width: 500px;
    max-height: 70vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .search-box {
    display: flex;
    gap: 0.75rem;
    padding: 1.5rem;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: #ffffff;
    font-size: 1rem;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .search-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }

  .search-button {
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.75rem;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-button:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .search-results {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.5rem 1.5rem;
  }

  .location-result {
    width: 100%;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    color: #ffffff;
  }

  .location-result:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  .location-name {
    display: block;
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .location-full {
    display: block;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .search-loading, .no-results {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Language Dropdown */
  .language-dropdown {
    position: relative;
    z-index: 9999;
  }

  .language-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .language-button:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .language-button.open {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .dropdown-arrow {
    transition: transform 0.2s ease;
  }

  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }

  .language-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 200px;
    max-width: 250px;
    max-height: 400px;
    overflow-y: auto;
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 0.5rem;
    z-index: 9999;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .language-menu::-webkit-scrollbar {
    width: 6px;
  }

  .language-menu::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .language-menu::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .language-menu::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .language-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .language-option:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.95);
    transform: translateX(2px);
  }

  .language-option.selected {
    background: rgba(56, 189, 248, 0.1);
    color: rgba(56, 189, 248, 1);
    border: 1px solid rgba(56, 189, 248, 0.2);
  }

  .language-flag {
    font-size: 1.1rem;
    min-width: 1.2rem;
  }

  .language-name {
    flex: 1;
    font-weight: 500;
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .check-icon {
    width: 16px;
    height: 16px;
    color: rgba(56, 189, 248, 1);
  }

  /* Current Date/Time in header left */
  .current-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .current-time {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .app-header {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .header-left, .header-center, .header-right {
      width: 100%;
      justify-content: center;
    }

    .header-left {
      align-items: center;
      order: 2;
    }

    .header-center {
      order: 1;
      margin-bottom: 0.5rem;
    }

    .header-right {
      order: 3;
      flex-direction: column;
      gap: 1rem;
    }

    .view-tabs {
      justify-content: center;
    }

    .language-menu {
      left: 50%;
      transform: translateX(-50%);
      right: auto;
      max-height: 250px;
      min-width: 180px;
    }

    .main-content {
      padding: 1rem;
    }

    .weather-main {
      flex-direction: column;
      text-align: center;
      gap: 1.5rem;
    }

    .weather-details {
      justify-content: center;
    }

    .hourly-preview-detailed {
      grid-template-columns: 1fr;
    }

    .days-grid {
      grid-template-columns: 1fr;
    }

    .week-cards {
      grid-template-columns: 1fr;
    }

    .hourly-grid {
      grid-template-columns: 1fr;
    }

    .day-selector {
      flex-direction: column;
    }

    .temp-value {
      font-size: 4rem;
    }

    .temp-unit {
      font-size: 2rem;
    }
  }
</style>