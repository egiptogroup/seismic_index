/**
 * Seismic Observatory - Data Module
 * Contains static data, configuration constants, and knowledge bases.
 */

// USGS Data Sources & API Configuration
const USGS_CONFIG = {
  BASE_URL: 'https://earthquake.usgs.gov/fdsnws/event/1/',
  STATIC_FEEDS: [
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson',
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson'
  ]
};

// Advanced USGS API Client
const USGS_CLIENT = {
  // Core Endpoints
  endpoints: {
    query: 'query',
    count: 'count',
    catalogs: 'catalogs',
    contributors: 'contributors',
    version: 'version',
    application: 'application.json'
  },

  // Builder for custom queries
  queryBuilder: {
    params: {},
    reset() { this.params = { format: 'geojson' }; return this; },

    // Time Filters
    startTime(date) { this.params.starttime = date; return this; },
    endTime(date) { this.params.endtime = date; return this; },
    updatedAfter(date) { this.params.updatedafter = date; return this; },

    // Magnitude Filters
    minMag(val) { this.params.minmagnitude = val; return this; },
    maxMag(val) { this.params.maxmagnitude = val; return this; },

    // Depth Filters (km)
    minDepth(val) { this.params.mindepth = val; return this; },
    maxDepth(val) { this.params.maxdepth = val; return this; },

    // Location Filters (Rectangle)
    boundingBox(minLat, maxLat, minLon, maxLon) {
      this.params.minlatitude = minLat;
      this.params.maxlatitude = maxLat;
      this.params.minlongitude = minLon;
      this.params.maxlongitude = maxLon;
      return this;
    },

    // Location Filters (Circle)
    circle(lat, lon, maxRadiusKm) {
      this.params.latitude = lat;
      this.params.longitude = lon;
      this.params.maxradiuskm = maxRadiusKm;
      return this;
    },

    // Sorting & Limits
    orderBy(field) { this.params.orderby = field; return this; }, // time, time-asc, magnitude, magnitude-asc
    limit(count) { this.params.limit = count; return this; },
    offset(num) { this.params.offset = num; return this; },

    // Misc
    includeAllMagnitudes(bool) { this.params.includeallmagnitudes = bool; return this; },
    alertLevel(level) { this.params.alertlevel = level; return this; }, // green, yellow, orange, red

    // Build URL
    build(method = 'query') {
      const queryParams = new URLSearchParams(this.params).toString();
      return `${USGS_CONFIG.BASE_URL}${method}?${queryParams}`;
    }
  },

  // Preset Queries for Africa
  getAfricaEvents(minMag = 2.5, limit = 500) {
    return this.queryBuilder.reset()
      .boundingBox(-35, 38, -20, 55) // Africa Bounding Box
      .minMag(minMag)
      .orderBy('time')
      .limit(limit)
      .build();
  },

  // Global Significant Events
  getGlobalSignificant(limit = 20) {
    return this.queryBuilder.reset()
      .minMag(6.0)
      .orderBy('time')
      .limit(limit)
      .build();
  }
};

window.USGS_ENDPOINTS = USGS_CONFIG.STATIC_FEEDS; // Legacy support
window.USGS_CLIENT = USGS_CLIENT;

// Continents Data for Broad Filtering
const CONTINENTS = [
  { name: "Africa", code: "africa", coords: [0, 20], zoom: 3 },
  { name: "Asia", code: "asia", coords: [34.0, 100.0], zoom: 3 },
  { name: "Europe", code: "europe", coords: [54.5, 15.2], zoom: 4 },
  { name: "North America", code: "north_america", coords: [54.5, -105.2], zoom: 3 },
  { name: "South America", code: "south_america", coords: [-8.7, -55.9], zoom: 3 },
  { name: "Oceania", code: "oceania", coords: [-25.2, 133.7], zoom: 4 },
  { name: "Antarctica", code: "antarctica", coords: [-82.8, 135.0], zoom: 2 }
];

