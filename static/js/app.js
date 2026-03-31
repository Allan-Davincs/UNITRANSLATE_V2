const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const translateBtn = document.getElementById('translateBtn');
const speakBtn = document.getElementById('speakBtn');
const stopSpeakBtn = document.getElementById('stopSpeakBtn');
const inputText = document.getElementById('inputText');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const resultDiv = document.getElementById('result');
const themeSelect = document.getElementById('themeSelect');
const emailInput = document.getElementById('emailInput');
const saveSettings = document.getElementById('saveSettings');
const supportBtn = document.getElementById('supportBtn');
const installBtn = document.getElementById('installBtn');
const toneSelect = document.getElementById('toneSelect');
const swapLangBtn = document.getElementById('swapLangBtn');
const copyBtn = document.getElementById('copyBtn');
const shareBtn = document.getElementById('shareBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const retryBtn = document.getElementById('retryBtn');
const statusText = document.getElementById('statusText');
const charCounter = document.getElementById('charCounter');
const sourceBadge = document.getElementById('sourceBadge');
const targetBadge = document.getElementById('targetBadge');
const historyList = document.getElementById('historyList');
const favoritesList = document.getElementById('favoritesList');
const phrasebookPack = document.getElementById('phrasebookPack');
const phraseChips = document.getElementById('phraseChips');
const startMicBtn = document.getElementById('startMicBtn');
const stopMicBtn = document.getElementById('stopMicBtn');
const conversationBtn = document.getElementById('conversationBtn');
const ocrBtn = document.getElementById('ocrBtn');
const ocrInput = document.getElementById('ocrInput');
const networkBanner = document.getElementById('networkBanner');
const toastContainer = document.getElementById('toastContainer');
const autoTranslateToggle = document.getElementById('autoTranslateToggle');
const modeBadge = document.getElementById('modeBadge');

const STORAGE_KEYS = {
    theme: 'theme',
    email: 'email',
    autoTranslate: 'autoTranslate',
    history: 'translationHistory',
    favorites: 'translationFavorites'
};

const langMap = {
    EN: 'English',
    FR: 'French',
    DE: 'German',
    ES: 'Spanish',
    IT: 'Italian',
    PT: 'Portuguese',
    RU: 'Russian',
    ZH: 'Chinese',
    JA: 'Japanese'
};

const speechLangMap = {
    EN: 'en-US',
    FR: 'fr-FR',
    DE: 'de-DE',
    ES: 'es-ES',
    IT: 'it-IT',
    PT: 'pt-PT',
    RU: 'ru-RU',
    ZH: 'zh-CN',
    JA: 'ja-JP'
};

const ocrLangMap = {
    EN: 'eng',
    FR: 'fra',
    DE: 'deu',
    ES: 'spa',
    IT: 'ita',
    PT: 'por',
    RU: 'rus',
    ZH: 'chi_sim',
    JA: 'jpn'
};

const phrasebookPacks = {
    travel: [
        'Where is the nearest train station?',
        'How much does this cost?',
        'I need help, please.',
        'Can you recommend a local restaurant?'
    ],
    business: [
        'Could we schedule a meeting for tomorrow?',
        'Please review the attached proposal.',
        'Thank you for your prompt response.',
        'Let us align on the project timeline.'
    ],
    medical: [
        'I have an allergy to penicillin.',
        'I feel dizzy and nauseous.',
        'Where is the emergency department?',
        'Please call a doctor immediately.'
    ]
};

let currentTranslation = '';
let lastPayload = null;
let translationAbortController = null;
let requestCounter = 0;
let debounceTimer = null;
let autoTranslateEnabled = true;
let historyItems = [];
let favoriteItems = [];
let recognition = null;
let recognitionMode = 'idle';
let conversationMode = false;
let deferredPrompt = null;

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 20);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 200);
    }, 2600);
}

function setStatus(message, tone = 'neutral') {
    statusText.textContent = message;
    statusText.dataset.state = tone;
}

function setResultText(text, kind = 'normal') {
    resultDiv.textContent = text;
    resultDiv.dataset.state = kind;
}

function updateActionButtons() {
    const hasResult = Boolean(currentTranslation);
    speakBtn.disabled = !hasResult;
    copyBtn.disabled = !hasResult;
    shareBtn.disabled = !hasResult;
    favoriteBtn.disabled = !hasResult;
}

