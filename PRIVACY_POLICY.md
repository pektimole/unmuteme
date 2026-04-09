# UnMuteMe Privacy Policy

**Last updated:** 2026-04-08

## Data Collection

UnMuteMe collects **no data**. Zero data leaves your device.

## How UnMuteMe Works

UnMuteMe runs entirely in your browser on `meet.google.com`. It uses the Web Speech API (built into Chrome) to detect when you start speaking while your microphone is muted. When detected, it clicks the Google Meet mute button on your behalf to unmute you. That's the entire feature.

## Speech Data

The Web Speech API processes microphone audio to detect speech. UnMuteMe does not store, log, transmit, or persist any transcription, audio, or speech data. The transcription is checked for length only ("did you say something?") and immediately discarded.

The Web Speech API itself is provided by Chrome and may transmit audio to Google's speech recognition service for processing. This is a browser-level behavior governed by Google's own privacy terms, not by UnMuteMe. UnMuteMe never accesses, stores, or forwards that data.

## Storage

UnMuteMe stores the following locally in your browser via `chrome.storage.local`:

- **Enabled state**: whether the extension is on or off (boolean)

This data never leaves your browser.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the Google Meet mute button state and click it to unmute you |
| `storage` | Persist the on/off toggle |
| Host permission (meet.google.com) | Inject the content script that watches for speech-while-muted |

Microphone access is requested at runtime by the browser's standard permission prompt the first time you use UnMuteMe in a Meet call. UnMuteMe never accesses your microphone outside of `meet.google.com`.

## Third-Party Services

UnMuteMe makes **no network requests**. No analytics, no telemetry, no crash reporting, no external APIs.

## Contact

Tim-Ole Pek -- tim@around.capital