// Selected Major World Countries (Non-African) for Global Analysis
// [ArName, ISO, Coords, EnName, Population]
const WORLD_COUNTRIES = [
  ["الولايات المتحدة", "USA", [37.0902, -95.7129], "USA", 333000000],
  ["الصين", "CHN", [35.8617, 104.1954], "China", 1412000000],
  ["الهند", "IND", [20.5937, 78.9629], "India", 1417000000],
  ["اليابان", "JPN", [36.2048, 138.2529], "Japan", 125000000],
  ["تركيا", "TUR", [38.9637, 35.2433], "Turkey", 85000000],
  ["إندونيسيا", "IDN", [-0.7893, 113.9213], "Indonesia", 275000000],
  ["إيران", "IRN", [32.4279, 53.6880], "Iran", 88000000],
  ["بريطانيا", "GBR", [55.3781, -3.4360], "UK", 67000000],
  ["فرنسا", "FRA", [46.2276, 2.2137], "France", 68000000],
  ["ألمانيا", "DEU", [51.1657, 10.4515], "Germany", 84000000],
  ["روسيا", "RUS", [61.5240, 105.3188], "Russia", 144000000],
  ["البرازيل", "BRA", [-14.2350, -51.9253], "Brazil", 215000000],
  ["المكسيك", "MEX", [23.6345, -102.5528], "Mexico", 127000000],
  ["تشيلي", "CHL", [-35.6751, -71.5430], "Chile", 19600000],
  ["إيطاليا", "ITA", [41.8719, 12.5674], "Italy", 59000000],
  ["اليونان", "GRC", [39.0742, 21.8243], "Greece", 10400000],
  ["الفلبين", "PHL", [12.8797, 121.7740], "Philippines", 115000000],
  ["باكستان", "PAK", [30.3753, 69.3451], "Pakistan", 235000000]
];