function updateCharCounter() {
    const count = inputText.value.length;
    charCounter.textContent = `${count} characters`;
}

function updateLanguageBadges() {
    const sourceLabel = sourceLang.value ? (langMap[sourceLang.value] || sourceLang.value) : 'Auto';
    const targetLabel = langMap[targetLang.value] || targetLang.value;
    sourceBadge.textContent = sourceLabel;
    targetBadge.textContent = targetLabel;
}

function updateModeBadge() {
    modeBadge.textContent = autoTranslateEnabled ? 'Auto translate on' : 'Manual translate';
}

function persistList(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
}

function loadList(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
}

function loadSettings() {
    const theme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
    const email = localStorage.getItem(STORAGE_KEYS.email) || '';
    const autoTranslate = localStorage.getItem(STORAGE_KEYS.autoTranslate);

    autoTranslateEnabled = autoTranslate === null ? true : autoTranslate === 'true';

    applyTheme(theme);
    themeSelect.value = theme;
    emailInput.value = email;
    autoTranslateToggle.checked = autoTranslateEnabled;

    historyItems = loadList(STORAGE_KEYS.history);
    favoriteItems = loadList(STORAGE_KEYS.favorites);

    renderHistory();
    renderFavorites();
    updateModeBadge();
}

function saveSettingsToStorage() {
    localStorage.setItem(STORAGE_KEYS.theme, themeSelect.value);
    localStorage.setItem(STORAGE_KEYS.email, emailInput.value.trim());
    localStorage.setItem(STORAGE_KEYS.autoTranslate, String(autoTranslateToggle.checked));
    autoTranslateEnabled = autoTranslateToggle.checked;
    applyTheme(themeSelect.value);
    updateModeBadge();
    showToast('Settings saved', 'success');
}

function createSavedItemElement(item, onUse, onRemove) {
    const li = document.createElement('li');
    li.className = 'saved-item';

    const content = document.createElement('div');
    content.className = 'saved-text';
    const input = document.createElement('p');
    input.textContent = `In: ${item.input}`;
    const output = document.createElement('p');
    output.textContent = `Out: ${item.translation}`;
    content.appendChild(input);
    content.appendChild(output);

    const controls = document.createElement('div');
    controls.className = 'saved-actions';

    const useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', onUse);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', onRemove);

    controls.appendChild(useBtn);
    controls.appendChild(removeBtn);

    li.appendChild(content);
    li.appendChild(controls);

    return li;
}

function renderHistory() {
    historyList.textContent = '';

    if (!historyItems.length) {
        const empty = document.createElement('li');
        empty.className = 'empty-item';
        empty.textContent = 'No recent translations yet.';
        historyList.appendChild(empty);
        return;
    }

    historyItems.forEach((item, index) => {
        const li = createSavedItemElement(
            item,
            () => {
                inputText.value = item.input;
                currentTranslation = item.translation;
                setResultText(item.translation);
                updateCharCounter();
                updateActionButtons();
                setStatus('Loaded from history', 'neutral');
            },
            () => {
                historyItems.splice(index, 1);
                persistList(STORAGE_KEYS.history, historyItems);
                renderHistory();
            }
        );
        historyList.appendChild(li);
    });
}

function renderFavorites() {
    favoritesList.textContent = '';

    if (!favoriteItems.length) {
        const empty = document.createElement('li');
        empty.className = 'empty-item';
        empty.textContent = 'No favorites saved yet.';
        favoritesList.appendChild(empty);
        return;
    }

    favoriteItems.forEach((item, index) => {
        const li = createSavedItemElement(
            item,
            () => {
                inputText.value = item.input;
                currentTranslation = item.translation;
                setResultText(item.translation);
                updateCharCounter();
                updateActionButtons();
                setStatus('Loaded from favorites', 'neutral');
            },
            () => {
                favoriteItems.splice(index, 1);
                persistList(STORAGE_KEYS.favorites, favoriteItems);
                renderFavorites();
            }
        );
        favoritesList.appendChild(li);
    });
}

function pushHistory(item) {
    const signature = `${item.input}|${item.translation}|${item.target_lang}`;
    historyItems = historyItems.filter((entry) => `${entry.input}|${entry.translation}|${entry.target_lang}` !== signature);
    historyItems.unshift(item);
    historyItems = historyItems.slice(0, 20);
    persistList(STORAGE_KEYS.history, historyItems);
    renderHistory();
}

