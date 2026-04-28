// background.js - Keep this minimal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SETTINGS") {
        chrome.storage.local.get(["color", "fontSize", "enabled"], (data) => {
            sendResponse({
                color: data.color || "#3ea6ff",
                fontSize: data.fontSize || 1.4,
                enabled: data.enabled !== false
            });
        });
        return true;
    }
});