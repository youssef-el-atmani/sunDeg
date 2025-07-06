/* ---------- Location ---------- */
const latitude = 33.26553;
const longitude = -7.58754;

/* ---------- Today’s max elevation ---------- */
const times = SunCalc.getTimes(new Date(), latitude, longitude);
const noonPos = SunCalc.getPosition(times.solarNoon, latitude, longitude);
const maxAltDeg = ((noonPos.altitude * 180) / Math.PI).toFixed(1);
document.getElementById("maxElev").textContent = maxAltDeg;

/* ---------- Alarm state ---------- */
let alarmTarget = null; // number (deg) or null
let alarmPlayed = false;
let alarmAudio = null; // Audio() object or null

document.getElementById("setAlarmBtn").addEventListener("click", () => {
  const degInput = parseFloat(document.getElementById("alarmDeg").value);
  if (isNaN(degInput)) {
    alert("Please enter a number for elevation.");
    return;
  }

  alarmTarget = degInput;
  alarmPlayed = false;

  /* choose sound */
  const file = document.getElementById("alarmFile").files[0];
  if (file) {
    /* user‑supplied file */
    if (alarmAudio) URL.revokeObjectURL(alarmAudio.src);
    alarmAudio = new Audio(URL.createObjectURL(file));
  } else {
    /* fallback: quick 880 Hz beep */
    alarmAudio = null;
  }

  statusMsg(`Alarm armed for ${alarmTarget}°`, "waiting");
});

/* helper to change status line */
function statusMsg(msg, cls) {
  const e = document.getElementById("alarmStatus");
  e.textContent = msg;
  e.className = cls;
}

/* ---------- Live updates ---------- */
function updateSun() {
  const now = new Date();
  const pos = SunCalc.getPosition(now, latitude, longitude);
  const azDeg = ((pos.azimuth * 180) / Math.PI + 180).toFixed(2);
  const altDeg = ((pos.altitude * 180) / Math.PI).toFixed(1);

  document.getElementById("azimuth").textContent = azDeg;
  document.getElementById("elevation").textContent = altDeg;

  /* check alarm */
  if (alarmTarget !== null && !alarmPlayed && altDeg == alarmTarget) {
    alarmPlayed = true;
    if (alarmAudio) {
      alarmAudio.play().catch(() => null);
    } else {
      clockTicks({
        count: 11,
        interval: 1,
        tickDuration: 0.05,
        frequency: 440,
      });
    }
    statusMsg(`Alarm! Sun reached ${altDeg}°`, "ok");
  }
}

/* 1‑second timer */
updateSun();
setInterval(updateSun, 1000);

// ################################
/**
 * Play a run of clock‑like ticks.
 *
 * @param {number} count           How many ticks you want (default 60).
 * @param {number} interval        Time between the starts of two ticks, in seconds (default 1 s).
 * @param {number} tickDuration    Audible length of each tick, in seconds (default 0.02 s).
 * @param {number} frequency       Pitch of the tick, in hertz (default 880 Hz).
 */
function clockTicks({
  count = 60,
  interval = 1,
  tickDuration = 0.02,
  frequency = 880,
} = {}) {
  // Web‑Audio setup
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator(); // sound source
  const gain = ctx.createGain(); // acts like a volume knob

  // Shape and route the signal
  osc.type = "square"; // a clickier “tick” than sine
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  // Schedule each tick by toggling the gain (volume) quickly on/off
  for (let i = 0; i < count; i++) {
    const start = now + i * interval; // when this tick begins
    gain.gain.setValueAtTime(1, start); // volume up
    gain.gain.setValueAtTime(0, start + tickDuration); // volume back down
  }

  // Fire it up and stop after the last tick
  osc.start(now);
  osc.stop(now + count * interval + 0.1);
}
