cat << 'EOF' > renderer.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

let logs = [];
let polygons = [];
let originalImage = null;

function addLog(msg) {
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    document.getElementById('log-area').textContent = logs.join('\n');
    console.log(msg);
}

document.getElementById('check-models').onclick = async () => {
    const key = document.getElementById('api-key').value;
    if (!key) return alert('Введите API ключ');
    try {
        addLog('Проверка моделей...');
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        document.getElementById('model-info').innerText = `Доступно: ${data.models.length} моделей`;
        document.getElementById('process-btn').disabled = false;
        addLog('Ключ валиден.');
    } catch (e) { addLog('Ошибка: ' + e.message); }
};

document.getElementById('process-btn').onclick = async () => {
    const file = document.getElementById('file-input').files[0];
    const key = document.getElementById('api-key').value;
    if (!file) return;

    const base64 = await toBase64(file);
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    
    for (const mName of models) {
        try {
            addLog(`Запрос к ${mName}...`);
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: mName });
            const prompt = "Detect rooms. Return JSON array: [{'name': 'Room', 'points': [[x,y],...]}] (coords 0-1000)";
            const result = await model.generateContent([prompt, { inlineData: { data: base64.split(',')[1], mimeType: "image/png" } }]);
            const text = result.response.text();
            polygons = JSON.parse(text.replace(/```json|```/g, '').trim());
            render();
            document.getElementById('save-btn').style.display = 'block';
            addLog('Готово!');
            break;
        } catch (e) { addLog(`Ошибка ${mName}: ${e.message}`); }
    }
};

function render() {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    polygons.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 122, 255, 0.3)';
        ctx.strokeStyle = '#007aff';
        p.points.forEach((pt, i) => {
            const x = (pt[0]/1000)*canvas.width;
            const y = (pt[1]/1000)*canvas.height;
            if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.closePath(); ctx.fill(); ctx.stroke();
    });
}

function toBase64(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                const canvas = document.getElementById('main-canvas');
                canvas.width = img.width; canvas.height = img.height;
                resolve(reader.result);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('view-logs').onclick = () => document.getElementById('log-modal').style.display = 'block';
document.getElementById('save-btn').onclick = () => window.electronAPI.saveFile(polygons);
EOF
