/**
 * MIKI AI Chatbot - Seismic Observatory Edition
 * Handles intelligent responses, country stats, and bilingual support.
 */

document.addEventListener('DOMContentLoaded', () => {
    initChatbot();
});

function initChatbot() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const micBtn = document.getElementById('micBtn');
    const messagesContainer = document.getElementById('chatMessages');
    const suggestionsContainer = document.getElementById('suggestedQuestions');
    const toggleBtn = document.querySelector('.chat-toggle-btn');
    const chatWindow = document.getElementById('chatAssistant');

    // State
    let isListening = false;

    // Open/Close
    // Handled by inline onclicks in HTML, but we can add listeners here if needed

    // Send Message
    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        // User Message
        appendMessage(text, 'user');
        chatInput.value = '';
        if (window.Utils && window.Utils.playAlertSound) window.Utils.playAlertSound(); // Sci-fi chirp

        // Processing Indicator
        const loadingId = appendLoading();

        // AI Logic
        await new Promise(r => setTimeout(r, 800)); // Simulate thinking
        const response = generateResponse(text);

        removeLoading(loadingId);
        appendMessage(response, 'assistant');

        // Speak response if sound enabled
        if (STATE.settings.soundAlerts) {
            speak(response);
        }
    };

    if (sendBtn) sendBtn.onclick = sendMessage;
    if (chatInput) chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    // Suggestions
    renderSuggestions();

    // Mic (Simple simulation or WebSpeech API)
    if (micBtn) micBtn.onclick = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported in this browser.");
            return;
        }
        const recognition = new webkitSpeechRecognition();
        recognition.lang = STATE.currentLang === 'ar' ? 'ar-SA' : 'en-US';
        recognition.onstart = () => { micBtn.classList.add('active'); isListening = true; };
        recognition.onend = () => { micBtn.classList.remove('active'); isListening = false; };
        recognition.onresult = (e) => {
            chatInput.value = e.results[0][0].transcript;
            sendMessage();
        };
        recognition.start();
    };

    function appendMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerText = text; // Text content prevents HTML injection
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function appendLoading() {
        const div = document.createElement('div');
        div.className = 'message assistant loading-msg';
        div.innerHTML = '<span class="loading"></span>';
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return div;
    }

    function removeLoading(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function renderSuggestions() {
        if (!suggestionsContainer) return;
        const lang = STATE.currentLang || 'ar';
        const topics = lang === 'ar'
            ? ['أحدث الزلازل', 'زلازل مصر', 'مخاطر', 'حماية']
            : ['Latest Quakes', 'Egypt Quakes', 'Risks', 'Safety'];

        suggestionsContainer.innerHTML = '';
        topics.forEach(t => {
            const btn = document.createElement('div');
            btn.className = 'suggestion';
            btn.innerText = t;
            btn.onclick = () => {
                chatInput.value = t;
                sendMessage();
            };
            suggestionsContainer.appendChild(btn);
        });
    }

    // Expose renderSuggestions to update when language changes
    window.updateChatSuggestions = renderSuggestions;
}

function generateResponse(input) {
    const lang = STATE.currentLang || 'ar';
    const knowledge = window.AI_KNOWLEDGE[lang];
    const text = input.toLowerCase();

    // 1. Check for Country Stats (Smart Real-time Check)
    const countries = window.AFRICAN_COUNTRIES || [];
    let detectedCountry = null;
    let detectedCode = null;

    // Search for country name in input
    for (const c of countries) {
        // Check Arabic Name [0] or English Name [3] (if exists) or Code [1]
        // c = [ArName, ISO, Coords, EnName]
        if (text.includes(c[0].toLowerCase()) || (c[3] && text.includes(c[3].toLowerCase()))) {
            detectedCountry = lang === 'ar' ? c[0] : (c[3] || c[0]); // User preferred name
            detectedCode = c[1]; // ISO Code
            break;
        }
    }

    if (detectedCountry) {
        // Filter quakes for this country
        // Logic: Checks if quake place string contains country name, or falls within rough distance of country center?
        // Let's use string matching on 'place' since USGS provides "10km NE of Cairo, Egypt"

        // Search terms: Country Name (EN) usually in USGS data
        const searchTerms = [detectedCountry.toLowerCase()];
        const countryData = countries.find(x => x[1] === detectedCode);
        if (countryData && countryData[3]) searchTerms.push(countryData[3].toLowerCase());

        const countryQuakes = STATE.quakes.filter(q => {
            const p = q.place.toLowerCase();
            return searchTerms.some(term => p.includes(term));
        });

        const count = countryQuakes.length;

        if (count > 0) {
            // Found quakes!
            // Get most recent or strongest
            const top = countryQuakes.sort((a, b) => b.mag - a.mag)[0]; // Strongest
            const latest = countryQuakes.sort((a, b) => b.time - a.time)[0]; // Latest

            // Construct Response
            if (lang === 'ar') {
                return `نعم، رصدنا نشاطاً زلزالياً في ${detectedCountry}. أقوى هزة كانت بقوة ${top.mag} درجة، وأحدثها حدثت بتاريخ ${Utils.formatDate(latest.time)}. التفاصيل: ${latest.place}`;
            } else if (lang === 'fr') {
                return `Oui, activité sismique détectée en ${detectedCountry}. Le plus fort était de mag ${top.mag}. Le dernier: ${Utils.formatDate(latest.time)} à ${latest.place}.`;
            } else {
                return `Yes, seismic activity detected in ${detectedCountry}. Strongest was mag ${top.mag}. Latest: ${Utils.formatDate(latest.time)} at ${latest.place}.`;
            }
        } else {
            // No quakes found
            if (lang === 'ar') {
                return `لم يتم رصد أي زلازل قوية في ${detectedCountry} خلال الفترة الماضية (30 يوم). الوضع مستقر حالياً.`;
            } else if (lang === 'fr') {
                return `Aucun séisme important détecté en ${detectedCountry} récemment (30 jours). Situation stable.`;
            } else {
                return `No significant earthquakes detected in ${detectedCountry} recently (30 days). Situation is stable.`;
            }
        }
    }

    // 2. Keyword Matching
    if (text.includes('latest') || text.includes('أحدث') || text.includes('جديد')) {
        const latest = STATE.quakes.slice(0, 3).map(q => `${q.mag.toFixed(1)} M - ${q.place}`).join('\n');
        return lang === 'ar' ? `أحدث 3 زلازل:\n${latest}` : `Top 3 Latest:\n${latest}`;
    }

    if (text.includes('risk') || text.includes('خطر') || text.includes('zone') || text.includes('منطقة')) return knowledge['seismic_zones'];
    if (text.includes('safe') || text.includes('safety') || text.includes('tip') || text.includes('سلامة') || text.includes('نصائ')) return knowledge['safety_tips'];
    if (text.includes('p-wave') || text.includes('s-wave') || text.includes('موجات')) return knowledge['p_wave'] + '\n' + knowledge['s_wave'];
    if (text.includes('cause') || text.includes('why') || text.includes('سبب')) return knowledge['earthquake_causes'];

    // Default fallbacks
    return knowledge['unknown'];
}

function speak(text) {
    // Simple TTS
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = STATE.currentLang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.name = 'EarthGuard';
    window.speechSynthesis.speak(utterance);
}