function saveFavorite(item) {
    const exists = favoriteItems.some((entry) => entry.input === item.input && entry.translation === item.translation);
    if (exists) {
        showToast('Already in favorites', 'info');
        return;
    }

    favoriteItems.unshift(item);
    favoriteItems = favoriteItems.slice(0, 30);
    persistList(STORAGE_KEYS.favorites, favoriteItems);
    renderFavorites();
    showToast('Saved to favorites', 'success');
}

function getToneValue() {
    return toneSelect.value || 'neutral';
}

function buildPayload(text) {
    return {
        text,
        source_lang: sourceLang.value || undefined,
        target_lang: targetLang.value,
        tone: getToneValue()
    };
}

async function requestTranslation(payload, origin = 'manual') {
    if (!payload.text) {
        setResultText('Please enter text to translate.', 'error');
        setStatus('Waiting for input', 'warning');
        retryBtn.classList.add('hidden');
        return;
    }

    if (!payload.target_lang) {
        setResultText('Please choose a target language.', 'error');
        setStatus('Select target language', 'warning');
        retryBtn.classList.add('hidden');
        return;
    }

    if (translationAbortController) {
        translationAbortController.abort();
    }

    const controller = new AbortController();
    translationAbortController = controller;
    const requestId = ++requestCounter;
    lastPayload = payload;

    translateBtn.disabled = true;
    retryBtn.classList.add('hidden');
    setStatus(origin === 'auto' ? 'Auto translating...' : 'Translating...', 'loading');
    setResultText('Working on translation...', 'loading');

    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (requestId !== requestCounter) {
            return;
        }

        if (!response.ok || !data.translation) {
            const errorText = data.error || 'Translation failed. Try again.';
            currentTranslation = '';
            updateActionButtons();
            setResultText(errorText, 'error');
            setStatus('Translation failed', 'error');
            retryBtn.classList.remove('hidden');
            return;
        }

        currentTranslation = data.translation;
        updateActionButtons();
        setResultText(currentTranslation, 'success');
        setStatus('Translation ready', 'success');

        pushHistory({
            input: payload.text,
            translation: data.translation,
            source_lang: payload.source_lang || 'AUTO',
            target_lang: payload.target_lang,
            tone: payload.tone,
            at: Date.now()
        });

        if (conversationMode) {
            speakCurrentTranslation();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            setStatus('Canceled previous request', 'neutral');
            return;
        }

        currentTranslation = '';
        updateActionButtons();
        setResultText('Network error. You can retry once online.', 'error');
        setStatus('Network issue', 'error');
        retryBtn.classList.remove('hidden');
    } finally {
        if (translationAbortController === controller) {
            translationAbortController = null;
        }
        translateBtn.disabled = false;
    }
}

function translateNow(origin = 'manual') {
    const text = inputText.value.trim();
    const payload = buildPayload(text);
    return requestTranslation(payload, origin);
}

function scheduleAutoTranslate() {
    clearTimeout(debounceTimer);

    if (!autoTranslateEnabled) {
        return;
    }

    const text = inputText.value.trim();
    if (!text) {
        return;
    }

    debounceTimer = setTimeout(() => {
        translateNow('auto');
    }, 650);
}

function swapLanguages() {
    const from = sourceLang.value;
    const to = targetLang.value;

    if (!from) {
        sourceLang.value = to;
        targetLang.value = 'EN' === to ? 'ES' : 'EN';
    } else {
        sourceLang.value = to;
        targetLang.value = from;
    }

    updateLanguageBadges();
    scheduleAutoTranslate();
}

function speakCurrentTranslation() {
    if (!currentTranslation) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentTranslation);
    utterance.lang = speechLangMap[targetLang.value] || 'en-US';
    window.speechSynthesis.speak(utterance);
}

async function copyTranslation() {
    if (!currentTranslation) {
        return;
    }

    try {
        await navigator.clipboard.writeText(currentTranslation);
        showToast('Copied to clipboard', 'success');
    } catch (error) {
        showToast('Could not copy right now', 'error');
    }
}

