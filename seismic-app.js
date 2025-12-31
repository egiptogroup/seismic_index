/**
 * Seismic Observatory - Main Application Logic
 * Handles state, data fetching, UI rendering, and user interactions.
 */

// Application State
const STATE = {
    quakes: [],
    filteredQuakes: [],
    map: null,
    layerGroup: null,
    heatLayer: null,
    chart: null,
    selectedCountry: null,
    db: null,
    lastUpdate: null,
    settings: {
        autoRefresh: 0,
        showImportantOnly: false,
        soundAlerts: true,
        pushNotifications: false,
        alertThreshold: '5.5',
        simplifiedView: false,
        largeText: false,
        highContrast: false,
        animations: true,
        dataSource: 'live' // live | mock
    },

    // Settings Actions
    setTheme: (theme) => {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('seismic_theme', theme);

        // Update active buttons
        const btns = document.querySelectorAll('.toggle-btn');
        btns.forEach(b => {
            if (b.innerText.toLowerCase().includes(theme)) b.classList.add('active');
            else b.classList.remove('active');
        });
    },

    toggleAnimations: (enabled) => {
        STATE.settings.animations = enabled;
        if (enabled) document.body.classList.remove('no-anims');
        else document.body.classList.add('no-anims');
    },

    setDataSource: (source) => {
        STATE.settings.dataSource = source;
        Utils.showToast(`Switched Data Source: ${source.toUpperCase()}`);
        fetchUSGSData(); // Reload
    },

    setMapStyle: (style) => {
        if (!STATE.map) return;

        // Remove existing tile layer
        STATE.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                STATE.map.removeLayer(layer);
            }
        });

        let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'; // Default dark
        if (style === 'sat') url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        if (style === 'light') url = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        L.tileLayer(url, { maxZoom: 19 }).addTo(STATE.map);
    },

    userProfile: {
        type: 'citizen', // citizen, student, scientist
        name: 'زائر',
        preferences: {}
    },
    currentLang: 'ar', // Default language
    cacheManager: null
};

// Language Manager
const Lang = {
    setLanguage: (lang) => {
        if (!window.TRANSLATIONS || !window.TRANSLATIONS[lang]) return;

        STATE.currentLang = lang;
        localStorage.setItem('seismic_lang', lang);

        // Update HTML attributes
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update all static text
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (window.TRANSLATIONS[lang][key]) {
                // If it's an input/textarea with placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = window.TRANSLATIONS[lang][key];
                } else {
                    el.innerHTML = window.TRANSLATIONS[lang][key];
                }
            }
        });

        // Update specialized content
        updateUserInterface();

        // Update active buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.toLowerCase() === lang);
        });

        // Refresh country list to update names if we had dual names (currently static array is mixed, but we could improve later)
        renderCountries();

        // Update Chat Suggestions
        if (window.updateChatSuggestions) window.updateChatSuggestions();
    },

    init: () => {
        const saved = localStorage.getItem('seismic_lang') || 'ar';
        Lang.setLanguage(saved);

        // Bind toggle buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.onclick = () => Lang.setLanguage(btn.innerText.toLowerCase());
        });
    }
};


// IndexedDB Wrapper
const IDB = {
    db: null,
    async init() {
        return new Promise((resolve, reject) => {
            const parts = window.location.pathname.split('/');
            const dbName = 'SeismicDB_' + (parts[parts.length - 1] || 'index');
            const request = indexedDB.open(dbName, 2);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
                if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
                if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('chat_history')) db.createObjectStore('chat_history', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('user_profile')) db.createObjectStore('user_profile');
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log("DB Loaded");
                resolve(this.db);
            };
            request.onerror = (e) => reject("DB Error");
        });
    },
    async get(store, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(null);
            const tx = this.db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    },
    async put(store, val, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(false);
            const tx = this.db.transaction(store, 'readwrite');
            const s = tx.objectStore(store);
            if (key) s.put(val, key);
            else s.put(val);
            tx.oncomplete = () => resolve(true);
            tx.onerror = reject;
        });
    },
    async getAll(store) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = reject;
        });
    }
};

// Cache Manager
class CacheManager {
    constructor() {
        this.memoryCache = new Map();
    }

    async get(key) {
        // Check memory first
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            if (Date.now() < item.expiry) return item.data;
        }
        // Check IDB
        const record = await IDB.get('cache', key);
        if (record && Date.now() < record.expiry) {
            this.memoryCache.set(key, record);
            return record.data;
        }
        return null;
    }

    async set(key, data, ttl = 300000) { // 5 min default
        const record = { data, expiry: Date.now() + ttl };
        this.memoryCache.set(key, record);
        await IDB.put('cache', record, key);
    }
}

