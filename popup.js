const enabledEl = document.getElementById("enabled");

chrome.storage.local.get(["isEnabled"], (data) => {
  enabledEl.checked = data.isEnabled !== false;
});

enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ isEnabled: enabledEl.checked });
});