async function shareTranslation() {
    if (!currentTranslation) {
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'UniTranslate result',
                text: currentTranslation
            });
            showToast('Shared', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('Share not completed', 'error');
            }
        }
        return;
    }

    await copyTranslation();
    showToast('Share unsupported, copied instead', 'info');
}

function updateNetworkStatus() {
    if (navigator.onLine) {
        networkBanner.classList.add('hidden');
        networkBanner.textContent = '';
        return;
    }

    networkBanner.classList.remove('hidden');
    networkBanner.textContent = 'Offline mode: cached screens are available, live translation needs internet.';
}

function renderPhrasebook() {
    const pack = phrasebookPack.value;
    const phrases = phrasebookPacks[pack] || [];

    phraseChips.textContent = '';
    phrases.forEach((phrase) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chip';
        button.role = 'listitem';
        button.textContent = phrase;
        button.addEventListener('click', () => {
            inputText.value = phrase;
            updateCharCounter();
            translateNow('phrasebook');
        });
        phraseChips.appendChild(button);
    });
}

function getSpeechRecognitionClass() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function startRecognition(mode) {
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
        showToast('Speech recognition is not supported in this browser', 'error');
        return;
    }

    if (recognition) {
        recognition.stop();
    }

    recognitionMode = mode;
    recognition = new SpeechRecognitionClass();
    recognition.lang = speechLangMap[sourceLang.value] || navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.continuous = mode === 'conversation';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        startMicBtn.disabled = true;
        stopMicBtn.disabled = false;
        setStatus(mode === 'conversation' ? 'Conversation mode listening...' : 'Listening...', 'loading');
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(' ')
            .trim();

        if (!transcript) {
            return;
        }

        inputText.value = mode === 'conversation'
            ? transcript
            : `${inputText.value.trim()} ${transcript}`.trim();

        updateCharCounter();

        if (mode === 'conversation') {
            translateNow('conversation');
        } else if (autoTranslateEnabled) {
            scheduleAutoTranslate();
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'aborted') {
            showToast(`Microphone error: ${event.error}`, 'error');
        }
    };

    recognition.onend = () => {
        if (recognitionMode === 'conversation' && conversationMode) {
            try {
                recognition.start();
            } catch (error) {
                conversationMode = false;
                conversationBtn.classList.remove('active');
                conversationBtn.textContent = 'Conversation mode';
                setStatus('Conversation mode stopped', 'warning');
            }
            return;
        }

        startMicBtn.disabled = false;
        stopMicBtn.disabled = true;
        recognitionMode = 'idle';
        setStatus('Ready', 'neutral');
    };

    recognition.start();
}

function stopRecognition() {
    conversationMode = false;
    conversationBtn.classList.remove('active');
    conversationBtn.textContent = 'Conversation mode';

    if (recognition) {
        recognition.stop();
    }
    recognitionMode = 'idle';
    startMicBtn.disabled = false;
    stopMicBtn.disabled = true;
}

function toggleConversationMode() {
    if (conversationMode) {
        stopRecognition();
        showToast('Conversation mode stopped', 'info');
        return;
    }

    if (!getSpeechRecognitionClass()) {
        showToast('Speech recognition is not supported in this browser', 'error');
        return;
    }

    conversationMode = true;
    conversationBtn.classList.add('active');
    conversationBtn.textContent = 'Stop conversation';
    startRecognition('conversation');
    showToast('Conversation mode started', 'success');
}

async function runOcr(file) {
    if (!file) {
        return;
    }

    if (!window.Tesseract) {
        showToast('OCR engine still loading. Please retry in a moment.', 'error');
        return;
    }

    const ocrLang = ocrLangMap[sourceLang.value] || 'eng';
    ocrBtn.disabled = true;
    setStatus('Scanning text from image...', 'loading');

    try {
        const result = await window.Tesseract.recognize(file, ocrLang, {
            logger: (message) => {
                if (message.status === 'recognizing text') {
                    const progress = Math.round((message.progress || 0) * 100);
                    setStatus(`Scanning... ${progress}%`, 'loading');
                }
            }
        });

        const scannedText = (result?.data?.text || '').trim();
        if (!scannedText) {
            setStatus('No readable text found in image', 'warning');
            showToast('No readable text detected', 'info');
            return;
        }

        inputText.value = scannedText;
        updateCharCounter();
        showToast('Text extracted from image', 'success');
        await translateNow('ocr');
    } catch (error) {
        showToast('OCR failed. Try a clearer image.', 'error');
        setStatus('OCR failed', 'error');
    } finally {
        ocrBtn.disabled = false;
        ocrInput.value = '';
    }
}