// Icons
const Icons = {
    quake: (mag) => {
        let color = mag < 4 ? '#2ecc71' : mag < 6 ? '#f39c12' : '#e74c3c';
        let size = mag * 4;
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width:${size}px; height:${size}px; border-radius:50%; border:2px solid #fff; opacity:0.8; box-shadow:0 0 10px ${color}"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    }
};

// Utilities
const Utils = {
    formatDate: (ts) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    getMagClass: (m) => m < 4 ? 'low' : m < 6 ? 'mid' : 'high',
    playAlertSound: () => {
        if (!STATE.settings.soundAlerts) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1);
        osc.stop(ctx.currentTime + 1);
    },
    showToast: (msg) => {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${msg}</span>`;
        t.classList.add('show');
        Utils.playAlertSound();
        setTimeout(() => t.classList.remove('show'), 4000);
    }
};

// Initialization
async function init() {
    await IDB.init();
    STATE.cacheManager = new CacheManager();
    console.log("System v2.1 Loaded");
    setTimeout(() => Utils.showToast("System Updated & Ready"), 1000);

    // Load Settings
    const savedSettings = await IDB.get('settings', 'config');
    if (savedSettings) STATE.settings = { ...STATE.settings, ...savedSettings };

    // Load User Profile
    const savedProfile = await IDB.get('user_profile', 'profile');
    if (savedProfile) STATE.userProfile = { ...STATE.userProfile, ...savedProfile };

    // Apply settings/profile
    updateUserInterface(); // This function should be defined to update UI based on profile
    if (STATE.settings.highContrast) document.body.classList.add('high-contrast');
    if (STATE.settings.largeText) document.body.classList.add('large-text');

    // Init Language
    Lang.init();

    // Setup Map
    initMap();

    // Setup Charts (Analytics)
    initCharts();

    // Render Countries
    renderCountries();

    // Event Listeners
    setupEventListeners();

    // Fetch Data
    fetchUSGSData();

    // Start Auto Refresh if enabled
    if (STATE.settings.autoRefresh > 0) {
        setInterval(fetchUSGSData, STATE.settings.autoRefresh * 60000);
    }

    // Load Notifications
    updateNotificationDisplay();
}

// --- SYSTEM INIT FLOW ---
window.showRegionSelection = () => {
    document.getElementById('initScreen').style.display = 'none';
    const sel = document.getElementById('regionSelect');
    sel.style.display = 'flex';
    // Helper to play sound if needed
    if (window.Utils) Utils.playAlertSound();
};

window.initSystem = (region = 'africa') => {
    // Store region in state
    STATE.region = region;

    // Play sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); // Sci-fi startup
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio prevent"));

    // Fade out overlay
    const overlay = document.getElementById('startOverlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        document.querySelector('.app').style.opacity = '1';

        // Init Map Focus based on region
        if (STATE.map) {
            if (region === 'egypt') STATE.map.flyTo([26.8, 30.8], 6, { duration: 2 });
            else if (region === 'global') STATE.map.flyTo([20, 0], 2, { duration: 2 });
            else STATE.map.flyTo([0, 20], 3, { duration: 2 }); // Africa
        }

        // Re-fetch data with new region context
        fetchUSGSData();

    }, 1000);

    // Init Music if allowed
    // toggleMusic();
};


function initMap() {
    // Inject Leaflet Heatmap Script dynamically
    if (!L.heatLayer) {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
        document.head.appendChild(script);
        script.onload = () => console.log("Leaflet Heatmap Loaded");
    }

    STATE.map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([0, 20], 3);

    // Basemaps
    const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
    const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });

    // Default
    dark.addTo(STATE.map);

    // Layers
    const platesLayer = L.layerGroup();
    STATE.layerGroup = L.layerGroup().addTo(STATE.map); // Quakes Points
    STATE.bufferLayer = L.layerGroup(); // Buffer Zones (Hidden by default)
    STATE.heatmapLayer = L.layerGroup(); // Heatmap (Hidden by default)

    // Fetch Plates Data
    fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
        .then(res => res.json())
        .then(data => {
            L.geoJSON(data, {
                style: { color: "#ff5500", weight: 2, opacity: 0.7 }
            }).addTo(platesLayer);
        })
        .catch(e => console.warn("Failed to load tectonic plates", e));

    // Layer Controls
    const baseMaps = {
        "Dark Mode": dark,
        "Light Mode": light,
        "Satellite": satellite
    };

    const overlayMaps = {
        "Earthquakes": STATE.layerGroup,
        "Tectonic Plates": platesLayer,
        "Buffer Zones": STATE.bufferLayer
    };

    L.control.layers(baseMaps, overlayMaps).addTo(STATE.map);
    platesLayer.addTo(STATE.map);

    // --- Custom Toggle Controls (Icons) ---
    const createToggle = (iconClass, title, onClick) => {
        const ctrl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function () {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control custom-map-btn');
                btn.innerHTML = `<i class="${iconClass}"></i>`;
                btn.title = title;
                btn.style.cssText = "width:34px; height:34px; background:#fff; color:#333; border:none; cursor:pointer; font-size:16px; line-height:34px; text-align:center; box-shadow:0 1px 5px rgba(0,0,0,0.65); border-radius:4px; margin-bottom:5px;";
                btn.onmouseover = () => btn.style.background = '#f4f4f4';
                btn.onmouseout = () => btn.style.background = '#fff';
                btn.onclick = (e) => {
                    L.DomEvent.stopPropagation(e);
                    onClick(btn);
                };
                return btn;
            }
        });
        return new ctrl();
    };

    // Buffer Toggle
    createToggle('fa-solid fa-bullseye', 'Toggle Buffer Zones', (btn) => {
        if (STATE.map.hasLayer(STATE.bufferLayer)) {
            STATE.map.removeLayer(STATE.bufferLayer);
            btn.style.color = '#333';
        } else {
            STATE.map.addLayer(STATE.bufferLayer);
            btn.style.color = '#f72585'; // Active color
            Utils.showToast("Buffer Zones Enabled");
            updateAnalyticsDashboard(); // Trigger draw immediately
        }
    }).addTo(STATE.map);

    // Heatmap Toggle
    createToggle('fa-solid fa-fire', 'Toggle Heatmap', (btn) => {
        if (STATE.map.hasLayer(STATE.heatmapLayer)) {
            STATE.map.removeLayer(STATE.heatmapLayer);
            btn.style.color = '#333';
        } else {
            // Check if L.heatLayer is available
            if (L.heatLayer && STATE.quakes) {
                STATE.map.addLayer(STATE.heatmapLayer);
                btn.style.color = '#ff5500'; // Active
                Utils.showToast("Heatmap Enabled");
                updateAnalyticsDashboard(); // Trigger draw immediately
            } else {
                Utils.showToast("Loading Heatmap Library...");
            }
        }
    }).addTo(STATE.map);
}

// --- ANALYTICS & CHARTS ---
let charts = {}; // Store chart instances

function initCharts() {
    // 1. Mag Chart (Bar)
    if (document.getElementById('magChart')) {
        charts.mag = new Chart(document.getElementById('magChart'), {
            type: 'bar',
            data: { labels: ['<4', '4-5', '5-6', '>6'], datasets: [{ label: 'Events', data: [], backgroundColor: '#e056fd' }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } } }
        });
    }

    // 2. Depth Chart (Doughnut) - Fixed colors
    if (document.getElementById('depthChart')) {
        charts.depth = new Chart(document.getElementById('depthChart'), {
            type: 'doughnut',
            data: { labels: ['Shallow', 'Inter', 'Deep'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#52b788', '#f4a261', '#e76f51'], borderWidth: 0 }] },
            options: { cutout: '70%', plugins: { legend: { display: false } } }
        });
    }

    // 3. Trend Chart (Line)
    if (document.getElementById('trendChart')) {
        charts.trend = new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Activity', data: [], borderColor: '#ff6b6b', tension: 0.4, fill: true, backgroundColor: 'rgba(255, 107, 107, 0.1)' }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } }, maintainAspectRatio: false }
        });
    }

    // Populate Countries & Regions
    const sel = document.getElementById('analyticsCountry');
    if (sel) {
        // Clear existing (except "Global")
        sel.innerHTML = '<option value="all">Global (All Data)</option>';

        // 1. Continents Group
        if (window.CONTINENTS) {
            const grp = document.createElement('optgroup');
            grp.label = "--- Continents ---";
            window.CONTINENTS.forEach(c => {
                const opt = document.createElement('option');
                opt.value = `continent:${c.code}`;
                opt.innerText = c.name;
                // Store coords in dataset for easy flyTo
                opt.dataset.lat = c.coords[0];
                opt.dataset.lon = c.coords[1];
                opt.dataset.zoom = c.zoom;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }

        // 2. Africa Group
        if (window.AFRICAN_COUNTRIES) {
            const grp = document.createElement('optgroup');
            grp.label = "--- Africa ---";
            window.AFRICAN_COUNTRIES.sort((a, b) => a[3].localeCompare(b[3])).forEach(c => {
                const opt = document.createElement('option');
                opt.value = `country:${c[0]}`; // Ar Name ID
                opt.innerText = c[3]; // En Name
                opt.dataset.lat = c[2][0];
                opt.dataset.lon = c[2][1];
                opt.dataset.zoom = 5;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }

        // 3. World Group
        if (window.WORLD_COUNTRIES) {
            const grp = document.createElement('optgroup');
            grp.label = "--- World (Major) ---";
            window.WORLD_COUNTRIES.sort((a, b) => a[3].localeCompare(b[3])).forEach(c => {
                const opt = document.createElement('option');
                opt.value = `country:${c[0]}`; // Ar Name ID
                opt.innerText = c[3]; // En Name
                opt.dataset.lat = c[2][0];
                opt.dataset.lon = c[2][1];
                opt.dataset.zoom = 5;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        }

        // Listeners
        sel.addEventListener('change', (e) => {
            // Interactive FlyTo
            const selectedOpt = sel.options[sel.selectedIndex];
            if (selectedOpt.dataset.lat && STATE.map) {
                STATE.map.flyTo(
                    [parseFloat(selectedOpt.dataset.lat), parseFloat(selectedOpt.dataset.lon)],
                    parseInt(selectedOpt.dataset.zoom)
                );
            }
            updateAnalyticsDashboard();
        });
        document.getElementById('analyticsPeriod').addEventListener('change', updateAnalyticsDashboard);
    }

    // Today Toggle Listener
    const tgl = document.getElementById('todayToggle');
    if (tgl) {
        tgl.addEventListener('click', () => {
            STATE.filterToday = !STATE.filterToday; // Toggle global state
            tgl.style.color = STATE.filterToday ? 'var(--magma)' : '#fff';
            applyFilters(); // Re-run all filters and update UI
        });
    }
}

function updateAnalyticsDashboard() {
    if (!STATE.quakes) return;

    // Get Settings
    const countryEl = document.getElementById('analyticsCountry');
    const periodEl = document.getElementById('analyticsPeriod');
    if (!countryEl || !periodEl) return;

    const countryVal = countryEl.value; // e.g. "country:EGY", "continent:asia", "all"
    const periodDays = parseInt(periodEl.value);
    const cutoff = Date.now() - (periodDays * 24 * 60 * 60 * 1000);

    // Parse Selection
    let mode = 'global';
    let target = 'all';
    if (countryVal.startsWith('country:')) {
        mode = 'country';
        target = countryVal.split(':')[1];
    } else if (countryVal.startsWith('continent:')) {
        mode = 'continent';
        target = countryVal.split(':')[1];
    }

    // Filter Data by Time
    let filtered = STATE.quakes.filter(q => q.time >= cutoff);

    // Filter Data by Region
    if (mode === 'country') {
        // Find country name (En or Ar)
        let cData = window.AFRICAN_COUNTRIES && window.AFRICAN_COUNTRIES.find(c => c[0] === target);
        if (!cData) cData = window.WORLD_COUNTRIES && window.WORLD_COUNTRIES.find(c => c[0] === target);

        if (cData) {
            // Filter by Place Name (Simple) 
            // Using English Name is safest for USGS data
            const enName = cData[3];
            // Match En Name OR Ar Name OR Target ID. Specialized for Egypt.
            filtered = filtered.filter(q => q.place.includes(enName) || q.place.includes(target) || (target === 'مصر' && q.place.includes('Egypt')));
        }
    } else if (mode === 'continent') {
        const contData = window.CONTINENTS && window.CONTINENTS.find(c => c.code === target);
        if (contData) {
            // Simple Box Filters for Continents
            if (target === 'africa') filtered = filtered.filter(q => q.geometry.coordinates[1] >= -35 && q.geometry.coordinates[1] <= 38 && q.geometry.coordinates[0] >= -20 && q.geometry.coordinates[0] <= 55);
            else if (target === 'asia') filtered = filtered.filter(q => q.geometry.coordinates[1] >= 10 && q.geometry.coordinates[0] >= 25);
            else if (target === 'europe') filtered = filtered.filter(q => q.geometry.coordinates[1] >= 35 && q.geometry.coordinates[1] <= 70 && q.geometry.coordinates[0] >= -10 && q.geometry.coordinates[0] <= 40);
            else if (target === 'north_america') filtered = filtered.filter(q => q.geometry.coordinates[1] >= 15 && q.geometry.coordinates[0] <= -30);
            else if (target === 'south_america') filtered = filtered.filter(q => q.geometry.coordinates[1] <= 15 && q.geometry.coordinates[0] <= -30);
            // Fallback for others (oceania, etc) - loose or no filter if complex
        }
    }

    // --- CALCULATIONS ---
    const total = filtered.length;
    const maxMag = total > 0 ? Math.max(...filtered.map(q => q.mag)) : 0;

    // 1. Population Human Impact Index
    // Formula: Impact = Magnitude * log10(Population nearby)
    // We determine "Population nearby" heuristically from our static data since we don't have per-quake raster API.
    let maxImpactIndex = 0;

    // Heuristic Helper
    const getEstPopNearby = (q) => {
        let basePop = 1000; // Default rural
        // Try to match country
        if (window.AFRICAN_COUNTRIES) {
            const c = window.AFRICAN_COUNTRIES.find(c => q.place.includes(c[3]));
            if (c && c[4]) {
                // If total country pop is huge, assume reasonable density
                // e.g. 5% of country pop within 50km radius on average?? No, that's too high.
                // Let's use density. 
                basePop = c[4] * 0.005; // 0.5% estimation for "Nearby"
            }
        }
        // Boost for capitals or known cities
        if (q.place.toLowerCase().includes('capital') || q.place.toLowerCase().includes('cairo')) basePop *= 10;
        return Math.max(10, basePop);
    };

    if (total > 0) {
        // Find quake with max impact
        filtered.forEach(q => {
            const pop = getEstPopNearby(q);
            const index = q.mag * Math.log10(pop);
            if (index > maxImpactIndex) maxImpactIndex = index;
        });
    }

    // 2. Risk Score (Existing)
    let risk = 0;
    if (total > 0) {
        const avgMag = filtered.reduce((s, q) => s + q.mag, 0) / total;
        const shallowCount = filtered.filter(q => q.depth < 70).length;
        risk = Math.min(100, (total / 2) + (avgMag * 8) + ((shallowCount / total) * 10));
    }

    // 3. Charts Data
    // Mag Dist
    const mags = [0, 0, 0, 0]; // <4, 4-5, 5-6, >6
    filtered.forEach(q => {
        if (q.mag < 4) mags[0]++;
        else if (q.mag < 5) mags[1]++;
        else if (q.mag < 6) mags[2]++;
        else mags[3]++;
    });

    // Depth Dist
    const depths = [0, 0, 0]; // <70, 70-300, >300
    filtered.forEach(q => {
        if (q.depth < 70) depths[0]++;
        else if (q.depth < 300) depths[1]++;
        else depths[2]++;
    });

    // Trend
    const days = {};
    filtered.forEach(q => {
        const d = new Date(q.time).toLocaleDateString();
        days[d] = (days[d] || 0) + 1;
    });
    const sortedDays = Object.keys(days).sort((a, b) => new Date(a) - new Date(b));

    // Hotspots
    const places = {};
    filtered.forEach(q => {
        let p = q.place.split(' of ')[1] || q.place; // Clean
        if (p.length > 20) p = p.substring(0, 20) + '..';
        places[p] = (places[p] || 0) + 1;
    });
    const sortedPlaces = Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // --- RENDER ---
    safeSetText('totalCountVal', total);
    safeSetText('maxMagVal', maxMag.toFixed(1));
    safeSetText('riskScoreVal', risk.toFixed(0));

    // Update Energy Label to Population Exposure
    const enLabel = document.getElementById('energyLabel'); // We need to assume ID or select by context
    // Actually, let's look for the h3 inside the card that contains 'energyVal'
    const energyValEl = document.getElementById('energyVal');
    if (energyValEl) {
        // Update Value
        let exposure = "Low";
        let color = "#4cc9f0";
        if (maxImpactIndex > 40) { exposure = "High"; color = "#f72585"; }
        else if (maxImpactIndex > 25) { exposure = "Medium"; color = "#f48c06"; }

        energyValEl.innerHTML = `<span style="color:${color}">${exposure}</span> <span style="font-size:0.6em">(${maxImpactIndex.toFixed(1)})</span>`;

        // Find Label sibling
        const card = energyValEl.closest('.metric-card');
        if (card) {
            const h3 = card.querySelector('h3');
            if (h3) h3.innerText = "Pop. Exposure";
        }
    }

    // Draw Buffer Zones (Visual)
    if (STATE.map && filtered.length > 0) {
        // Clear old buffers if stored
        if (STATE.bufferLayer) STATE.bufferLayer.clearLayers();
        else {
            STATE.bufferLayer = L.layerGroup().addTo(STATE.map);
        }

        // Draw only for TOP impact event to avoid clutter
        // Or draw for the filtered list if small
        const topEvent = filtered.sort((a, b) => b.mag - a.mag)[0];
        if (topEvent && topEvent.geometry) {
            const [lon, lat] = topEvent.geometry.coordinates;
            // 10km Zone (High Risk)
            const popIndex = maxImpactIndex.toFixed(1);
            const popEst = Utils.formatNumber(Math.round(getEstPopNearby(topEvent))); // Re-calc for specific event

            const popupContent = `
                <div style="font-family:'Poppins',sans-serif; min-width:200px">
                    <h4 style="margin:0; color:#f72585; border-bottom:1px solid #ddd; padding-bottom:5px">Impact Zone Analysis</h4>
                    <p style="margin:5px 0"><b>Epicenter Radius:</b> <span style="color:#f72585">10 km (High Intensity)</span></p>
                    <p style="margin:5px 0"><b>Population Exposure Idx:</b> ${popIndex}</p>
                    <p style="margin:5px 0"><b>Est. Pop. Affected:</b> ~${popEst}</p>
                    <p style="margin:5px 0; font-size:0.85em; color:#666">Highest risk of structural damage and infrastructure impact.</p>
                </div>
            `;

            L.circle([lat, lon], {
                color: '#f72585',
                fillColor: '#f72585',
                fillOpacity: 0.3,
                radius: 10000
            }).addTo(STATE.bufferLayer).bindPopup(popupContent);

            // 50km Zone (Medium Risk)
            const popupContent50 = `
                 <div style="font-family:'Poppins',sans-serif;">
                    <h4 style="margin:0; color:#f48c06">Secondary Zone</h4>
                    <p style="margin:5px 0"><b>Radius:</b> 50 km (Moderate Shaking)</p>
                    <p style="margin:5px 0; font-size:0.85em; color:#666">Likely felt by population, minor damage possible.</p>
                </div>
            `;

            L.circle([lat, lon], {
                color: '#f48c06',
                fillColor: '#f48c06',
                fillOpacity: 0.15,
                radius: 50000,
                dashArray: '10, 10'
            }).addTo(STATE.bufferLayer).bindPopup(popupContent50);
        }
    }

    // Update Heatmap (Reactive)
    if (STATE.map && STATE.heatmapLayer && STATE.map.hasLayer(STATE.heatmapLayer)) {
        if (typeof L.heatLayer === 'function') {
            // Intensity: Normalize Mag (e.g. Max 9) -> 0.0 to 1.0
            // Use q.mag / 9.0 as intensity
            const heatPoints = filtered.map(q => [q.lat, q.lon, (q.mag / 9.0) * 1.5]); // Intensity boosted slightly
            STATE.heatmapLayer.clearLayers();
            L.heatLayer(heatPoints, { radius: 25, blur: 20, maxZoom: 10 }).addTo(STATE.heatmapLayer);
            console.log("Heatmap Updated with", heatPoints.length, "points");
        }
    }

    const rBar = document.getElementById('riskBar');
    if (rBar) {
        rBar.style.width = risk + '%';
        rBar.style.backgroundColor = risk > 70 ? 'var(--danger)' : (risk > 40 ? 'orange' : 'var(--success)');
    }

    // Charts Update
    if (charts.mag) {
        charts.mag.data.datasets[0].data = mags;
        charts.mag.update();
    }
    if (charts.depth) {
        charts.depth.data.datasets[0].data = depths;
        charts.depth.update();
    }
    if (charts.trend) {
        charts.trend.data.labels = sortedDays;
        charts.trend.data.datasets[0].data = sortedDays.map(d => days[d]);
        charts.trend.update();
    }

    // Hotspots List
    const hotList = document.getElementById('hotspotsList');
    if (hotList) hotList.innerHTML = sortedPlaces.map(p => `<li><span style="float:right; color:#888">${p[1]}</span>${p[0]}</li>`).join('');

    // Text & Signature
    const sig = document.getElementById('signatureText');
    if (sig) {
        if (total === 0) sig.innerText = "No seismic signature recorded for this period.";
        else if (risk > 60) sig.innerText = "High-Stress Zone: Significant energy release indicating active tectonic deformation.";
        else sig.innerText = "Stable Zone: Minor background seismicity detected, typical of intraplate regions.";
    }

    // Impact & Population
    const impact = document.getElementById('impactText');
    if (impact) {
        if (mode === 'country') {
            // Try to find in Africa or World
            let cData = window.AFRICAN_COUNTRIES && window.AFRICAN_COUNTRIES.find(c => c[0] === target);
            if (!cData) cData = window.WORLD_COUNTRIES && window.WORLD_COUNTRIES.find(c => c[0] === target);

            // cData index 4 is Population
            const pop = cData && cData[4] ? Utils.formatNumber(cData[4]) : "Unknown";
            const popSource = `<br><span style="font-size:0.8em; color:#666">Source: WorldPop / UN Projections</span>`;

            if (risk > 50) {
                impact.innerHTML = `High Impact Potential. <br>Est. Population in Region: <b style="color:#fff">${pop}</b>.${popSource}`;
            } else {
                impact.innerHTML = `Low Impact Observed. <br>Est. Population in Region: <b style="color:#fff">${pop}</b>.${popSource}`;
            }
        } else if (mode === 'continent') {
            impact.innerHTML = "Continent-wide analysis active. Select a specific country for population statistics.";
        } else {
            impact.innerHTML = "Global analysis active.";
        }
    }
}

// Helper
function safeSetText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function updateChart(quakes) {
    updateAnalyticsDashboard(); // Hook into new system
}

function setupEventListeners() {
    // Search Inputs
    document.getElementById('searchMag')?.addEventListener('input', applyFilters);
    document.getElementById('searchLoc')?.addEventListener('input', applyFilters);

    // Refresh Button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        const icon = document.querySelector('#refreshBtn i');
        icon.classList.add('fa-spin');
        fetchUSGSData().then(() => setTimeout(() => icon.classList.remove('fa-spin'), 1000));
    });

    // Map/Globe Toggle
    document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.closest('button').dataset.view;
            const mapWrap = document.getElementById('mapWrap');
            const globeWrap = document.getElementById('globeWrap');

            if (mode === '3d') {
                mapWrap.style.display = 'none';
                globeWrap.style.display = 'block';

                // Initialize Enhanced Globe if not already done
                if (typeof window.initEnhancedGlobe === 'function' && !globeWrap.dataset.initialized) {
                    window.initEnhancedGlobe();
                    globeWrap.dataset.initialized = 'true';

                    // Add existing earthquakes to globe after initialization
                    setTimeout(() => {
                        if (STATE.filteredQuakes && typeof window.addEarthquakeToGlobe === 'function') {
                            STATE.filteredQuakes.forEach(q => {
                                window.addEarthquakeToGlobe(q.lat, q.lon, q.mag);
                            });
                        }
                    }, 500);
                }
            } else {
                mapWrap.style.display = 'block';
                globeWrap.style.display = 'none';
                STATE.map.invalidateSize();
            }
        });
    });

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('show');
        });
    }

    // User Profile
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            // Logic to show profile modal or toggle
            // specialized implementation
        });
    }

    // Country Search
    const countrySearch = document.getElementById('countrySearch');
    if (countrySearch) {
        countrySearch.addEventListener('input', (e) => renderCountries(e.target.value));
    }
}

async function fetchUSGSData() {
    // 1. Determine Context
    const region = STATE.region || 'africa';
    let url;

    // Timeframe: Default to 30 Days for main feed to ensure data population
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startStr = thirtyDaysAgo.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    // 2. Build URL based on EXACT User Specifications (Strict Mode)
    if (window.USGS_CLIENT) {
        const builder = window.USGS_CLIENT.queryBuilder.reset()
            .orderBy('time')
            .limit(20000);

        if (region === 'egypt') {
            // EGYPT SPECIFIC (Precision Mode)
            // Bounds: 21-32N, 24-36E. MinMag: 0
            console.log("Fetching: Egypt Mode");
            url = builder
                .startTime(startStr)
                .endTime(endStr)
                .boundingBox(21, 32, 24, 36) // Strict Egypt Bounds
                .minMag(0)
                .build();

        } else if (region === 'africa') {
            // AFRICA ONLY
            // Bounds: -35-38N, -20-52E. MinMag: 2.5
            console.log("Fetching: Africa Mode");
            url = builder
                .startTime(startStr)
                .endTime(endStr)
                .boundingBox(-35, 38, -20, 52) // Strict Africa Bounds
                .minMag(2.5)
                .build();

        } else {
            // WORLD / GLOBAL
            // Significant only for performance (>4.5)
            console.log("Fetching: Global Mode");
            url = builder
                .startTime(startStr)
                .endTime(endStr)
                .minMag(4.5)
                .build();
        }
    } else {
        url = window.USGS_ENDPOINTS[1]; // Fallback
    }

    // Helper: Wrapper to try fetch with timeout
    const fetchWithTimeout = (url, ms = 15000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        return fetch(url, { signal: controller.signal })
            .then(res => { clearTimeout(id); return res; })
            .catch(err => { clearTimeout(id); throw err; });
    };

    try {
        if (STATE.settings.dataSource === 'mock') throw new Error("Manual Simulation Mode");

        // 1. Try Network (Primary - Africa Focused)
        console.log("Fetching primary data source (Africa)...");
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error("Primary API Failed");
        const data = await res.json();

        // 1.1 Fetch Global Significant (Parallel)
        // We want to make sure we don't miss major world events > 6.0
        try {
            const globalUrl = window.USGS_CLIENT.getGlobalSignificant();
            const resGlobal = await fetchWithTimeout(globalUrl, 5000);
            if (resGlobal.ok) {
                const globalData = await resGlobal.json();
                // Merge features, removing duplicates if any
                const existingIds = new Set(data.features.map(f => f.id));
                globalData.features.forEach(f => {
                    if (!existingIds.has(f.id)) {
                        data.features.push(f);
                    }
                });
            }
        } catch (e) { console.warn("Global significant fetch failed, continuing with Africa data only"); }

        // Cache success
        await STATE.cacheManager.set('latest_quakes', data);
        processData(data);
        updateStatus('live');

    } catch (err) {
        console.warn("Network Fetch Error:", err);

        // 2. Try Cache (IDB)
        const cachedData = await STATE.cacheManager.get('latest_quakes');
        if (cachedData) {
            console.log("Serving from internal cache...");
            processData(cachedData);
            updateStatus('cached');
            Utils.showToast("لا يوجد اتصال - يتم عرض بيانات محفوظة");
        }
        // 3. Fallback: Simulation Data (Hardcoded high-quality mock)
        else {
            console.warn("Cache empty. Switching to Simulation Mode.");
            processData(window.MOCK_DATASET || createEmergencyMockData());
            updateStatus('mock');
            Utils.showToast("فشل الاتصال - تم تفعيل وضع المحاكاة");
        }
    }
}

function updateStatus(status) {
    STATE.lastUpdate = new Date();
    const el = document.getElementById('lastUpdate');

    if (status === 'live') {
        el.innerText = Utils.formatDate(STATE.lastUpdate);
        el.style.color = '#fff';
    } else if (status === 'cached') {
        el.innerText = `Cached (${Utils.formatDate(STATE.lastUpdate)})`;
        el.style.color = 'orange';
    } else {
        el.innerText = "Simulation Mode";
        el.style.color = 'var(--magma)';
    }
}

function createEmergencyMockData() {
    return {
        type: "FeatureCollection",
        features: [
            { type: "Feature", properties: { mag: 5.2, place: "10km NE of Cairo, Egypt", time: Date.now() - 3600000, url: "#" }, geometry: { type: "Point", coordinates: [31.2357, 30.0444, 10] } },
            { type: "Feature", properties: { mag: 6.5, place: "Rift Valley, Ethiopia", time: Date.now() - 7200000, url: "#" }, geometry: { type: "Point", coordinates: [40.4897, 9.1450, 15] } },
            { type: "Feature", properties: { mag: 4.1, place: "Atlas Mountains, Morocco", time: Date.now() - 10800000, url: "#" }, geometry: { type: "Point", coordinates: [-7.0926, 31.7917, 8] } },
            { type: "Feature", properties: { mag: 2.9, place: "Cape Town Region, South Africa", time: Date.now() - 86400000, url: "#" }, geometry: { type: "Point", coordinates: [18.4241, -33.9249, 5] } },
            { type: "Feature", properties: { mag: 5.8, place: "Red Sea Rift", time: Date.now() - 4000000, url: "#" }, geometry: { type: "Point", coordinates: [38.000, 22.000, 12] } }
        ]
    };
}

function processData(featureCollection) {
    // Filter for Africa roughly (Turf.js would be better but simple bbox is faster for now)
    // Africa rough bbox: Lat 37 to -35, Lon -17 to 51

    const rawQuakes = featureCollection.features;
    STATE.quakes = rawQuakes.filter(q => {
        const [lon, lat] = q.geometry.coordinates;
        return lat >= -35 && lat <= 38 && lon >= -20 && lon <= 55;
    }).map((q, index) => ({
        id: q.id || `gen_${index}_${Date.now()}`,
        place: q.properties.place,
        mag: q.properties.mag,
        time: q.properties.time,
        lat: q.geometry.coordinates[1],
        lon: q.geometry.coordinates[0],
        depth: q.geometry.coordinates[2],
        url: q.properties.url
    }));

    applyFilters();
    checkForImportantEarthquakes();
}

function applyFilters() {
    const minMag = parseFloat(document.getElementById('searchMag')?.value) || 0;
    const locTerm = document.getElementById('searchLoc')?.value.toLowerCase() || '';

    STATE.filteredQuakes = STATE.quakes.filter(q => {
        // Today Filter
        if (STATE.filterToday) {
            const isToday = (Date.now() - q.time) < 86400000;
            if (!isToday) return false;
        }

        if (q.mag < minMag) return false;
        if (locTerm && !q.place.toLowerCase().includes(locTerm)) return false;

        return true;
    });

    renderList();
    renderMap();
    updateAnalyticsDashboard(); // Major update hook
}

function renderList() {
    const list = document.getElementById('quakeList');
    if (!list) return;
    list.innerHTML = '';

    STATE.filteredQuakes.slice(0, 50).forEach(q => {
        const el = document.createElement('div');
        el.className = 'earthquake-item';
        el.innerHTML = `
      <div class="mag-badge ${Utils.getMagClass(q.mag)}">${q.mag.toFixed(1)}</div>
      <div class="info">
        <div style="font-weight:bold">${q.place}</div>
        <div class="meta"><i class="far fa-clock"></i> ${Utils.formatDate(q.time)}</div>
      </div>
    `;
        el.onclick = () => flyToQuake(q);
        list.appendChild(el);
    });
}

function renderMap() {
    if (!STATE.map || !STATE.layerGroup) return;
    STATE.layerGroup.clearLayers();

    // Heatmap data
    const heatData = [];

    STATE.filteredQuakes.forEach(q => {
        const div = document.createElement('div');
        div.innerHTML = `<b>${q.place}</b><br/>Strength: ${q.mag}<br/>`;
        const btn = document.createElement('button');
        btn.innerText = 'Details';
        btn.style.marginTop = '5px';
        btn.style.background = '#ff3300';
        btn.style.color = 'white';
        btn.onclick = () => openDetailModal(q);
        div.appendChild(btn);

        const marker = L.marker([q.lat, q.lon], { icon: Icons.quake(q.mag) }).bindPopup(div);
        STATE.layerGroup.addLayer(marker);
        heatData.push([q.lat, q.lon, q.mag]);
    });

    // Update Heatmap if plugin exists and toggled
    if (L.heatLayer) {
        if (STATE.heatLayer) STATE.map.removeLayer(STATE.heatLayer);
        STATE.heatLayer = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 }).addTo(STATE.map);
    }
}

function flyToQuake(q) {
    STATE.map.flyTo([q.lat, q.lon], 8, { duration: 1.5 });
    openDetailModal(q);
}

function openDetailModal(data) {
    let q = data;
    // Handle ID string (from HTML onclick)
    if (typeof data === 'string') {
        q = STATE.quakes.find(x => x.id === data);
    }

    if (!q) {
        console.error("No quake data provided to detail modal", data);
        return;
    }
    const modal = document.getElementById('detailModal');
    if (!modal) {
        console.error("Detail modal element not found");
        return;
    }

    // Populate Data safely
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDescription');
    const lang = STATE.currentLang || 'ar';

    if (titleEl) titleEl.innerText = q.place || (lang === 'ar' ? "موقع غير معروف" : "Unknown Location");

    if (descEl) {
        if (lang === 'ar') {
            descEl.innerText = `تم رصد هذا النشاط الزلزالي في ${Utils.formatDate(q.time)}. بلغت قوة الزلزال ${q.mag} درجة على مقياس ريختر، ووقع على عمق ${q.depth} كم. المصدر: USGS.`;
        } else {
            descEl.innerText = `Detected on ${Utils.formatDate(q.time)}. This seismic event had a magnitude of ${q.mag} and occurred at a depth of ${q.depth}km. Source: USGS.`;
        }
    }

    // Update labels in modal if they exist
    const labels = {
        'mag': lang === 'ar' ? 'القوة' : 'Magnitude',
        'depth': lang === 'ar' ? 'العمق' : 'Depth',
        'coords': lang === 'ar' ? 'الإحداثيات' : 'Coordinates'
    };

    // Update labels via query selector
    const statBoxes = modal.querySelectorAll('.stat-box label');
    if (statBoxes.length >= 3) {
        statBoxes[0].innerText = labels.mag;
        statBoxes[1].innerText = labels.depth;
        statBoxes[2].innerText = labels.coords;
    }

    if (document.getElementById('detailMag')) document.getElementById('detailMag').innerText = q.mag;
    if (document.getElementById('detailDepth')) document.getElementById('detailDepth').innerText = `${q.depth}km`;
    if (document.getElementById('detailCoords')) document.getElementById('detailCoords').innerText = `${q.lat.toFixed(2)}, ${q.lon.toFixed(2)}`;

    // FORCE SHOW with inline styles - Ensuring Visibility and Opacity
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0.9) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 999999 !important;
        opacity: 1 !important;
        visibility: visible !important;
    `;
    modal.classList.add('active'); // Helper class for animations if needed

    // Add click-outside-to-close functionality
    modal.onclick = function (e) {
        if (e.target === modal) {
            window.closeDetailModal();
        }
    };

    // Prevent clicks inside modal content from closing
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.onclick = function (e) {
            e.stopPropagation();
        };
    }

    console.log("✅ Modal opened for:", q.place);
}

