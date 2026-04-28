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
        if (box.parentNode) box.parentNode.removeChild(box);
    });
}

function injectRomaji(target, text, settings) {
    removeOldBox();

    const themeColor = settings.themeColor || '#3ea6ff';
    const fontSize = settings.fontSize || '1.2';

    const romajiDiv = document.createElement('div');
    romajiDiv.className = "romaji-box";
    romajiDiv.textContent = text;

    // Strong styling to force full width
    romajiDiv.style.cssText = `
        color: ${themeColor} !important;
        background: rgba(62, 166, 255, 0.08) !important;
        padding: 20px 24px !important;
        margin: 16px 0 24px 0 !important;
        border-radius: 8px !important;
        border-left: 5px solid ${themeColor} !important;
        white-space: pre-wrap !important;
        font-size: ${fontSize}em !important;
        line-height: 1.75 !important;
        font-family: "Roboto", "Noto Sans", system-ui, sans-serif !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        box-sizing: border-box !important;
        text-align: left !important;
        word-break: break-word !important;
        overflow-wrap: anywhere !important;
        display: block !important;
    `;

    // Critical: Break out of parent's flex centering
    const parentContainer = target.parentElement;
    if (parentContainer) {
        parentContainer.style.cssText += `
            display: block !important;
            width: 100% !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
        `;
    }

    // Insert the romaji box
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
        document.querySelector('ytmusic-player-page') ||
        document.querySelector('ytmusic-browse-response') ||
        document.querySelector('ytmusic-app') ||
        document.body;

    observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processLyrics, 180);
    });

    observer.observe(stableParent, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['is-empty']
    });

    console.log("✅ Observer attached to:", stableParent.tagName || "body");
    // setTimeout(processLyrics, 1200);
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