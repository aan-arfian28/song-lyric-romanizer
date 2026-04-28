chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SETTINGS") {
        // Match the keys used in options.js and content.js
        chrome.storage.local.get(["themeColor", "fontSize", "enableJP", "enableZH", "enableKO"], (data) => {
            sendResponse(data);
        });
        return true; 
    }
}); 

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});