window.closeDetailModal = () => {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('show');
        // Clear inline styles added during opening
        modal.style.display = 'none';
        modal.style.cssText = '';
    }
};

function updateStats() {
    const total = STATE.filteredQuakes.length;
    document.getElementById('totalQuakes').innerText = total;

    const maxMag = STATE.filteredQuakes.reduce((max, q) => q.mag > max ? q.mag : max, 0);
    document.getElementById('maxMag').innerText = maxMag.toFixed(1);

    // Chart update
    if (STATE.chart) {
        const bins = [0, 0, 0, 0];
        STATE.filteredQuakes.forEach(q => {
            if (q.mag < 4) bins[0]++;
            else if (q.mag < 5) bins[1]++;
            else if (q.mag < 6) bins[2]++;
            else bins[3]++;
        });
        STATE.chart.data.datasets[0].data = bins;
        STATE.chart.update();
    }
}

function renderCountries(search = '') {
    const container = document.getElementById('countryList');
    if (!container) return;
    container.innerHTML = '';

    const countries = window.AFRICAN_COUNTRIES || [];
    const lang = STATE.currentLang || 'ar';

    // Index 0 for Arabic, 3 for English
    const nameIdx = lang === 'ar' ? 0 : 3;

    const filtered = countries.filter(c => {
        const name = c[nameIdx] || c[0];
        return name.toLowerCase().includes(search.toLowerCase());
    });

    filtered.forEach(c => {
        const el = document.createElement('div');
        el.className = 'country-row';
        const name = c[nameIdx] || c[0];

        if (STATE.selectedCountry === c[1]) el.classList.add('selected');
        el.innerHTML = `<span>${name}</span> <span class="small">${c[1]}</span>`;
        el.onclick = () => {
            STATE.selectedCountry = c[1];
            STATE.map.flyTo([c[2][0], c[2][1]], 5);
            renderCountries(search); // Re-render to show selection
            applyFilters();
        };
        container.appendChild(el);
    });
}