// All African countries with coordinates [ArName, ISO, Coords, EnName, Population(Est)]
// Population data based on WorldPop & UN Projections (2024)
const AFRICAN_COUNTRIES = [
  ["الجزائر", "DZA", [28.0339, 1.6596], "Algeria", 46700000],
  ["أنغولا", "AGO", [-11.2027, 17.8739], "Angola", 37300000],
  ["بنين", "BEN", [9.3077, 2.3158], "Benin", 14000000],
  ["بوتسوانا", "BWA", [-22.3285, 24.6849], "Botswana", 2700000],
  ["بوركينا فاسو", "BFA", [12.2383, -1.5616], "Burkina Faso", 23000000],
  ["بوروندي", "BDI", [-3.3731, 29.9189], "Burundi", 14000000],
  ["الرأس الأخضر", "CPV", [16.5388, -23.0418], "Cabo Verde", 600000],
  ["الكاميرون", "CMR", [7.3697, 12.3547], "Cameroon", 29000000],
  ["جمهورية أفريقيا الوسطى", "CAF", [6.6111, 20.9394], "Central African Republic", 5700000],
  ["تشاد", "TCD", [15.4542, 18.7322], "Chad", 19000000],
  ["جزر القمر", "COM", [-11.6455, 43.3333], "Comoros", 900000],
  ["الكونغو", "COG", [-0.2280, 15.8277], "Congo", 6100000],
  ["ساحل العاج", "CIV", [7.5400, -5.5471], "Cote d'Ivoire", 29000000],
  ["جمهورية الكونغو الديمقراطية", "COD", [-4.0383, 21.7587], "DR Congo", 105000000],
  ["جيبوتي", "DJI", [11.8251, 42.5903], "Djibouti", 1150000],
  ["مصر", "EGY", [26.8206, 30.8025], "Egypt", 114000000],
  ["غينيا الاستوائية", "GNQ", [1.6508, 10.2679], "Equatorial Guinea", 1800000],
  ["إريتريا", "ERI", [15.1794, 39.7823], "Eritrea", 3700000],
  ["إسواتيني", "SWZ", [-26.5225, 31.4659], "Eswatini", 1200000],
  ["إثيوبيا", "ETH", [9.1450, 40.4897], "Ethiopia", 129000000],
  ["الغابون", "GAB", [-0.8037, 11.6094], "Gabon", 2400000],
  ["غامبيا", "GMB", [13.4432, -15.3101], "Gambia", 2800000],
  ["غانا", "GHA", [7.9465, -1.0232], "Ghana", 34000000],
  ["غينيا", "GIN", [9.9456, -9.6966], "Guinea", 14500000],
  ["غينيا بيساو", "GNB", [11.8037, -15.1804], "Guinea-Bissau", 2150000],
  ["كينيا", "KEN", [-0.0236, 37.9062], "Kenya", 56000000],
  ["ليسوتو", "LSO", [-29.6099, 28.2336], "Lesotho", 2300000],
  ["ليبيريا", "LBR", [6.4281, -9.4295], "Liberia", 5500000],
  ["ليبيا", "LBY", [26.3351, 17.2283], "Libya", 7000000],
  ["مدغشقر", "MDG", [-18.7669, 46.8691], "Madagascar", 31000000],
  ["مالاوي", "MWI", [-13.2543, 34.3015], "Malawi", 21000000],
  ["مالي", "MLI", [17.5707, -3.9962], "Mali", 23000000],
  ["موريتانيا", "MRT", [21.0079, -10.9408], "Mauritania", 5000000],
  ["موريشيوس", "MUS", [-20.3484, 57.5522], "Mauritius", 1300000],
  ["المغرب", "MAR", [31.7917, -7.0926], "Morocco", 38000000],
  ["موزمبيق", "MOZ", [-18.6657, 35.5296], "Mozambique", 34000000],
  ["ناميبيا", "NAM", [-22.9576, 18.4904], "Namibia", 2600000],
  ["النيجر", "NER", [17.6078, 8.0817], "Niger", 27000000],
  ["نيجيريا", "NGA", [9.0820, 8.6753], "Nigeria", 226000000],
  ["رواندا", "RWA", [-1.9403, 29.8739], "Rwanda", 14000000],
  ["ساو تومي وبرينسيب", "STP", [0.1864, 6.6131], "Sao Tome", 230000],
  ["السنغال", "SEN", [14.4974, -14.4524], "Senegal", 18000000],
  ["سيشل", "SYC", [-4.6796, 55.4920], "Seychelles", 107000],
  ["سيراليون", "SLE", [8.4606, -11.7799], "Sierra Leone", 9000000],
  ["الصومال", "SOM", [5.1521, 46.1996], "Somalia", 18000000],
  ["جنوب أفريقيا", "ZAF", [-30.5595, 22.9375], "South Africa", 61000000],
  ["جنوب السودان", "SSD", [6.8770, 31.3070], "South Sudan", 11000000],
  ["السودان", "SDN", [12.8628, 30.2176], "Sudan", 49000000],
  ["تنزانيا", "TZA", [-6.3690, 34.8888], "Tanzania", 69000000],
  ["توغو", "TGO", [8.6195, 0.8248], "Togo", 9000000],
  ["تونس", "TUN", [33.8869, 9.5375], "Tunisia", 12500000],
  ["أوغندا", "UGA", [1.3733, 32.2903], "Uganda", 49000000],
  ["زامبيا", "ZMB", [-13.1339, 27.8493], "Zambia", 20000000],
  ["زيمبابوي", "ZWE", [-19.0154, 29.1549], "Zimbabwe", 16000000]
];

