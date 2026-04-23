# 🚀 量子 AI K 線策略分析助手 (Quantum AI K-Line Analyzer)

[![GitHub License](https://img.shields.io/github/license/username/repo)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Deployed%20on-GitHub%20Pages-blue?logo=github)](https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/)

這是一個強大的、純前端的 K 線分析工具。結合了 Google Gemini AI 的視覺辨識能力與量化交易邏輯，讓交易者能夠針對自訂策略對圖表進行深度解析。

### 🌐 在線直接開啟
👉 **[點此進入應用程序](https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/)**

---

## ✨ 核心特色

- **🧠 自訂策略分析**：輸入您的交易心法（如：支撐壓力、指標共振、派發回收），AI 將嚴格按照邏輯審查圖表。
- **📸 視覺化圖表辨識**：直接上傳 K 線截圖，AI 自動識別趨勢、K 線型態與指標狀態。
- **📊 多維度量化評分**：從趨勢強度、指標契合、勝率估算等 5 個維度提供直觀的數據面板。
- **📜 策略歷史記錄**：自動儲存您的草稿與分析歷史，方便隨時追蹤。
- **🔒 隱私與安全**：100% 純前端運行，API Key 儲存在您的本地瀏覽器，不會上傳至任何私有伺服器。

## 🛠️ 使用指南

1. **取得 API Key**：前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 免費申請 Gemini API Key。
2. **設定應用程式**：
   - 開啟網頁後，點擊右上角的 **「⚙️ API 設定」**。
   - 貼上您的金鑰並儲存。
3. **開始分析**：
   - 上傳您的 K 線圖表截圖 (PNG/JPG)。
   - 在左側輸入您的交易策略步驟。
   - 點擊「啟動 AI 深度分析」。

## 💻 技術棧

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS (v4)
- **Animation**: Motion (Framer Motion)
- **AI Integration**: Google GenAI SDK (Gemini 3.0/2.0)
- **Charts**: Recharts (Radar Chart)
- **Streaming**: Smooth Markdown Rendering

---

## 🏗️ 如何本地運行

如果您想在自己的電腦上執行或修改此專案：

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置靜態檔案 (部署用)
npm run build
```

## 📄 授權協議
本專案採用 MIT License。您可以自由地進行修改、傳播與商業使用。

---

*注意：本工具之分析結果僅供教學與研究參考，不構成任何投資建議。交易有風險，請謹慎評估。*