function checkForImportantEarthquakes() {
    const threshold = parseFloat(STATE.settings.alertThreshold);
    const important = STATE.quakes.filter(q => q.mag >= threshold && (Date.now() - q.time) < 86400000); // Last 24h

    if (important.length > 0) {
        document.getElementById('notifCount').innerText = important.length;
        document.getElementById('notifCount').style.display = 'flex';
        // Only alert if new... implementation requires tracking last alert time
    } else {
        document.getElementById('notifCount').style.display = 'none';
    }
}

function updateNotificationDisplay() {
    // Populate the notification panel based on important quakes
    // This is a simplified version
    const list = document.getElementById('notificationList');
    if (!list) return;
    list.innerHTML = '';

    const threshold = parseFloat(STATE.settings.alertThreshold);
    const important = STATE.quakes.filter(q => q.mag >= threshold);

    important.slice(0, 10).forEach(q => {
        const el = document.createElement('div');
        el.className = 'notification-item';
        if (q.mag > 6) el.classList.add('unread');
        el.innerHTML = `
      <div style="font-weight:bold; color:var(--accent)">زلزال قوي: ${q.mag}</div>
      <div>${q.place}</div>
      <div class="time">${Utils.formatDate(q.time)}</div>
    `;
        list.appendChild(el);
    });
}

