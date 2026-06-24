const enabledEl = document.getElementById("enabled");
const dotEl = document.getElementById("statusDot");
const textEl = document.getElementById("statusText");
const helpEl = document.getElementById("helpText");

const STATUS_MAP = {
  waiting:        { dot: "grey",   text: "Waiting for meeting UI…" },
  listening:      { dot: "green",  text: "Listening — ready to unmute." },
  disabled:       { dot: "grey",   text: "Disabled." },
  "api-unavailable": {
    dot: "red",
    text: "Speech API unavailable.",
    help: "Try reopening the tab or updating Chrome.",
  },
  "mic-blocked": {
    dot: "red",
    text: "Microphone access blocked.",
    help: "Click the lock icon in Chrome's address bar → allow microphone → reload the meeting.",
  },
};

function applyStatus(raw) {
  const s = STATUS_MAP[raw] || { dot: "grey", text: "Open a Meet or Teams tab first." };
  dotEl.className = "dot dot-" + s.dot;
  textEl.textContent = s.text;
  helpEl.textContent = s.help || "";
}

chrome.storage.local.get(["isEnabled", "status"], (data) => {
  enabledEl.checked = data.isEnabled !== false;
  applyStatus(data.status);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.status) applyStatus(changes.status.newValue);
  if (changes.isEnabled) enabledEl.checked = changes.isEnabled.newValue;
});

enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ isEnabled: enabledEl.checked });
});
