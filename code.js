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
function isValid(values) {
    return values.every(v => Number.isFinite(v) && v > 0);
}
function parallel(a, b) {
    return (a * b) / (a + b);
}
const schem = document.getElementById("schematic");
const sctx = schem.getContext("2d");

function wire(x1, y1, x2, y2) {
    sctx.beginPath();
    sctx.moveTo(x1, y1);
    sctx.lineTo(x2, y2);
    sctx.stroke();
}
function dot(x, y) {
    sctx.beginPath();
    sctx.arc(x, y, 3, 0, 2 * Math.PI);
    sctx.fill();
}
function resistor(x, y, name, value) {
    sctx.strokeRect(x, y - 8, 60, 16);
    sctx.fillText(name, x + 20, y - 14);
    sctx.fillText(value, x + 2, y + 24);
}
function capacitor(x, y, name, value) {
    wire(x, y, x + 27, y);
    wire(x + 33, y, x + 60, y);
    wire(x + 27, y - 12, x + 27, y + 12);
    wire(x + 33, y - 12, x + 33, y + 12);
    sctx.fillText(name, x + 20, y - 16);
    sctx.fillText(value, x + 2, y + 26);
}
function pot(x, y, name, value) {
    sctx.strokeRect(x, y - 8, 120, 16);
    sctx.fillText(name + " " + value, x + 20, y - 14);
    wire(x + 60, y + 50, x + 60, y + 10);
    wire(x + 60, y + 10, x + 55, y + 18);
    wire(x + 60, y + 10, x + 65, y + 18);
}
function drawSchematic(r1, cBass, cTreble, r3, potValue) {
    sctx.clearRect(0, 0, schem.width, schem.height);
    sctx.strokeStyle = "#ffffff";
    sctx.fillStyle = "#ffffff";
    sctx.lineWidth = 2;
    sctx.font = "12px Arial";

    wire(40, 50, 80, 50);
    resistor(80, 50, "R1", formatRes(r1));
    wire(140, 50, 200, 50);
    pot(200, 50, "VR1 Bass", formatRes(potValue));
    wire(320, 50, 380, 50);
    resistor(380, 50, "R1", formatRes(r1));
    wire(440, 50, 700, 50);

    wire(200, 50, 200, 100);
    capacitor(200, 100, "C1", formatCap(cBass));
    capacitor(260, 100, "C2", formatCap(cBass));
    wire(320, 100, 320, 50);

    dot(200, 50);
    dot(320, 50);
    dot(260, 100);

    wire(40, 200, 80, 200);
    capacitor(80, 200, "C3", formatCap(cTreble));
    wire(140, 200, 200, 200);
    pot(200, 200, "VR2 Treble", formatRes(potValue));
    wire(320, 200, 380, 200);
    capacitor(380, 200, "C4", formatCap(cTreble));
    wire(440, 200, 700, 200);

    wire(40, 50, 40, 200);
    wire(10, 125, 40, 125);
    sctx.fillText("IN", 8, 115);
    dot(40, 125);
    wire(700, 50, 700, 285);
    dot(700, 200);
    wire(260, 100, 260, 140);
    wire(260, 140, 300, 140);
    resistor(300, 140, "R3", formatRes(r3));
    wire(360, 140, 600, 140);
    wire(600, 140, 600, 270);

    wire(260, 250, 260, 270);
    wire(260, 270, 620, 270);
    dot(600, 270);

    sctx.beginPath();
    sctx.moveTo(620, 250);
    sctx.lineTo(620, 320);
    sctx.lineTo(690, 285);
    sctx.closePath();
    sctx.stroke();
    sctx.fillText("-", 625, 274);
    sctx.fillText("+", 625, 304);
    sctx.fillText("NE5532", 625, 244);

    wire(620, 300, 590, 300);
    wire(590, 300, 590, 320);
    wire(580, 320, 600, 320);
    wire(584, 325, 596, 325);
    wire(588, 330, 592, 330);

    wire(690, 285, 740, 285);
    dot(700, 285);
    sctx.fillText("OUT", 712, 275);
}
function calculateComponents() {
    const pot = parseFloat(document.getElementById("potValue").value) * 1000;
    const mode = document.getElementById("mode").value;
    const maxBoost = parseFloat(document.getElementById("maxBoost").value);
    const bassFreq = parseFloat(document.getElementById("bassFreq").value);
    const trebleFreq = parseFloat(document.getElementById("trebleFreq").value);
    document.getElementById("designFields").style.display = mode === "analyze" ? "none" : "block";
    document.getElementById("analyzeFields").style.display = mode === "analyze" ? "block" : "none";
    const r1In = parseFloat(document.getElementById("r1Input").value);
    const cBassIn = parseFloat(document.getElementById("cBassInput").value);
    const cTrebleIn = parseFloat(document.getElementById("cTrebleInput").value);
    const channelsIn = parseInt(document.getElementById("channels").value);

    const values = mode === "analyze"
        ? [pot, r1In, cBassIn, cTrebleIn, channelsIn]
        : [pot, maxBoost, bassFreq, trebleFreq, channelsIn];
    if (!isValid(values)) {
        document.getElementById("results").innerHTML =
            "<span class='error'>Please enter positive numbers in all fields.</span>";
        document.getElementById("bom").innerHTML = "";
        return;
    }

    const a = dbtoGain(maxBoost);
    const r1 = pot / (a - 1);
    const cBass = 1 / (2 * Math.PI * bassFreq * Math.sqrt(pot * r1));
    const cTreble = 1 / (2 * Math.PI * trebleFreq * Math.sqrt(pot * r1));

    let r1Std, cBassStd, cTrebleStd;
    if (mode === "analyze") {
        r1Std = parseFloat(document.getElementById("r1Input").value) * 1000;
        cBassStd = parseFloat(document.getElementById("cBassInput").value) * 1e-9;
        cTrebleStd = parseFloat(document.getElementById("cTrebleInput").value) * 1e-9;
    } else {
        r1Std = roundToSeries(r1, E24);
        cBassStd = roundToSeries(cBass, E12);
        cTrebleStd = roundToSeries(cTreble, E12);
    }

    const realBoost = gainToDb((pot + r1Std) / r1Std);
    const realBass = 1 / (2 * Math.PI * cBassStd * Math.sqrt(pot * r1Std));
    const realTreble = 1 / (2 * Math.PI * cTrebleStd * Math.sqrt(pot * r1Std));

    curveBassFreq = realBass;
    curveTrebleFreq = realTreble;

    const limit = Math.floor(realBoost * 2) / 2;
    bassSlider.min = -limit;
    bassSlider.max = limit;
    trebleSlider.min = -limit;
    trebleSlider.max = limit;
     
   const designText =
    "<b>Calculated:</b><br>" +
    "R1 = " + formatRes(r1) + "<br>" +
    "C bass = " + formatCap(cBass) + "<br>" +
    "C treble = " + formatCap(cTreble) + "<br><br>" +
    "<b>Standard values:</b><br>" +
    "R1 = " + formatRes(r1Std) + " (E24)<br>" +
    "C bass = " + formatCap(cBassStd) + " (E12)<br>" +
    "C treble = " + formatCap(cTrebleStd) + "(E12)<br><br>";
    document.getElementById("results").innerHTML =
    (mode === "analyze" ? "" : designText) +
    "<b>Real result:</b><br>" +
    "Max boost = ±" + realBoost.toFixed(1) + " dB<br>" +
    "Bass freq = " + formatFreq(realBass) + "<br>" +
    "Treble freq = " + formatFreq(realTreble);

    const channels = parseInt(document.getElementById("channels").value);
    const gang = channels > 1 ? " (" + channels + "-gang)" : "";
    const opamps = Math.ceil(channels / 2);
    const r3Std = roundToSeries(r1Std / 3, E24);
    const xc3 = 1 / (2 * Math.PI * 20000 * cTrebleStd);
    const zin = parallel(r1Std + r3Std, xc3);
    const maxSource = zin / 10;
    let zinText = "<br><br><b>Input impedance:</b><br>" +
        "Min Zin ≈ " + formatRes(zin) + " (20 kHz, full treble boost)<br>" +
        "Source impedance should be < " + formatRes(maxSource);
    if (zin < 10000) {
        zinText += "<br><span class='error'>Low input impedance - use a buffer stage before the tone control.</span>";
    }
    document.getElementById("results").innerHTML += zinText;
    drawSchematic(r1Std, cBassStd, cTrebleStd, r3Std, pot);

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
let boxFc = 0;
let boxQtc = 0.707;

function calculateBox() {
    const fs = parseFloat(document.getElementById("fs").value);
    const qts = parseFloat(document.getElementById("qts").value);
    const vas = parseFloat(document.getElementById("vas").value);
    const qtc = parseFloat(document.getElementById("qtc").value);
    const out = document.getElementById("boxResults");

    if (!isValid([fs, qts, vas, qtc])) {
        out.innerHTML = "<span class='error'>Please enter positive numbers in all box fields.</span>";
        boxFc = 0;
        return;
    }
    if (qtc <= qts) {
        out.innerHTML = "<span class='error'>Target Qtc must be higher than Qts.</span>";
        boxFc = 0;
        return;
    }
    const alpha = (qtc / qts) * (qtc / qts) - 1;
    const vb = vas / alpha;
    const fc = fs * qtc / qts;
    const k = 1 / (qtc * qtc) - 2;
    const f3 = fc * Math.sqrt((k + Math.sqrt(k * k + 4)) / 2);

    boxFc = fc;
    boxQtc = qtc;

    out.innerHTML = 
        "<b>Closed box:<b></br>" +
        "Box volume Vb = " + vb.toFixed(1) + " L<br>" +
        "Resonance Fc = " + formatFreq(fc) + "<br>" +
        "-3 dB point F3 = " + formatFreq(f3);
}
function update() {
    calculateComponents();
    calculateBox();
    updateValues();
    drawGrid();
    drawCurve();
    
    
}
update();
const designInputs = ["potValue", "maxBoost", "bassFreq", "trebleFreq", "channels", "mode", "r1Input", "cBassInput", "cTrebleInput"];
for (const id of designInputs) {
    document.getElementById(id).addEventListener("input", update);
}
const boxInputs = ["fs", "qts", "vas", "qtc"];
for (const id of boxInputs) {
    document.getElementById(id).addEventListener("input", update);
}