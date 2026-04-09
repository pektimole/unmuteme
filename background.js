// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStatus") {
    chrome.storage.local.get(["isEnabled"], (data) => {
      sendResponse({ isEnabled: data.isEnabled !== false });
    });
    return true; // async response
  }
});
