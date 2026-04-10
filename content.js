// UnMuteMe — Auto Unmute for Google Meet & Microsoft Teams
// Detects speech while muted and automatically unmutes you.
// No voice commands needed - just talk and it unmutes.

let isEnabled = true;
let recognition = null;
// Latch: armed = we're allowed to auto-unmute. Disarmed after we unmute you.
// Re-arms whenever we observe a fresh manual mute (unmuted -> muted).
let armed = true;
let lastMutedState = null;
let muteWatcher = null;

// Load settings
chrome.storage.local.get(["isEnabled"], (data) => {
  if (data.isEnabled !== undefined) isEnabled = data.isEnabled;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled !== undefined) isEnabled = changes.isEnabled.newValue;
  if (!isEnabled) stopRecognition();
  else startRecognition();
});

// --- Mute detection ---

function getMuteButton() {
  // Teams: reliable ID selector.
  const teamsBtn = document.getElementById("mic-button");
  if (teamsBtn) return teamsBtn;

  // Meet: match any button whose aria-label mentions microphone/mikrofon.
  const all = document.querySelectorAll("[aria-label]");
  for (const el of all) {
    const label = (el.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("microphone") || label.includes("mikrofon") || label.includes("mic ")) {
      return el;
    }
  }
  return null;
}

function isMuted() {
  const btn = getMuteButton();
  if (!btn) return null;
  const label = (btn.getAttribute("aria-label") || "").toLowerCase();
  // "Turn on microphone" / "Mikrofon aktivieren" = currently muted
  // Also handle data-is-muted attribute if present.
  const dataMuted = btn.getAttribute("data-is-muted");
  if (dataMuted === "true") return true;
  if (dataMuted === "false") return false;
  // "Turn on microphone" / "Mikrofon aktivieren" = Meet muted
  // "Unmute mic" = Teams muted
  return label.includes("turn on") || label.includes("aktivieren") || label.includes("unmute");
}

function unmute() {
  const btn = getMuteButton();
  if (!btn) return;
  btn.click();
  console.log("[AutoUnmute] Unmuted you!");
  // Disarm. Only re-arm after observing a manual mute (unmuted -> muted transition).
  armed = false;
}

// --- Speech Recognition ---

function startRecognition() {
  if (recognition) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("[AutoUnmute] SpeechRecognition API not available");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "de-DE";

  recognition.onresult = (event) => {
    if (!isEnabled || !armed) return;
    if (!isMuted()) return;

    const transcript = event.results[event.resultIndex][0].transcript.trim();
    if (transcript.length > 0) {
      console.log("[AutoUnmute] Speech detected while muted:", transcript);
      unmute();
    }
  };

  recognition.onerror = (event) => {
    console.warn("[AutoUnmute] Recognition error:", event.error);
    // Always try to recover, regardless of error type.
    restartRecognition();
  };

  recognition.onend = () => {
    console.log("[AutoUnmute] Recognition ended.");
    recognition = null;
    if (isEnabled) setTimeout(startRecognition, 300);
  };

  recognition.start();
  console.log("[AutoUnmute] Listening for speech-while-muted...");
}

function stopRecognition() {
  if (recognition) {
    recognition.onend = null;
    recognition.abort();
    recognition = null;
    console.log("[AutoUnmute] Stopped");
  }
}

function restartRecognition() {
  stopRecognition();
  setTimeout(startRecognition, 1000);
}

// --- Init ---

function startMuteWatcher() {
  if (muteWatcher) return;
  muteWatcher = setInterval(() => {
    const btn = getMuteButton();
    const muted = isMuted();
    if (muted === null) return; // Pre-join lobby: mute button not in DOM yet.
    if (muted !== lastMutedState) {
      console.log("[AutoUnmute] Mute state changed:", lastMutedState, "->", muted, "(label:", btn && btn.getAttribute("aria-label"), ")");
    }
    // Re-arm on every fresh manual mute (unmuted -> muted transition).
    if (lastMutedState === false && muted === true) {
      armed = true;
      console.log("[AutoUnmute] Re-armed (you muted yourself).");
    }
    lastMutedState = muted;
    // Watchdog: if recognition died, bring it back.
    if (isEnabled && !recognition) {
      console.log("[AutoUnmute] Watchdog: recognition is dead, restarting.");
      startRecognition();
    }
  }, 100);
}

function waitForMeetUI() {
  const btn = getMuteButton();
  if (btn) {
    console.log("[AutoUnmute] Meet UI ready. Watching for speech-while-muted.");
    lastMutedState = isMuted();
    startMuteWatcher();
    if (isEnabled) startRecognition();
  } else {
    setTimeout(waitForMeetUI, 2000);
  }
}

waitForMeetUI();