// AI Assistant Knowledge Base
const AI_KNOWLEDGE = {
  'ar': {
    'greeting': 'مرحباً! أنا Michael، المساعد الذكي للمرصد الزلزالي. يمكنني تزويدك ببيانات فورية، تحليل المخاطر، أو معلومات علمية. كيف يمكنني مساعدتك؟',
    'latest_quakes': 'أحدث الزلازل المسجلة تظهر في القائمة. هل ترغب في معرفة أقوى زلزال اليوم؟',
    'measure_magnitude': 'يتم قياس قوة الزلازل باستخدام مقياس ريختر (للزلازل الصغيرة) ومقياس العزم الزلزالي (Mw) للزلازل الكبيرة لقياس الطاقة المحررة بدقة.',
    'seismic_zones': 'أخطر المناطق زلزالياً في أفريقيا هي: 1. الأخدود الإفريقي العظيم (يمر عبر إثيوبيا، كينيا، تنزانيا). 2. شمال أفريقيا (المغرب والجزائر) بسبب تصادم الصفيحة الأفريقية مع الأوروبية. 3. خليج السويس والعقبة.',
    'heatmap_interpretation': 'خريطة الحرارة (Heatmap) توضح تركز الطاقة الزلزالية. اللون الأحمر الداكن يعني نشاطاً كثيفاً أو زلازل قوية، بينما الأصفر يعني نشاطاً خفيفاً.',
    'earthquake_causes': 'السبب الرئيسي للزلازل هو حركة الصفائح التكتونية. عندما تحتك الصفائح ببعضها أو تتباعد، تتراكم الطاقة ثم تتحرر فجأة على شكل موجات زلزالية.',
    'safety_tips': 'إرشادات السلامة:\n1. (انخض، احتمي، تمسك) إذا كُنت بالداخل.\n2. ابتعد عن النوافذ والمباني المتصدعة.\n3. جهز حقيبة طوارئ.\n4. لا تستخدم المصعد أبداً.',
    'data_sources': 'بياناتنا مستمدة لحظياً من هيئة المسح الجيولوجي الأمريكية (USGS) والمركز الأوروبي المتوسطي لرصد الزلازل (EMSC).',
    'p_wave': 'الموجات الأولية (P-waves) هي أسرع الموجات الزلزالية وتصل أولاً، وهي موجات تضاغطية (تدفع وتسحب الأرض).',
    's_wave': 'الموجات الثانوية (S-waves) تصل بعد الموجات الأولية، وهي موجات قصية (تحرك الأرض عمودياً) وتسبب دماراً أكبر.',
    'aftershock': 'التوابع الزلزالية هي زلازل أصغر تحدث في نفس المنطقة بعد الزلزال الرئيسي، وقد تستمر لأيام أو شهور.',
    'risk_assessment': 'يمكنني تحليل البيانات التاريخية لمنطقتك لتقدير مستوى الخطر. فقط اذكر اسم الدولة.',
    'report_help': 'يمكنك تحميل تقرير مفصل عن أي زلزال بالضغط عليه ثم اختيار "تصدير PDF" أو "صورة".',
    'unknown': 'عذراً، لم أفهم سؤالك تماماً. هل تسأل عن: أحدث الزلازل، إحصائيات دولة معينة، مصطلحات علمية، أو إجراءات السلامة؟',
    'stats_template': 'إحصائيات {country}:\n• عدد الزلازل (آخر 30 يوم): {count}\n• أقصى قوة: {max_mag}\n• متوسط العمق: {avg_depth} كم',
    'no_events_template': 'لم يتم رصد زلازل ملحوظة في {country} خلال الشهر الماضي.'
  },
  'en': {
    'greeting': 'Hello! I\'m Michael, the Seismic Observatory AI. I can provide real-time data, risk analysis, or scientific info. How can I assist you?',
    'latest_quakes': 'Latest earthquakes are listed on the left panel. Would you like to know the strongest one today?',
    'measure_magnitude': 'Earthquakes are measured using the Richter scale (for small ones) and Moment Magnitude (Mw) scale (for large ones) to accurately capture released energy.',
    'seismic_zones': 'Most active zones in Africa: 1. East African Rift (Ethiopia, Kenya, Tanzania). 2. North Africa (Morocco, Algeria) due to plate collision. 3. Gulf of Suez/Aqaba.',
    'heatmap_interpretation': 'The Heatmap shows seismic energy concentration. Dark red indicates intense activity or strong quakes, while yellow indicates minor activity.',
    'earthquake_causes': 'Earthquakes are primarily caused by tectonic plate movements. Accumulated stress at plate boundaries is released as seismic waves.',
    'safety_tips': 'Safety Guide:\n1. Drop, Cover, and Hold On.\n2. Stay away from windows.\n3. Prepare an emergency kit.\n4. Do NOT use elevators.',
    'data_sources': 'Our data is sourced in real-time from USGS and EMSC (European-Mediterranean Seismological Centre).',
    'p_wave': 'P-waves (Primary waves) are the fastest seismic waves, arriving first. They compress and expand the ground.',
    's_wave': 'S-waves (Secondary waves) arrive after P-waves. They shear the ground sideways/vertically and typically cause more damage.',
    'aftershock': 'Aftershocks are smaller quakes following the mainshock in the same area, lasting days or months.',
    'risk_assessment': 'I can analyze historical data for your region to estimate risk. Just name the country.',
    'report_help': 'You can download reports for any event by clicking it and selecting "Export PDF" or "Image".',
    'unknown': 'I didn\'t catch that. valid topics: Latest quakes, Country stats, Scientific terms (P-wave, Mag), or Safety tips.',
    'stats_template': 'Statistics for {country}:\n• Count (Last 30d): {count}\n• Max Mag: {max_mag}\n• Avg Depth: {avg_depth} km',
    'no_events_template': 'No significant earthquakes detected in {country} over the past month.'
  },
  'fr': {
    'greeting': 'Bonjour! Je suis Michael, l\'IA de l\'Observatoire Sismique. Je peux fournir des données en temps réel, des analyses de risques ou des infos scientifiques. Comment puis-je vous aider?',
    'latest_quakes': 'Les derniers séismes sont listés à gauche. Voulez-vous connaître le plus fort aujourd\'hui?',
    'measure_magnitude': 'Les séismes sont mesurés avec l\'échelle de Richter (petits) et la Magnitude de Moment (Mw) pour mesurer précisément l\'énergie libérée.',
    'seismic_zones': 'Zones actives en Afrique: 1. Rift Est-Africain. 2. Afrique du Nord (Maroc, Algérie). 3. Golfe de Suez.',
    'heatmap_interpretation': 'La carte thermique montre la concentration d\'énergie sismique. Le rouge indique une activité intense.',
    'earthquake_causes': 'Les séismes sont causés par les mouvements des plaques tectoniques. Le stress accumulé est libéré sous forme d\'ondes sismiques.',
    'safety_tips': 'Sécurité:\n1. Baissez-vous, Abritez-vous, Agrippez-vous.\n2. Éloignez-vous des fenêtres.\n3. Préparez un kit d\'urgence.',
    'data_sources': 'Nos données proviennent en temps réel de l\'USGS et du CSEM.',
    'p_wave': 'Ondes P (Primaires): les plus rapides, elles compriment le sol.',
    's_wave': 'Ondes S (Secondaires): arrivant après, elles cisaillent le sol et causent des dégâts.',
    'aftershock': 'Les répliques sont des séismes plus petits suivant le choc principal.',
    'risk_assessment': 'Je peux analyser les données historiques pour votre région. Nommez simplement le pays.',
    'report_help': 'Téléchargez un rapport en cliquant sur un événement puis "Export PDF".',
    'unknown': 'Pardon? Sujets valides: Derniers séismes, Stats pays, Termes scientifiques, ou Conseils sécurité.',
    'stats_template': 'Stats pour {country}:\n• Nombre (30j): {count}\n• Max Mag: {max_mag}\n• Profondeur moy: {avg_depth} km',
    'no_events_template': 'Aucun séisme notable détecté en {country} le mois dernier.'
  }
};

