const bassSlider = document.getElementById("bass");
const trebleSlider = document.getElementById("treble");
const bassValue = document.getElementById("bassValue");
const trebleValue = document.getElementById("trebleValue");

function updateValues() {
    bassValue.textContent = bassSlider.value + " dB";
    trebleValue.textContent = trebleSlider.value + " dB";
}

bassSlider.addEventListener("input", update);
trebleSlider.addEventListener("input", update);

const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

const F_MIN = 20;
const F_MAX = 20000;
const DB_MIN = -15;
const DB_MAX = 15;

function freqToX(f) {
    const logMin = Math.log10(F_MIN);
    const logMax = Math.log10(F_MAX);
    return (Math.log10(f) - logMin) / (logMax - logMin) * canvas.width; 
}
function dbToY(db) {
    return (DB_MAX - db) / (DB_MAX - DB_MIN) * canvas.height;
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#333333";
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "12px Arial";
    ctx.lineWidth = 1;

    const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    for (const f of freqs) {
        const x = freqToX(f);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        const label = f >= 1000 ? (f / 1000) + "k" : f;
        ctx.fillText(label, x + 3, canvas.height - 5); 
    }
    for (let db = DB_MIN; db <= DB_MAX; db += 5) {
        const y = dbToY(db);
        ctx.strokeStyle = db === 0 ? "#777777" : "#333333";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.fillText(db + " dB", 3, y - 3);
    }
}
let curveBassFreq = 100;
let curveTrebleFreq = 10000;

function dbtoGain(db) {
    return Math.pow(10, db / 20);
}
function gainToDb(gain) {
    return 20 * Math.log10(gain);
}
function bassResponce(f, db) {
    const a = dbtoGain(db);
    const fc = curveBassFreq / Math.sqrt(a);
    const num = Math.sqrt(f * f + (a * fc) * (a * fc));
    const den = Math.sqrt(f * f + fc * fc);
    return num / den;
}
function trebleResponce(f, db) {
    const a = dbtoGain(db);
    const fc = curveTrebleFreq * Math.sqrt(a);
    const num = Math.sqrt((a * f) * (a * f) + fc * fc);
    const den = Math.sqrt(f * f + fc * fc);
    return num / den;
}
function drawCurve() {
    const bassDb = parseFloat(bassSlider.value);
    const trebleDb = parseFloat(trebleSlider.value);

    ctx.strokeStyle = "#00d0ff"
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= canvas.width; i++) {
        const f = F_MIN * Math.pow(F_MAX / F_MIN, i / canvas.width);
        const gain = bassResponce(f, bassDb) * trebleResponce(f, trebleDb);
        const y = dbToY(gainToDb(gain));
        if (i === 0) {
            ctx.moveTo(i, y);
        } else {
            ctx.lineTo(i, y);
        }
    }
    ctx.stroke();
}
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2, 10];
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3,
             3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1, 10];

function roundToSeries(value, series) {
    const exp = Math.floor(Math.log10(value));
    const mantissa = value / Math.pow(10, exp);
    let best = series[0];
    let bestDiff = Infinity;
    for (const s of series) {
        const diff = Math.abs(Math.log10(mantissa / s));
        if (diff < bestDiff) {
            bestDiff = diff;
            best = s;
        }
    }
    return best * Math.pow(10, exp);
}
function formatFreq(f) {
    if (f >= 1000) return (f / 1000).toFixed(2) + " kHz";
    return f.toFixed(0) + " Hz";
}
function formatCap(c) {
    if (c >= 1e-6) return (c * 1e6).toFixed(2) + " µF";
    if (c >= 1e-9) return (c * 1e9).toFixed(2) + " nF";
    return (c * 1e12).toFixed(1) + "pF";
}
function formatRes(r) {
    return (r / 1000).toFixed(2) + " kΩ";
}
function calculateComponents() {
    const pot = parseFloat(document.getElementById("potValue").value) * 1000;
    const maxBoost = parseFloat(document.getElementById("maxBoost").value);
    const bassFreq = parseFloat(document.getElementById("bassFreq").value);
    const trebleFreq = parseFloat(document.getElementById("trebleFreq").value);

    const a = dbtoGain(maxBoost);
    const r1 = pot / (a - 1);
    const cBass = 1 / (2 * Math.PI * bassFreq * Math.sqrt(pot * r1));
    const cTreble = 1 / (2 * Math.PI * trebleFreq * Math.sqrt(pot * r1));

    const r1Std = roundToSeries(r1, E24);
    const cBassStd = roundToSeries(cBass, E12);
    const cTrebleStd = roundToSeries(cTreble, E12);

    const realBoost = gainToDb((pot + r1Std) / r1Std);
    const realBass = 1 / (2 * Math.PI * cBassStd * Math.sqrt(pot * r1Std));
    const realTreble = 1 / (2 * Math.PI * cTrebleStd * Math.sqrt(pot * r1Std));

    curveBassFreq = realBass;
    curveTrebleFreq = realTreble;

    const limit = realBoost.toFixed(1);
    bassSlider.min = -limit;
    bassSlider.max = limit;
    trebleSlider.min = -limit;
    trebleSlider.max = limit;
     
    document.getElementById("results").innerHTML = 
    "<b>Calculated:</b><br>" +
    "R1 = " + formatRes(r1) + "<br>" +
    "C bass = " + formatCap(cBass) + "<br>" +
    "C treble = " + formatCap(cTreble) + "<br><br>" +
    "<b>Standard values:</b><br>" +
    "R1 = " + formatRes(r1Std) + " (E24)<br>" +
    "C bass = " + formatCap(cBassStd) + " (E12)<br>" +
    "C treble = " + formatCap(cTrebleStd) + "(E12)<br><br>" + 
    "<b>Real result:</b><br>" +
    "Max boost = ±" + realBoost.toFixed(1) + " dB<br>" +
    "Bass freq = " + formatFreq(realBass) + "<br>" +
    "Treble freq = " + formatFreq(realTreble);

    const channels = parseInt(document.getElementById("channels").value);
    const gang = channels > 1 ? " (" + channels + "-gang)" : "";
    const opamps = Math.ceil(channels / 2);
    const r3Std = roundToSeries(r1Std / 3, E24);

    document.getElementById("bom").innerHTML =
    "<br><b>BOM (" + channels + " ch):</b><br>" +
    (2 * channels) + "x R1 " + formatRes(r1Std) + "<br>" +
    (2 * channels) + "x C bass " + formatCap(cBassStd) + "<br>" + 
    (2 * channels) + "x C treble " + formatCap(cTrebleStd) + "<br>" +
    "1x pot bass " + (pot / 1000) + " kΩ lin" + gang + "<br>" +
    "1x pot treble" + (pot / 1000) + " kΩ lin" + gang + "<br><br>" +
    "<b>Active stage:</b><br>" +
    channels + "x R3 " + formatRes(r3Std) + "<br>" +
    opamps + "x NE5532 (dual op-amp)<br>" +
    (2 * channels) + "x 2.2 µF film (in/out coupling)<br>" +
    (2 * opamps) + "x 100 nF ceramic (supply decoupling)";
}
function update() {
    calculateComponents();
    updateValues();
    drawGrid();
    drawCurve();
    
}
update();
const designInputs = ["potValue", "maxBoost", "bassFreq", "trebleFreq", "channels"];
for (const id of designInputs) {
    document.getElementById(id).addEventListener("input", update);
}