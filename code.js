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
const BASS_FREQ = 100;
const TREBLE_FREQ = 10000;

function dbtoGain(db) {
    return Math.pow(10, db / 20);
}
function gainToDb(gain) {
    return 20 * Math.log10(gain);
}
function bassResponce(f, db) {
    const a = dbtoGain(db);
    const fc = BASS_FREQ;
    const num = Math.sqrt(f * f + (a * fc) * (a * fc));
    const den = Math.sqrt(f * f + fc * fc);
    return num / den;
}
function trebleResponce(f, db) {
    const a = dbtoGain(db);
    const fc = TREBLE_FREQ;
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
function update() {
    updateValues();
    drawGrid();
    drawCurve();
}
update();