function updateUserInterface() {
    // Logic to show/hide elements based on STATE.userProfile.type
    const type = STATE.userProfile.type;
    document.querySelectorAll('.role-specific').forEach(el => el.style.display = 'none');
    document.querySelectorAll(`.role-${type}`).forEach(el => el.style.display = 'block');

    // Update educational content
    const eduContent = document.getElementById('educationalContent');
    if (eduContent && window.EDUCATIONAL_CONTENT) {
        const lang = STATE.currentLang || 'ar';
        eduContent.innerHTML = window.EDUCATIONAL_CONTENT[lang][type] || '';
    }
}

// Screenshot Utility
window.getMapScreenshot = async () => {
    // Determine active view (Map or Globe)
    const mapEl = document.getElementById('mapWrap');
    const globeEl = document.getElementById('globeWrap');

    let target = null;
    if (mapEl.style.display !== 'none') target = document.getElementById('map');
    else target = document.getElementById('globeViz'); // Assuming globe container ID

    if (!target) return null;

    try {
        // Use html2canvas for map DOM
        const canvas = await html2canvas(target, {
            useCORS: true,
            allowTaint: true,
            ignoreElements: (el) => el.classList.contains('leaflet-control-container') // Optional: hide controls
        });
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Screenshot capture failed:", e);
        return null; // Return null handled by report.js
    }
};

// Global Exports
window.STATE = STATE;
window.Utils = Utils;
window.Utils = Utils;
window.openDetailModal = openDetailModal;
window.initApp = init;

// Auto-start
document.addEventListener('DOMContentLoaded', init);