// UI Translations
const TRANSLATIONS = {
  'ar': {
    'app_title': 'مرصد أفريقيا للزلازل',
    'live_feed': 'بث مباشر',
    'updating': 'جاري التحديث...',
    'search_loc': 'ابحث عن موقع...',
    'all_mag': 'كل القوى',
    'mag_2_5': '2.5+ (محسوس)',
    'mag_4_5': '4.5+ (متوسط)',
    'mag_6_0': '6.0+ (قوي)',
    'refresh': 'تحديث',
    'analytics': 'التحليلات',
    'export_pdf': 'تقرير PDF',
    'detected_month': 'الزلازل (شهر)',
    'max_mag': 'أقصى قوة',
    'freq_dist': 'توزيع التكرار',
    'filter_countries': 'تصفية الدول...',
    'notifications': 'الإشعارات',
    'settings': 'الإعدادات',
    'alert_threshold': 'عتبة التنبيه (قوة)',
    'auto_refresh': 'تحديث تلقائي',
    'off': 'إيقاف',
    '1_min': '1 دقيقة',
    '5_min': '5 دقائق',
    'sound_alerts': 'تنبيهات صوتية',
    'high_contrast': 'تباين عالي',
    'chat_placeholder': 'اطرح سؤالاً... (مثال: زلازل مصر)',
    'view_2d': 'خريطة 2D',
    'view_3d': 'مجسم 3D',
    'details_title': 'تفاصيل الزلزال',
    'export_opts': 'خيارات التصدير',
    'exp_pdf_desc': 'تقرير شامل مع الخريطة',
    'exp_excel_desc': 'بيانات بصيغة جدول',
    'exp_img_desc': 'لقطة للشاشة الحالية',
    'exp_img_btn': 'حفظ صورة',
    'appearance_settings': 'المظهر والواجهة',
    'theme': 'وضع المظهر',
    'animations': 'الحركات (الأداء)',
    'data_alerts': 'البيانات والتنبيهات',
    'data_source': 'مصدر البيانات',
    'map_options': 'إعدادات الخريطة',
    'map_style': 'نمط الخريطة'
  },
  'en': {
    'app_title': 'AfricaSky Seismic Observatory',
    'live_feed': 'Live Feed',
    'updating': 'Updating...',
    'search_loc': 'Search location...',
    'all_mag': 'All Magnitudes',
    'mag_2_5': '2.5+ (Minor)',
    'mag_4_5': '4.5+ (Moderate)',
    'mag_6_0': '6.0+ (Strong)',
    'refresh': 'Refresh',
    'analytics': 'Analytics',
    'export_pdf': 'Export PDF',
    'detected_month': 'Detected (Month)',
    'max_mag': 'Max Magnitude',
    'freq_dist': 'Frequency Dist.',
    'filter_countries': 'Filter countries...',
    'notifications': 'Notifications',
    'settings': 'Settings',
    'alert_threshold': 'Alert Threshold',
    'auto_refresh': 'Auto Refresh',
    'off': 'Off',
    '1_min': '1 min',
    '5_min': '5 mins',
    'sound_alerts': 'Sound Alerts',
    'high_contrast': 'High Contrast',
    'chat_placeholder': 'Ask a question... (e.g., Egypt stats)',
    'view_2d': '2D Map',
    'view_3d': '3D Globe',
    'details_title': 'Earthquake Details',
    'export_opts': 'Export Options',
    'exp_pdf_desc': 'Full report with map',
    'exp_excel_desc': 'Spreadsheet data',
    'exp_img_desc': 'Current view snapshot',
    'exp_img_btn': 'Save Image',
    'appearance_settings': 'Visual & Interface',
    'theme': 'Theme Mode',
    'animations': 'Animations (Performance)',
    'data_alerts': 'Data & Alerts',
    'data_source': 'Data Source',
    'map_options': 'Map Configuration',
    'map_style': 'Map Style'
  },
  'fr': {
    'app_title': 'Observatoire Sismique AfricaSky',
    'live_feed': 'Direct',
    'updating': 'Mise à jour...',
    'search_loc': 'Rechercher un lieu...',
    'all_mag': 'Toutes Magnitudes',
    'mag_2_5': '2.5+ (Mineur)',
    'mag_4_5': '4.5+ (Modéré)',
    'mag_6_0': '6.0+ (Fort)',
    'refresh': 'Actualiser',
    'analytics': 'Analyses',
    'export_pdf': 'Export PDF',
    'detected_month': 'Détecté (Mois)',
    'max_mag': 'Mag Max',
    'freq_dist': 'Dist. Fréquence',
    'filter_countries': 'Filtrer pays...',
    'notifications': 'Notifications',
    'settings': 'Paramètres',
    'alert_threshold': 'Seuil d\'alerte',
    'auto_refresh': 'Auto Actualisation',
    'off': 'Désactivé',
    '1_min': '1 min',
    '5_min': '5 mins',
    'sound_alerts': 'Alertes Sonores',
    'high_contrast': 'Haut Contraste',
    'chat_placeholder': 'Posez une question... (ex: stats Égypte)',
    'view_2d': 'Carte 2D',
    'view_3d': 'Globe 3D',
    'details_title': 'Détails du Séisme',
    'export_opts': 'Options d\'exportation',
    'exp_pdf_desc': 'Rapport complet avec carte',
    'exp_excel_desc': 'Données en tableau',
    'exp_img_desc': 'Capture d\'écran actuelle',
    'exp_img_btn': 'Enregistrer Image',
    'appearance_settings': 'Visuel & Interface',
    'theme': 'Thème',
    'animations': 'Animations (Perf)',
    'data_alerts': 'Données & Alertes',
    'data_source': 'Source de Données',
    'map_options': 'Configuration Carte',
    'map_style': 'Style de Carte'
  }
};

