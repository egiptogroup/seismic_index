
// YouTube Audio Manager
let player;
let isReady = false;
let isPlaying = false;
let wantToPlay = false; // State intention

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    player = new YT.Player('ytPlayer', {
        height: '1',
        width: '1',
        videoId: 'J_BXBXY2k2A', // Hell March Red Alert 2
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'loop': 1,
            'playlist': 'J_BXBXY2k2A' // Required for loop to work
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    isReady = true;
    player.setVolume(40); // 40% volume
    if (wantToPlay) {
        player.playVideo();
    }
}

function onPlayerStateChange(event) {
    // If ended, loop handled by playlist var, but just in case
    if (event.data === YT.PlayerState.ENDED) {
        player.playVideo();
    }
}

// System Init (Called by Overlay Button)
function initSystem() {
    // 1. Fade out overlay
    const overlay = document.getElementById('startOverlay');
    const app = document.querySelector('.app');

    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 1000);
    }

    // 2. Fade in App
    if (app) {
        app.style.opacity = '1';
    }

    // 3. Start Music Intent
    wantToPlay = true;
    if (isReady && player) {
        player.playVideo();
        updateBtnState(true);
    }

    // 4. Refresh Map (Crucial fix for rendering after hidden)
    if (window.STATE && window.STATE.map) {
        setTimeout(() => {
            window.STATE.map.invalidateSize();
        }, 100);
        setTimeout(() => {
            window.STATE.map.invalidateSize();
        }, 1200); // Double check after transition
    }
}

function toggleMusic(forcePlay = false) {
    if (!player || !isReady) return;

    if (forcePlay) {
        player.playVideo();
        wantToPlay = true;
        updateBtnState(true);
    } else {
        if (isPlaying) {
            player.pauseVideo();
            updateBtnState(false);
        } else {
            player.playVideo();
            updateBtnState(true);
        }
    }
}

function updateBtnState(playing) {
    isPlaying = playing;
    const btn = document.getElementById('musicBtn');
    if (btn) {
        if (playing) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fa-solid fa-music"></i>';
        }
    }
}

// Expose globally
window.initSystem = initSystem;
window.toggleMusic = toggleMusic;
