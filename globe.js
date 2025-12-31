/**
 * Enhanced 3D Globe with Advanced Features
 * - Tectonic Plates Animation
 * - Fault Lines Visualization
 * - Particle Effects for Earthquakes
 * - Real-time Day/Night Cycle
 * - Atmospheric Effects (Clouds, Aurora)
 * - Shake Animation on Earthquake Events
 */

let globeScene, globeCamera, globeRenderer, globeControls;
let earth, clouds, atmosphere, stars;
let tectonicPlates = [];
let faultLines = [];
let particles = [];
let earthquakeMarkers = [];
let isShaking = false;

// Initialize Enhanced Globe
function initEnhancedGlobe() {
    const container = document.getElementById('globeContainer');
    if (!container) {
        console.warn('Globe container not found');
        return;
    }

    // Scene Setup
    globeScene = new THREE.Scene();
    globeScene.fog = new THREE.Fog(0x000000, 50, 100);

    // Camera Setup
    globeCamera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    globeCamera.position.z = 15;

    // Renderer Setup with optimizations
    globeRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    globeRenderer.setSize(container.clientWidth, container.clientHeight);
    globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    globeRenderer.setClearColor(0x000000, 0);
    container.appendChild(globeRenderer.domElement);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        globeControls = new THREE.OrbitControls(globeCamera, globeRenderer.domElement);
        globeControls.enableDamping = true;
        globeControls.dampingFactor = 0.05;
        globeControls.minDistance = 8;
        globeControls.maxDistance = 30;
        globeControls.autoRotate = true;
        globeControls.autoRotateSpeed = 0.5;
    }

    // Lighting System
    setupLighting();

    // Create Earth
    createEarth();

    // Create Atmospheric Effects
    createAtmosphere();
    createClouds();

    // Create Starfield
    createStarfield();

    // Add Tectonic Plates
    createTectonicPlates();

    // Add Fault Lines
    createFaultLines();

    // Start Animation Loop
    animateGlobe();

    // Handle Resize
    window.addEventListener('resize', onGlobeResize);

    console.log('✅ Enhanced Globe Initialized');
}

// Advanced Lighting System with Day/Night Cycle
function setupLighting() {
    // Ambient Light (increased for better visibility)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    globeScene.add(ambientLight);

    // Sunlight (Directional)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    sunLight.castShadow = true;
    globeScene.add(sunLight);

    // Store for day/night cycle
    globeScene.userData.sunLight = sunLight;

    // Add stronger rim light for atmospheric glow effect
    const rimLight = new THREE.PointLight(0x4488ff, 1.0);
    rimLight.position.set(-10, 0, -10);
    globeScene.add(rimLight);
}

// Create Earth with High-Quality Textures
function createEarth() {
    const earthGeometry = new THREE.SphereGeometry(5, 64, 64);

    // Load Textures
    const textureLoader = new THREE.TextureLoader();

    // Day/Night Material with bump map
    const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0x112233,
        map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
        bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
        bumpScale: 0.05,
        specularMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png'),
        specular: new THREE.Color(0x333333),
        shininess: 10
    });

    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.rotation.y = -Math.PI / 2; // Align to real Earth orientation
    globeScene.add(earth);
}

// Create Realistic Clouds Layer
function createClouds() {
    const cloudGeometry = new THREE.SphereGeometry(5.05, 64, 64);
    const textureLoader = new THREE.TextureLoader();

    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png'),
        transparent: true,
        opacity: 0.4,
        depthWrite: false
    });

    clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    globeScene.add(clouds);
}

// Create Atmospheric Glow
function createAtmosphere() {
    const atmosphereGeometry = new THREE.SphereGeometry(5.3, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeScene.add(atmosphere);
}

// Create Starfield Background
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        transparent: true,
        opacity: 0.8
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    stars = new THREE.Points(starsGeometry, starsMaterial);
    globeScene.add(stars);
}

// Create Animated Tectonic Plates
function createTectonicPlates() {
    // Simplified tectonic plate boundaries data
    // In production, load from GeoJSON
    const plateData = [
        // Pacific Plate (Ring of Fire)
        { lat: 35, lon: -120, size: 50, color: 0xff3300 },
        { lat: -30, lon: -80, size: 40, color: 0xff6600 },
        // Indo-Australian Plate
        { lat: -20, lon: 130, size: 45, color: 0xff9900 },
        // African Plate
        { lat: 0, lon: 20, size: 50, color: 0xffaa00 },
        // Eurasian Plate
        { lat: 50, lon: 100, size: 60, color: 0xffcc00 },
        // Antarctic Plate
        { lat: -70, lon: 0, size: 55, color: 0x00aaff }
    ];

    plateData.forEach(plate => {
        const plateGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
        const plateMaterial = new THREE.MeshBasicMaterial({
            color: plate.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const plateMesh = new THREE.Mesh(plateGeometry, plateMaterial);
        const pos = latLonToVector3(plate.lat, plate.lon, 5.1);
        plateMesh.position.copy(pos);
        plateMesh.lookAt(new THREE.Vector3(0, 0, 0));
        plateMesh.userData = { speed: Math.random() * 0.001 };

        globeScene.add(plateMesh);
        tectonicPlates.push(plateMesh);
    });
}

// Create Fault Lines Visualization
function createFaultLines() {
    // Major fault lines data (simplified)
    const faultData = [
        // San Andreas Fault
        [{ lat: 32, lon: -115 }, { lat: 40, lon: -124 }],
        // East African Rift
        [{ lat: -15, lon: 35 }, { lat: 15, lon: 40 }],
        // Himalayan Fault
        [{ lat: 28, lon: 80 }, { lat: 30, lon: 95 }]
    ];

    faultData.forEach(fault => {
        const points = fault.map(f => latLonToVector3(f.lat, f.lon, 5.08));
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);
        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            emissive: 0xff3300,
            emissiveIntensity: 1.5,
            shininess: 100
        });

        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        globeScene.add(tube);
        faultLines.push(tube);
    });
}