// Educational Content (Refined)
const EDUCATIONAL_CONTENT = {
  'ar': {
    'citizen': `<h4><i class="fa-solid fa-shield-halved"></i> مركز السلامة</h4><ul><li>تأكد من تثبيت الأثاث الثقيل.</li><li>حدد أماكن آمنة في كل غرفة.</li><li>اتبع تعليمات الدفاع المدني.</li></ul>`,
    'student': `<h4><i class="fa-solid fa-graduation-cap"></i> الركن العلمي</h4><ul><li><b>P-Waves:</b> موجات أولية سريعة.</li><li><b>S-Waves:</b> موجات ثانوية مدمرة.</li><li><b>القشرة الأرضية:</b> تتكسر عند حدود الصفائح.</li></ul>`,
    'scientist': `<h4><i class="fa-solid fa-flask"></i> أدوات البحث</h4><ul><li>تحليل فورييه للموجات.</li><li>حساب عزم الموتر (Moment Tensor).</li><li>دراسة الفجوات الزلزالية.</li></ul>`
  },
  'en': {
    'citizen': `<h4><i class="fa-solid fa-shield-halved"></i> Safety Center</h4><ul><li>Secure heavy furniture.</li><li>Identify safe spots in rooms.</li><li>Follow civil defense alerts.</li></ul>`,
    'student': `<h4><i class="fa-solid fa-graduation-cap"></i> Science Corner</h4><ul><li><b>P-Waves:</b> Fast, primary waves.</li><li><b>S-Waves:</b> Slower, destructive.</li><li><b>Crust:</b> Fractures at plate boundaries.</li></ul>`,
    'scientist': `<h4><i class="fa-solid fa-flask"></i> Research Tools</h4><ul><li>Fourier Wave Analysis.</li><li>Moment Tensor Calculation.</li><li>Seismic Gap Studies.</li></ul>`
  },
  'fr': {
    'citizen': `<h4><i class="fa-solid fa-shield-halved"></i> Centre de Sécurité</h4><ul><li>Sécurisez les meubles lourds.</li><li>Identifiez les endroits sûrs.</li><li>Suivez les alertes civiles.</li></ul>`,
    'student': `<h4><i class="fa-solid fa-graduation-cap"></i> Coin Science</h4><ul><li><b>Ondes P:</b> Rapides, primaires.</li><li><b>Ondes S:</b> Plus lentes, destructrices.</li><li><b>Croûte:</b> Se fracture aux limites.</li></ul>`,
    'scientist': `<h4><i class="fa-solid fa-flask"></i> Outils Recherche</h4><ul><li>Analyse de Fourier.</li><li>Calcul Tenseur Moment.</li><li>Étude Lacunes Sismiques.</li></ul>`
  }
};


