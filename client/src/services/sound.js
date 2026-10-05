/**
 * Audio Chime and Browser Notification Service for Focus Timers
 */

export const playTimerCompletionChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playTone = (freq, startOffset, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + startOffset);

      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.linearRampToValueAtTime(0.3, now + startOffset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    // Pleasant three-note chime (C5 -> E5 -> G5)
    playTone(523.25, 0, 0.4);
    playTone(659.25, 0.2, 0.4);
    playTone(783.99, 0.4, 0.8);
  } catch (e) {
    console.warn("Could not play timer sound:", e);
  }
};

export const requestNotificationPermission = async () => {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch (e) {
    console.warn("Notification permission request failed:", e);
  }
};

export const sendFocusNotification = (title, body) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.svg",
      });
    }
  } catch (e) {
    console.warn("Notification dispatch failed:", e);
  }
};