// Add Earthquake Marker with Particle Effect
function addEarthquakeMarker(lat, lon, magnitude) {
    const color = magnitude < 4 ? 0x00ff00 : magnitude < 6 ? 0xffaa00 : 0xff0000;
    const size = magnitude * 0.05;

    // Main Marker
    const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
    });

    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const pos = latLonToVector3(lat, lon, 5.1);
    marker.position.copy(pos);
    globeScene.add(marker);
    earthquakeMarkers.push(marker);

    // Pulsing Ring Effect
    const ringGeometry = new THREE.RingGeometry(size, size + 0.2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.userData = { startTime: Date.now(), duration: 2000 };
    globeScene.add(ring);
    particles.push(ring);

    // Trigger shake if magnitude is high
    if (magnitude >= 6) {
        triggerGlobeShake();
    }
}

// Trigger Shake Animation
function triggerGlobeShake() {
    if (isShaking) return;
    isShaking = true;

    const originalPosition = globeCamera.position.clone();
    const shakeIntensity = 0.1;
    const shakeDuration = 1000;
    const startTime = Date.now();

    function shake() {
        const elapsed = Date.now() - startTime;
        if (elapsed > shakeDuration) {
            globeCamera.position.copy(originalPosition);
            isShaking = false;
            return;
        }

        const intensity = shakeIntensity * (1 - elapsed / shakeDuration);
        globeCamera.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
        globeCamera.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;

        requestAnimationFrame(shake);
    }

    shake();
}

// Coordinate Conversion
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// Update Day/Night Cycle
function updateDayNightCycle() {
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const timePercent = (hours + minutes / 60) / 24;

    // Rotate sun position
    const angle = timePercent * Math.PI * 2;
    const sunLight = globeScene.userData.sunLight;
    if (sunLight) {
        sunLight.position.x = Math.cos(angle) * 10;
        sunLight.position.z = Math.sin(angle) * 10;
    }
}

// Animation Loop
function animateGlobe() {
    requestAnimationFrame(animateGlobe);

    if (!earth) return;

    // Rotate Earth
    earth.rotation.y += 0.001;

    // Rotate Clouds slightly faster
    if (clouds) {
        clouds.rotation.y += 0.0012;
    }

    // Animate Tectonic Plates
    tectonicPlates.forEach(plate => {
        plate.rotation.z += plate.userData.speed;
        plate.material.opacity = 0.3 + Math.sin(Date.now() * 0.001) * 0.1;
    });

    // Animate Fault Lines (pulsing effect)
    faultLines.forEach(fault => {
        fault.material.opacity = 0.4 + Math.sin(Date.now() * 0.002) * 0.2;
    });

    // Animate Particle Rings
    particles.forEach((particle, index) => {
        if (particle.userData.startTime) {
            const elapsed = Date.now() - particle.userData.startTime;
            const progress = elapsed / particle.userData.duration;

            if (progress >= 1) {
                globeScene.remove(particle);
                particles.splice(index, 1);
            } else {
                particle.scale.set(1 + progress * 2, 1 + progress * 2, 1);
                particle.material.opacity = 0.5 * (1 - progress);
            }
        }
    });

    // Update Day/Night Cycle (every 1000 frames for performance)
    if (Math.random() < 0.001) {
        updateDayNightCycle();
    }

    // Rotate Stars slowly
    if (stars) {
        stars.rotation.y += 0.0001;
    }

    // Update Controls
    if (globeControls) {
        globeControls.update();
    }

    // Render
    globeRenderer.render(globeScene, globeCamera);
}

// Handle Resize
function onGlobeResize() {
    const container = document.getElementById('globeContainer');
    if (!container || !globeCamera || !globeRenderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    globeCamera.aspect = width / height;
    globeCamera.updateProjectionMatrix();
    globeRenderer.setSize(width, height);
}

// Public API
window.initEnhancedGlobe = initEnhancedGlobe;
window.addEarthquakeToGlobe = addEarthquakeMarker;
window.triggerGlobeShake = triggerGlobeShake;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedGlobe);
} else {
    // DOM already loaded, but wait for user to switch to 3D view
    console.log('Enhanced Globe ready to initialize');
}