// Global exports
window.USGS_ENDPOINTS = USGS_ENDPOINTS;
window.CONTINENTS = CONTINENTS;
window.WORLD_COUNTRIES = WORLD_COUNTRIES;
window.AFRICAN_COUNTRIES = AFRICAN_COUNTRIES;
window.AI_KNOWLEDGE = AI_KNOWLEDGE;
window.TRANSLATIONS = TRANSLATIONS;
window.EDUCATIONAL_CONTENT = EDUCATIONAL_CONTENT;

Object.assign(TRANSLATIONS['ar'], {
  'appearance_settings': 'المظهر والواجهة',
  'theme': 'وضع المظهر',
  'animations': 'الحركات (الأداء)',
  'data_alerts': 'البيانات والتنبيهات',
  'data_source': 'مصدر البيانات',
  'map_options': 'إعدادات الخريطة',
  'map_style': 'نمط الخريطة'
});

Object.assign(TRANSLATIONS['en'], {
  'appearance_settings': 'Visual & Interface',
  'theme': 'Theme Mode',
  'animations': 'Animations (Performance)',
  'data_alerts': 'Data & Alerts',
  'data_source': 'Data Source',
  'map_options': 'Map Configuration',
  'map_style': 'Map Style'
});
// Fallback Dataset for Simulation Mode
const MOCK_DATASET = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", id: "sim1", properties: { mag: 5.6, place: "Red Sea Rift, Egypt", time: Date.now() - 3600000 * 2, url: "#" }, geometry: { type: "Point", coordinates: [34.0, 27.5, 10] } },
    { type: "Feature", id: "sim2", properties: { mag: 6.8, place: "East African Rift, Ethiopia", time: Date.now() - 3600000 * 12, url: "#" }, geometry: { type: "Point", coordinates: [40.1, 9.0, 15] } },
    { type: "Feature", id: "sim3", properties: { mag: 4.5, place: "Atlas Mountains, Morocco", time: Date.now() - 3600000 * 24, url: "#" }, geometry: { type: "Point", coordinates: [-8.0, 31.5, 12] } },
    { type: "Feature", id: "sim4", properties: { mag: 3.2, place: "Cairo Region, Egypt", time: Date.now() - 3600000 * 48, url: "#" }, geometry: { type: "Point", coordinates: [31.2, 30.0, 5] } },
    { type: "Feature", id: "sim5", properties: { mag: 7.1, place: "Indian Ocean Ridge", time: Date.now() - 3600000 * 5, url: "#" }, geometry: { type: "Point", coordinates: [55.0, -10.0, 10] } },
    { type: "Feature", id: "sim6", properties: { mag: 4.9, place: "Lake Victoria, Uganda", time: Date.now() - 3600000 * 30, url: "#" }, geometry: { type: "Point", coordinates: [33.0, -1.0, 10] } },
    { type: "Feature", id: "sim7", properties: { mag: 5.1, place: "Gulf of Aden", time: Date.now() - 3600000 * 15, url: "#" }, geometry: { type: "Point", coordinates: [48.0, 12.0, 10] } },
    { type: "Feature", id: "sim8", properties: { mag: 6.2, place: "Mozambique Channel", time: Date.now() - 3600000 * 6, url: "#" }, geometry: { type: "Point", coordinates: [40.0, -18.0, 20] } },
    { type: "Feature", id: "sim9", properties: { mag: 4.2, place: "Algiers, Algeria", time: Date.now() - 3600000 * 20, url: "#" }, geometry: { type: "Point", coordinates: [3.0, 36.7, 8] } },
    { type: "Feature", id: "sim10", properties: { mag: 3.8, place: "Tripoli, Libya", time: Date.now() - 3600000 * 40, url: "#" }, geometry: { type: "Point", coordinates: [13.2, 32.9, 10] } }
  ]
};

window.MOCK_DATASET = MOCK_DATASET;
