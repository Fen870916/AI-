import { GoogleGenAI } from "@google/genai";

// Initialize UI elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeBtn = document.getElementById('analyze-btn');
const imagePreview = document.getElementById('image-preview');
const previewContainer = document.getElementById('preview-container');
const clockElement = document.getElementById('clock');
const strategySelect = document.getElementById('strategy-select');
const apiKeyInput = document.getElementById('api-key-input');
const customStrategyContainer = document.getElementById('custom-strategy-container');
const customStrategyInput = document.getElementById('custom-strategy-input');

// Results elements
const welcomeMsg = document.getElementById('welcome-msg');
const loadingState = document.getElementById('loading-state');
const analysisContent = document.getElementById('analysis-content');
const ratingBadge = document.getElementById('rating-badge');
const resConfidence = document.getElementById('res-confidence');
const resStrategy = document.getElementById('res-strategy');
const resObservations = document.getElementById('res-observations');
const resRisk = document.getElementById('res-risk');

let selectedFile = null;

// Clock
setInterval(() => {
    const now = new Date();
    clockElement.innerText = now.toLocaleTimeString('en-US', { hour12: false });
}, 1000);

// Strategy selection change
strategySelect.addEventListener('change', () => {
    if (strategySelect.value === 'custom') {
        customStrategyContainer.classList.remove('hidden');
    } else {
        customStrategyContainer.classList.add('hidden');
    }
});

// Drag and drop logic
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                previewContainer.classList.remove('hidden');
                analyzeBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }
}

// Analysis Logic
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // UI state: Loading
    welcomeMsg.classList.add('hidden');
    analysisContent.classList.add('hidden');
    loadingState.classList.remove('hidden');
    analyzeBtn.disabled = true;

    try {
        let strategyName = strategySelect.options[strategySelect.selectedIndex].text;
        let strategyDesc = strategySelect.value;
        
        if (strategyDesc === 'custom') {
            strategyDesc = customStrategyInput.value || "未提供自定義描述";
            strategyName = "自定義策略";
        }

        const base64Image = await fileToBase64(selectedFile);
        
        // Initialize Gemini using provided or default API Key
        const apiKey = apiKeyInput.value.trim() || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Missing API Key. Please provide one or ensure environment is configured.");
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = `你是一位專業的量化交易分析師。請依據 '${strategyDesc}' 策略分析這張 K 線圖影像。
        識別關鍵的技術形態、支撐/壓力位、趨勢方向以及任何可見的技術指標訊號。
        
        硬性要求：
        1. 必須使用「台灣正體中文」(Traditional Chinese, Taiwan) 進行分析及文字輸出。
        2. 僅返回一個如下格式的 JSON 對象：
        {
          "rating": "強力買入" | "買入" | "持有" | "賣出" | "強力賣出",
          "confidence": 數字 (0-100),
          "observations": 字串數組 (至少3個關鍵技術觀察點),
          "strategy_alignment": 字串 (說明分析結果如何符合所選策略),
          "risk_warning": 字串 (需要注意的關鍵風險點)
        }`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { text: systemPrompt },
                    { inlineData: { mimeType: selectedFile.type, data: base64Image.split(',')[1] } }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const result = JSON.parse(response.text);
        displayResults(result, strategyName);

    } catch (error) {
        console.error("Analysis failed:", error);
        alert(error.message || "分析系統離線。請檢查網路連接或 API 額度。");
        welcomeMsg.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

function displayResults(data, strategy) {
    analysisContent.classList.remove('hidden');
    
    // Set colors based on rating
    const ratingLower = data.rating.toLowerCase();
    if (ratingLower.includes('買入')) {
        ratingBadge.style.color = '#22C55E';
    } else if (ratingLower.includes('賣出')) {
        ratingBadge.style.color = '#EF4444';
    } else {
        ratingBadge.style.color = '#8E9299';
    }

    ratingBadge.innerText = data.rating;
    resConfidence.innerText = `${data.confidence}%`;
    resStrategy.innerText = strategy;
    
    // Clear and fill observations
    resObservations.innerHTML = '';
    data.observations.forEach(obs => {
        const li = document.createElement('li');
        li.innerText = obs;
        resObservations.appendChild(li);
    });

    resRisk.innerText = data.risk_warning;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
