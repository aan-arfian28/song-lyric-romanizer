// content.js

let kuro;
let isInitialized = false;
let lastProcessedText = "";
let debounceTimer = null;
let observer = null;        // ← Important: declare it here

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
        console.error("Failed to initialize Romanizer :", err);
    }
}

async function processLyrics() {
    const lyricsElement = document.querySelector(
        'ytmusic-description-shelf-renderer yt-formatted-string.non-expandable.description'
    );

    // Cleanup when lyrics disappear or become empty
    if (!lyricsElement || lyricsElement.hasAttribute('is-empty')) {
        removeOldBox();
        lastProcessedText = "";
        return;
    }

    const currentText = lyricsElement.innerText.trim();

    // Skip if nothing changed
    if (currentText === lastProcessedText) return;

    // New content detected
    removeOldBox();
    lastProcessedText = currentText;

    // Skip if no Japanese text or too short
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(currentText);
    if (!hasJapanese || currentText.length < 10) return;

    // Initialize engine if needed
    if (!isInitialized) {
        await initKuro();
        if (!isInitialized) return;
    }

    try {
        const romaji = await kuro.convert(currentText, { 
            to: "romaji", 
            mode: "spaced" 
        });
        injectRomaji(lyricsElement, romaji);
    } catch (e) {
        console.error("Conversion error:", e);
        lastProcessedText = ""; // Allow retry
    }
}

function removeOldBox() {
    const box = document.querySelector('.romaji-box');
    if (box) {
        box.remove();
    }
}

function injectRomaji(target, text) {
    // Prevent duplicate boxes
    removeOldBox();

    const romajiDiv = document.createElement('div');
    romajiDiv.className = "romaji-box";
    romajiDiv.innerText = text;
    romajiDiv.style.cssText = `
        color: #3ea6ff;
        background: rgba(62, 166, 255, 0.05);
        padding: 20px;
        margin: 10px 0 20px 0;
        border-radius: 8px;
        white-space: pre-wrap;
        font-size: 1.2em;
        line-height: 1.6;
        border-left: 4px solid #3ea6ff;
    `;

    target.parentNode.insertBefore(romajiDiv, target);
}

// ==================== OBSERVER ====================

function startObserver() {
    const stableParent = document.querySelector('ytmusic-browse-response') 
                      || document.querySelector('ytmusic-app') 
                      || document.body;

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

    console.log("Observer attached to:", stableParent.tagName || "document.body");
}

// ==================== START EVERYTHING ====================

initKuro();
setTimeout(startObserver, 800);

// // Optional safety net (in case observer misses some changes)
// setInterval(() => {
//     if (document.querySelector('ytmusic-description-shelf-renderer')) {
//         processLyrics();
//     }
// }, 500);