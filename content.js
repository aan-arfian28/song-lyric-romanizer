let kuro;
let isInitialized = false;
let lastProcessedText = "";
let debounceTimer = null;
let observer = null;
let intervalId = null;

let cachedSettings = null;
let settingsCacheTime = 0;
const SETTINGS_TTL = 30_000;

async function initKuro() {
    if (isInitialized) return;
    try {
        const KuroConstructor = window.Kuroshiro?.default || window.Kuroshiro;
        kuro = new KuroConstructor();

        const AnalyzerConstructor = window.kuroshiroAnalyzerKuromoji || window.KuromojiAnalyzer;
        const dictPath = chrome.runtime.getURL("lib/dict/");
        const analyzer = new AnalyzerConstructor({ dictPath });

        await kuro.init(analyzer);
        isInitialized = true;
    } catch (err) {
        console.error("Failed to initialize Japanese Romanizer:", err);
    }
}

function removeOldBox() {
    document.querySelectorAll('.romaji-box').forEach(box => {
        box.innerHTML = '';
        box.remove();
    });
}

function injectRomaji(target, text, settings) {
    removeOldBox();

    const themeColor = settings.themeColor || '#3ea6ff';
    const fontSize = settings.fontSize || '1.2';

    const romajiDiv = document.createElement('div');
    romajiDiv.className = "romaji-box";
    romajiDiv.innerHTML = text;
    romajiDiv.style.cssText = `
        color: ${themeColor};
        background: rgba(62, 166, 255, 0.05);
        padding: 20px;
        margin: 10px 0 20px 0;
        border-radius: 8px;
        white-space: pre-wrap;
        font-size: ${fontSize}em;
        line-height: 1.6;
        border-left: 4px solid ${themeColor};
    `;

    target.parentNode.insertBefore(romajiDiv, target);
}

async function getSettings() {
    const now = Date.now();
    if (cachedSettings && (now - settingsCacheTime) < SETTINGS_TTL) {
        return cachedSettings;
    }

    return new Promise((resolve) => {
        chrome.storage.local.get({
            themeColor: '#3ea6ff',
            fontSize: '1.2',
            enableJP: true,
            enableKO: true,
            enableZH: true
        }, (settings) => {
            cachedSettings = settings;
            settingsCacheTime = Date.now();
            resolve(settings);
        });
    });
}

let isProcessing = false;

async function processLyrics() {
    if (isProcessing) return;

    const lyricsElement = document.querySelector('ytmusic-description-shelf-renderer yt-formatted-string.non-expandable.description');
    console.log("🔍 Checking lyrics element:", lyricsElement);

    if (!lyricsElement || lyricsElement.hasAttribute('is-empty')) {
        removeOldBox();
        lastProcessedText = "";
        return;
    }

    const currentText = lyricsElement.innerText.trim();
    if (currentText === lastProcessedText || currentText.length < 5) return;

    const hasKana = /[\u3040-\u30ff]/.test(currentText);
    const isKO = /[\uac00-\ud7af]/.test(currentText);
    const hasCJK = /[\u4e00-\u9fff]/.test(currentText);

    let lang = null;

    if (isKO) {
        lang = 'KO';
    } else if (hasKana) {
        lang = 'JP';
    } else if (hasCJK) {
        lang = 'ZH';
    }

    lastProcessedText = currentText;
    isProcessing = true;

    removeOldBox();

    const settings = await getSettings();
    let resultText = "";

    try {
        if (lang === 'JP' && settings.enableJP) {
            if (!isInitialized) await initKuro();
            resultText = await kuro.convert(currentText, { to: "romaji", mode: "spaced" });
        }
        else if (lang === 'KO' && settings.enableKO) {
            const romanizeFrom = window.HangulRomanize?.Romanize?.from?.bind(window.HangulRomanize.Romanize);

            if (typeof romanizeFrom === 'function') {
                const lines = currentText.split('\n');
                const romanized = lines.map(line => {
                    if (!line.trim()) return '';
                    try {
                        return romanizeFrom(line);
                    } catch {
                        return line;
                    }
                });
                resultText = romanized.join('\n');
            } else {
                console.warn("⚠️ HangulRomanize.from not available");
                lastProcessedText = "";
            }
        }
        else if (lang === 'ZH' && settings.enableZH && window.pinyinPro?.pinyin) {
            resultText = window.pinyinPro.pinyin(currentText, { toneType: 'symbol' });
        }
    } catch (e) {
        console.error("❌ Romanization error:", e);
        lastProcessedText = "";
    } finally {
        isProcessing = false;
    }

    if (resultText && resultText !== currentText) {
        injectRomaji(lyricsElement, resultText, settings);
    }
}

// ==================== OBSERVER ====================
function startObserver() {
    const stableParent =
        document.querySelector('ytmusic-browse-response') ||
        document.querySelector('ytmusic-app') ||
        document.body;

    observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processLyrics, 180);
    });

    observer.observe(stableParent, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['is-empty']
    });

    console.log("✅ Observer attached to:", stableParent.tagName || "body");
    setTimeout(processLyrics, 1200);
}

// ==================== START ====================
initKuro();
setTimeout(startObserver, 800);

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        // Invalidate the cache
        cachedSettings = null;
        
        // Force a re-process of the lyrics with new settings
        processLyrics();
        console.log("🔄 Settings updated live");
    }
});

// intervalId = setInterval(() => {
//     if (document.querySelector('ytmusic-description-shelf-renderer')) {
//         processLyrics();
//     }
// }, 3000);