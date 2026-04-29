let kuro;
let isKuroReady = false;
let lastLyrics = "";

// ================= INIT =================
async function initKuro() {
    if (isKuroReady) return;

    const Kuro = window.Kuroshiro?.default || window.Kuroshiro;
    const Analyzer = window.kuroshiroAnalyzerKuromoji || window.KuromojiAnalyzer;

    kuro = new Kuro();
    await kuro.init(new Analyzer({
        dictPath: chrome.runtime.getURL("lib/dict/")
    }));

    isKuroReady = true;
}

// ================= UTIL =================
function cleanText(text) {
    return text
        .replace(/[ \t]+$/gm, "")  // trim end
        .replace(/^[ \t]+/gm, ""); // trim start
}

function createRomajiBox(text, { themeColor, fontSize }) {
    const box = document.createElement("div");

    // Reset + styling
    box.style.cssText = `
        display: block;
        white-space: pre-wrap;

        color: ${themeColor};
        background: rgba(62,166,255,0.08);

        padding: 20px 24px;
        margin: 16px 0;

        border-left: 5px solid ${themeColor};
        border-radius: 8px;

        font: ${fontSize}em/1.75 Roboto, Noto Sans, system-ui, sans-serif;
        box-sizing: border-box;
        width: 100%;
    `;

    // Render lines safely (fix indentation bug)
    box.innerHTML = text
                    .split('\n')
                    .map(line => {
                        if (!line.trim()) {
                        return `<div style="height:1em;"></div>`; // 👈 preserve verse spacing
                        }
                        return `<div>${line.trim()}</div>`;
                    })
                    .join('');

    return box;
}

function removeOld() {
    document.querySelectorAll(".romaji-box").forEach(el => el.remove());
}

function getSettings() {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get({
                themeColor: "#3ea6aa",
                fontSize: "1.2",
                enableJP: true,
                enableKO: true,
                enableZH: true
            }, (settings) => {
                if (chrome.runtime.lastError) {
                    console.warn("Storage error:", chrome.runtime.lastError);
                    return resolve({
                        themeColor: "#3ea6aa",
                        fontSize: "1.2",
                        enableJP: true,
                        enableKO: true,
                        enableZH: true
                    });
                }
                resolve(settings);
            });
        } catch (e) {
            console.warn("Extension context lost, fallback to defaults");
            resolve({
                themeColor: "#3ea6aa",
                fontSize: "1.2",
                enableJP: true,
                enableKO: true,
                enableZH: true
            });
        }
    });
}


// ================= CORE =================
async function processLyrics() {
    const el = document.querySelector(
        "ytmusic-description-shelf-renderer yt-formatted-string.non-expandable.description"
    );

    if (!el || el.hasAttribute("is-empty")) {
        removeOld();
        lastLyrics = "";
        return;
    }

    const text = el.innerText.trim();
    if (!text || text === lastLyrics) return;

    lastLyrics = text;

    const settings = await getSettings();

    let result = "";

    try {
        if (/[\u3040-\u30ff]/.test(text) && settings.enableJP) {
            await initKuro();
            const toRomajiMixed = async (line) => {
                return await Promise.all(
                    line.split(/([\u3040-\u30ff\u4e00-\u9fff]+)/g).map(async (chunk) => {
                        // If it's Japanese → convert
                        if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(chunk)) {
                            return await kuro.convert(chunk, {
                                to: "romaji",
                                mode: "spaced"
                            });
                        }
                        // Otherwise → keep as-is
                        return chunk;
                    })
                ).then(parts => parts.join(''));
            };

            result = await Promise.all(
                text.split('\n').map(toRomajiMixed)
            ).then(lines => lines.join('\n'));
        }
        else if (/[\uac00-\ud7af]/.test(text) && settings.enableKO) {
            const romanize = window.HangulRomanize?.Romanize?.from?.bind(window.HangulRomanize.Romanize);
            if (romanize) {
                result = text
                    .split("\n")
                    .map(l => l.trim() ? romanize(l) : "")
                    .join("\n");
            }
        }
        else if (/[\u4e00-\u9fff]/.test(text) && settings.enableZH) {
            const toPinyinMixed = (line) => {
                return line.replace(/[\u4e00-\u9fff]+/g, (chunk) => {
                    return window.pinyinPro.pinyin(chunk, {
                        toneType: 'symbol'
                    });
                });
            };
            console.log('ahskjdhasjlkdajlkshdasdjlkashlkdahslidbh hbdliahduiahlisdhh')

            result = text
                .split('\n')
                .map(line => toPinyinMixed(line))
                .join('\n');

            console.log("Pinyin result:", result);
            // old_version = result = window.pinyinPro?.pinyin?.(text, { toneType: "symbol" }) || "";
        }
    } catch (e) {
        console.error("Romanization failed:", e);
        return;
    }

    if (!result || result === text) {
        removeOld();
        return;
    }

    removeOld();

    const box = createRomajiBox(cleanText(result), settings);
    box.className = "romaji-box";

    const wrapper = document.createElement("div");
    wrapper.appendChild(box);

    el.parentNode.insertBefore(wrapper, el);
}

// ================= OBSERVER =================
const observer = new MutationObserver(() => {
    clearTimeout(observer._t);
    observer._t = setTimeout(processLyrics, 150);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["is-empty"]
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    // Only rerender if relevant keys changed
    const keys = ["themeColor", "fontSize", "enableJP", "enableKO", "enableZH"];
    const shouldUpdate = Object.keys(changes).some(k => keys.includes(k));

    if (shouldUpdate) {
        lastLyrics = ""; // force refresh
        processLyrics();
    }
});

// Initial run
setTimeout(processLyrics, 800);