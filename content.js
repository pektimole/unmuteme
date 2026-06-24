// UnMuteMe — Auto Unmute for Google Meet & Microsoft Teams
// Detects speech while muted and automatically unmutes you.

let isEnabled = true;
let recognition = null;
let armed = true;
let lastMutedState = null;
let muteWatcher = null;
let micBlocked = false;

function setStatus(s) {
  chrome.storage.local.set({ status: s });
}

// Load settings
chrome.storage.local.get(["isEnabled"], (data) => {
  if (data.isEnabled !== undefined) isEnabled = data.isEnabled;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled === undefined) return;
  isEnabled = changes.isEnabled.newValue;
  if (!isEnabled) {
    stopRecognition();
    setStatus("disabled");
  } else {
    micBlocked = false;
    startRecognition();
  }
});

// --- Mute detection ---

function getMuteButton() {
  // Teams legacy: reliable ID
  const byId = document.getElementById("mic-button");
  if (byId) return byId;

  // CSS attribute selectors — case-insensitive, covers all locales and attribute variants.
  // Ordered by specificity: aria-label is canonical, data-tooltip is Meet's secondary attr.
  return (
    document.querySelector('[aria-label*="microphone" i]') ||
    document.querySelector('[aria-label*="mikrofon" i]') ||
    document.querySelector('[data-tooltip*="microphone" i]') ||
    document.querySelector('[data-tooltip*="mikrofon" i]') ||
    document.querySelector('[title*="microphone" i]') ||
    // Teams new client
    document.querySelector('[data-tid="toggle-mute"]') ||
    document.querySelector('[id^="microphone"]') ||
    null
  );
}

function isMuted() {
  const btn = getMuteButton();
  if (!btn) return null;

  // Explicit data attribute (Teams-style, most reliable)
  const dataMuted = btn.getAttribute("data-is-muted");
  if (dataMuted === "true") return true;
  if (dataMuted === "false") return false;

  // aria-pressed: true = button is "on" = mic is muted (depends on implementation)
  // Meet uses aria-label as the primary signal, skip aria-pressed to avoid inversion.

  const label = [
    btn.getAttribute("aria-label"),
    btn.getAttribute("data-tooltip"),
    btn.getAttribute("title"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // "Turn on microphone" / "Mikrofon aktivieren" / "Unmute" = currently muted
  if (
    label.includes("turn on") ||
    label.includes("aktivieren") ||
    label.includes("einschalten") ||
    label.includes("unmute")
  )
    return true;

  // "Turn off microphone" / "Mikrofon deaktivieren" / "Mute your" = currently unmuted
  if (
    label.includes("turn off") ||
    label.includes("deaktivieren") ||
    label.includes("ausschalten") ||
    label.includes("mute your") ||
    label.includes("mikrofo") // "Mikrofon aus" partial — catches DE "turn off" variants
  )
    return false;

  return null; // unknown — don't guess
}

function unmute() {
  const btn = getMuteButton();
  if (!btn) return;
  btn.click();
  console.log("[UnMuteMe] Unmuted!");
  armed = false; // re-arms on next manual mute (unmuted -> muted transition)
}

// --- Speech Recognition ---

function startRecognition() {
  if (recognition || micBlocked) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.error("[UnMuteMe] SpeechRecognition API unavailable");
    setStatus("api-unavailable");
    return;
  }

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  // Auto-detect language. Falls back to browser UI language, then en-US.
  recognition.lang = navigator.language || "en-US";

  recognition.onaudiostart = () => {
    setStatus("listening");
  };

  recognition.onresult = (event) => {
    if (!isEnabled || !armed) return;
    const muted = isMuted();
    if (!muted) return; // unmuted or state unknown — don't interfere

    const transcript =
      event.results[event.resultIndex][0].transcript.trim();
    if (transcript.length > 0) {
      console.log("[UnMuteMe] Speech while muted:", transcript);
      unmute();
    }
  };

  recognition.onerror = (event) => {
    console.warn("[UnMuteMe] Recognition error:", event.error);
    recognition = null;

    if (event.error === "not-allowed") {
      // Microphone permission denied. Don't loop — surface to user.
      micBlocked = true;
      setStatus("mic-blocked");
      return;
    }

    if (event.error === "no-speech") {
      // Normal silence timeout — restart quietly.
      setTimeout(startRecognition, 300);
      return;
    }

    // Other transient errors (network, aborted, etc.) — restart with backoff.
    setTimeout(startRecognition, 1500);
  };

  recognition.onend = () => {
    console.log("[UnMuteMe] Recognition ended.");
    recognition = null;
    if (isEnabled && !micBlocked) {
      setTimeout(startRecognition, 300);
    }
  };

  recognition.start();
  console.log("[UnMuteMe] Listening (lang:", recognition.lang, ")");
}

function stopRecognition() {
  if (recognition) {
    recognition.onend = null;
    recognition.onerror = null;
    recognition.abort();
    recognition = null;
    console.log("[UnMuteMe] Stopped");
  }
}

// --- Init ---

function startMuteWatcher() {
  if (muteWatcher) return;
  muteWatcher = setInterval(() => {
    const muted = isMuted();
    if (muted === null) return;

    if (muted !== lastMutedState) {
      const btn = getMuteButton();
      console.log(
        "[UnMuteMe] Mute state:",
        lastMutedState,
        "->",
        muted,
        "| label:",
        btn && btn.getAttribute("aria-label")
      );
    }

    if (lastMutedState === false && muted === true) {
      armed = true;
      console.log("[UnMuteMe] Re-armed (manual mute).");
    }

    lastMutedState = muted;

    // Watchdog: recognition died — revive it.
    if (isEnabled && !recognition && !micBlocked) {
      startRecognition();
    }
  }, 100);
}

function waitForMeetUI() {
  setStatus("waiting");
  if (getMuteButton()) {
    console.log("[UnMuteMe] UI ready.");
    lastMutedState = isMuted();
    startMuteWatcher();
    if (isEnabled) startRecognition();
  } else {
    setTimeout(waitForMeetUI, 2000);
  }
}

waitForMeetUI();