function openSettings() {
    mainView.style.display = 'none';
    settingsView.classList.remove('hidden');
    settingsView.classList.add('visible');
    settingsView.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
    mainView.style.display = 'block';
    settingsView.classList.remove('visible');
    settingsView.classList.add('hidden');
    settingsView.setAttribute('aria-hidden', 'true');
}

function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            showToast('App is already installed or currently not installable', 'info');
            installBtn.classList.add('hidden');
            return;
        }

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        showToast(`Install prompt: ${choice.outcome}`, 'info');
        deferredPrompt = null;
        installBtn.classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installBtn.classList.add('hidden');
        showToast('App installed successfully', 'success');
    });
}

function bindEvents() {
    saveSettings.addEventListener('click', saveSettingsToStorage);
    settingsBtn.addEventListener('click', openSettings);
    backBtn.addEventListener('click', closeSettings);

    supportBtn.addEventListener('click', () => {
        const subject = encodeURIComponent('UniTranslate Support');
        const email = encodeURIComponent(emailInput.value.trim());
        const body = encodeURIComponent(`Hello UniTranslate team,\n\nAccount email: ${email || 'not provided'}\n\nI need help with:`);
        window.location.href = `mailto:allandavincs89@gmail.com?subject=${subject}&body=${body}`;
    });

    inputText.addEventListener('input', () => {
        updateCharCounter();
        currentTranslation = '';
        updateActionButtons();
        setStatus('Typing...', 'neutral');
        scheduleAutoTranslate();
    });

    inputText.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            translateNow('shortcut');
        }
    });

    translateBtn.addEventListener('click', () => translateNow('manual'));
    retryBtn.addEventListener('click', () => {
        if (!lastPayload) {
            return;
        }
        requestTranslation(lastPayload, 'retry');
    });

    sourceLang.addEventListener('change', () => {
        updateLanguageBadges();
        scheduleAutoTranslate();
    });

    targetLang.addEventListener('change', () => {
        updateLanguageBadges();
        scheduleAutoTranslate();
    });

    toneSelect.addEventListener('change', scheduleAutoTranslate);
    swapLangBtn.addEventListener('click', swapLanguages);

    speakBtn.addEventListener('click', speakCurrentTranslation);
    stopSpeakBtn.addEventListener('click', () => window.speechSynthesis.cancel());

    copyBtn.addEventListener('click', copyTranslation);
    shareBtn.addEventListener('click', shareTranslation);
    favoriteBtn.addEventListener('click', () => {
        if (!currentTranslation) {
            return;
        }
        saveFavorite({
            input: inputText.value.trim(),
            translation: currentTranslation,
            source_lang: sourceLang.value || 'AUTO',
            target_lang: targetLang.value,
            tone: toneSelect.value,
            at: Date.now()
        });
    });

    phrasebookPack.addEventListener('change', renderPhrasebook);

    startMicBtn.addEventListener('click', () => startRecognition('dictation'));
    stopMicBtn.addEventListener('click', stopRecognition);
    conversationBtn.addEventListener('click', toggleConversationMode);

    ocrBtn.addEventListener('click', () => ocrInput.click());
    ocrInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        runOcr(file);
    });

    autoTranslateToggle.addEventListener('change', () => {
        autoTranslateEnabled = autoTranslateToggle.checked;
        updateModeBadge();
        localStorage.setItem(STORAGE_KEYS.autoTranslate, String(autoTranslateEnabled));
    });

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
}

function init() {
    loadSettings();
    bindEvents();
    initInstallPrompt();
    updateCharCounter();
    updateLanguageBadges();
    updateActionButtons();
    renderPhrasebook();
    updateNetworkStatus();
    setResultText('Your translation will appear here.', 'normal');
    setStatus('Ready', 'neutral');

    if (!getSpeechRecognitionClass()) {
        startMicBtn.disabled = true;
        conversationBtn.disabled = true;
        showToast('Speech recognition not available in this browser', 'info');
    }
}

init();

