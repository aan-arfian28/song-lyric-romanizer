// Default settings
const DEFAULTS = {
    themeColor: '#3ea6ff',
    fontSize: '1.2',
    enableJP: true,
    enableZH: true,
    enableKO: true
};

// DOM Elements
const elements = {
    themeColor: document.getElementById('themeColor'),
    fontSize: document.getElementById('fontSize'),
    enableJP: document.getElementById('enableJP'),
    enableZH: document.getElementById('enableZH'),
    enableKO: document.getElementById('enableKO'),
    saveBtn: document.getElementById('save')
};

// Load saved settings on popup open
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(DEFAULTS, (settings) => {
        elements.themeColor.value = settings.themeColor;
        elements.fontSize.value = settings.fontSize;
        elements.enableJP.checked = settings.enableJP;
        elements.enableZH.checked = settings.enableZH;
        elements.enableKO.checked = settings.enableKO;
    });
});

// Save settings
elements.saveBtn.onclick = () => {
    const newSettings = {
        themeColor: elements.themeColor.value || DEFAULTS.themeColor,
        fontSize: elements.fontSize.value || DEFAULTS.fontSize,
        enableJP: elements.enableJP.checked,
        enableZH: elements.enableZH.checked,
        enableKO: elements.enableKO.checked
    };

    chrome.storage.local.set(newSettings, () => {
        // Update button text to show success
        const originalText = elements.saveBtn.innerText;
        elements.saveBtn.innerText = "Saved! Refresh YTM";
        elements.saveBtn.style.background = "#4CAF50"; // Green for success

        setTimeout(() => {
            elements.saveBtn.innerText = originalText;
            elements.saveBtn.style.background = "#3ea6ff";
        }, 2000);
    });
};