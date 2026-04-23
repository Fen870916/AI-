/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Upload, 
  Settings2, 
  History, 
  Save, 
  Trash2, 
  Play, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// Using the system-provided GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Strategy {
  id: string;
  name: string;
  content: string;
  date: string;
}

interface AnalysisResult {
  markdown: string;
  scores: {
    trend: number;
    indicators: number;
    winrate: number;
    risk: number;
    strategy: number;
  };
}

export default function App() {
  const [strategy, setStrategy] = useState('');
  const [history, setHistory] = useState<Strategy[]>([]);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('trading_strategy_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedDraft = localStorage.getItem('trading_strategy_draft');
    if (savedDraft) setStrategy(savedDraft);
  }, []);

  // Sync draft to localStorage
  useEffect(() => {
    localStorage.setItem('trading_strategy_draft', strategy);
  }, [strategy]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setBase64Image(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const saveCurrentStrategy = () => {
    if (!strategy.trim()) return;
    const name = prompt('Enter a name for this strategy:', `Strategy ${new Date().toLocaleDateString()}`);
    if (!name) return;

    const newStrategy: Strategy = {
      id: crypto.randomUUID(),
      name,
      content: strategy,
      date: new Date().toISOString()
    };

    const newHistory = [newStrategy, ...history];
    setHistory(newHistory);
    localStorage.setItem('trading_strategy_history', JSON.stringify(newHistory));
  };

  const loadStrategy = (s: Strategy) => {
    setStrategy(s.content);
  };

  const deleteStrategy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(s => s.id !== id);
    setHistory(newHistory);
    localStorage.setItem('trading_strategy_history', JSON.stringify(newHistory));
  };

  const runAnalysis = async () => {
    if (!base64Image) {
      setError("Please upload a K-line chart image.");
      return;
    }
    if (!strategy.trim()) {
      setError("Please provide a trading strategy.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: {
          parts: [
            { text: `你是一位頂尖的量化交易員與技術分析專家。

任務一：根據以下交易策略分析提供的 K 線圖表：
---
${strategy}
---

請提供一份「直觀、高行動力」的分析報告，使用繁體中文（台灣用語）。內容必須結構化且讓交易者能「秒懂」當前機會。

報告結構如下：
1. **【市場動作建議】**：(大字標題：強烈買入 / 買入 / 觀望 / 賣出 / 強烈賣出)
2. **【核心訊號解析】**：簡述圖表是否符合策略條件（使用勾選符號 ✅ 或 ❌）。
3. **【交易執行計畫】**：
   - 入場區間：
   - 止損價位：
   - 止盈目標 (TP1/TP2)：
   - 預期損益比：
4. **【關鍵風險提示】**：當前最需要注意的一個反轉訊號或外部因素。

任務二：將分析結果量化為 5 個維度 (0-100)。
在回覆的最末端，必須嚴格包含以下 JSON 區塊（不要包含在 Markdown 程式碼區塊內）：
[[SCORE_START]]
{"trend": 0, "indicators": 0, "winrate": 0, "risk": 0, "strategy": 0}
[[SCORE_END]]

評分標準：
- trend: 當前趨勢的強度
- indicators: 技術指標在圖中的共振程度
- winrate: 此型態歷史統計的勝率估算
- risk: 風險報酬比的優劣（100 代表風報比極佳）
- strategy: 實際圖表與使用者輸入策略的契合度` },
            { 
              inlineData: { 
                mimeType: "image/png", 
                data: base64Image 
              } 
            }
          ]
        }
      });

      const text = response.text || '';
      const scoreMatch = text.match(/\[\[SCORE_START\]\]([\s\S]*)\[\[SCORE_END\]\]/);
      
      let scores = { trend: 0, indicators: 0, winrate: 0, risk: 0, strategy: 0 };
      let cleanMarkdown = text;

      if (scoreMatch) {
        try {
          scores = JSON.parse(scoreMatch[1].trim());
          cleanMarkdown = text.replace(/\[\[SCORE_START\]\]([\s\S]*)\[\[SCORE_END\]\]/, '').trim();
        } catch (e) {
          console.error("Failed to parse scores", e);
        }
      }

      setAnalysis({
        markdown: cleanMarkdown,
        scores
      });

      // Scroll to top of results
      setTimeout(() => resultEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to AI service. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = analysis ? [
    { subject: '趨勢強度', A: analysis.scores.trend, fullMark: 100 },
    { subject: '指標契合', A: analysis.scores.indicators, fullMark: 100 },
    { subject: '進場勝率', A: analysis.scores.winrate, fullMark: 100 },
    { subject: '風險評級', A: analysis.scores.risk, fullMark: 100 },
    { subject: '策略完成', A: analysis.scores.strategy, fullMark: 100 },
  ] : [];

  return (
    <div className="h-screen w-screen flex flex-col bg-bg text-text-main font-sans overflow-hidden">
      {/* Header */}
      <header className="h-[64px] border-b border-border flex items-center justify-between px-6 bg-surface/80 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-accent-blue to-accent rounded shadow-[0_0_10px_rgba(59,130,246,0.2)]" />
          <span className="font-bold text-lg tracking-tight uppercase">QUANTUM ANALYTICS</span>
        </div>

        <div className="flex items-center gap-6 text-[12px]">
          <div className="flex items-center gap-2 text-accent font-semibold tracking-wide uppercase">
            <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_var(--color-accent)] animate-pulse" />
            AI ENGINE: ACTIVE
          </div>
          <span className="text-text-dim">|</span>
          <div className="relative group/model">
            <div className="flex items-center gap-2 cursor-pointer hover:text-accent-blue transition-colors">
              <span className="font-mono uppercase">MODEL: {selectedModel.split('-').slice(0, 3).join(' ')}</span>
              <ChevronDown size={12} className="text-text-dim" />
            </div>
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded shadow-2xl z-50 hidden group-hover/model:block overflow-hidden">
              {[
                { label: 'GEMINI 3.0 FLASH', value: 'gemini-3-flash-preview' },
                { label: 'GEMINI 2.0 FLASH', value: 'gemini-2.0-flash-exp' },
                { label: 'GEMINI 1.5 FLASH', value: 'gemini-flash-latest' }
              ].map(m => (
                <div 
                  key={m.value}
                  onClick={() => setSelectedModel(m.value)}
                  className={`p-3 text-[11px] font-mono hover:bg-bg cursor-pointer border-b border-border last:border-0 transition-colors ${selectedModel === m.value ? 'text-accent-blue bg-bg/50' : 'text-text-main'}`}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          <span className="text-text-dim">|</span>
          <div className="text-text-dim font-mono">API: ••••••••••••4920</div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-[380px_1fr] bg-border overflow-hidden gap-[1px]">
        {/* Left Side: Input Panel */}
        <section className="bg-bg flex flex-col h-full overflow-hidden">
          <div className="h-[52px] px-5 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-[12px] font-bold text-text-dim tracking-widest uppercase">Strategy & Input</span>
            <span className="text-[10px] text-accent-blue font-mono">V1.0.4-STABLE</span>
          </div>

          <div className="flex-1 flex flex-col p-5 gap-6 overflow-y-auto">
            {/* Strategy Editor */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-text-dim tracking-widest uppercase">Core Trading Logic</label>
                <div className="flex gap-2">
                  <button onClick={saveCurrentStrategy} className="p-1 hover:text-accent-blue text-text-dim transition-colors" title="Save Strategy">
                    <Save size={14} />
                  </button>
                  <div className="relative group/history">
                    <button className="p-1 hover:text-accent-blue text-text-dim transition-colors">
                      <History size={14} />
                    </button>
                    <div className="absolute left-0 top-full mt-1 w-64 bg-surface border border-border rounded shadow-2xl z-50 hidden group-hover/history:block overflow-hidden">
                      <div className="p-2 border-b border-border bg-bg/50 text-[10px] font-bold text-text-dim uppercase tracking-wider">Historical Versions</div>
                      <div className="max-h-60 overflow-y-auto">
                        {history.length === 0 ? (
                          <div className="p-4 text-xs text-text-dim text-center">No stored strategies</div>
                        ) : (
                          history.map(s => (
                            <div key={s.id} onClick={() => loadStrategy(s)} className="p-3 hover:bg-bg cursor-pointer border-b border-border flex items-center justify-between group/item">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs truncate font-medium text-text-main">{s.name}</span>
                                <span className="text-[9px] text-text-dim">{new Date(s.date).toLocaleDateString()}</span>
                              </div>
                              <button onClick={(e) => deleteStrategy(s.id, e)} className="text-text-dim hover:text-red-400 p-1 transition-opacity">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <textarea 
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="IF EMA(20) CROSS ABOVE EMA(50)..."
                spellCheck="false"
                className="w-full h-80 bg-surface border border-border rounded-lg p-3 text-[13px] font-mono text-slate-400 outline-none focus:border-accent-blue transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Upload Area */}
            <div className="flex flex-col gap-2 shrink-0">
              <label className="text-[11px] font-bold text-text-dim tracking-widest uppercase">K-Line Chart Feed</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`h-[140px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 bg-surface cursor-pointer hover:border-accent-blue transition-all group overflow-hidden ${imagePreview ? 'border-accent/50' : 'border-border'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img src={imagePreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center bg-bg/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="text-white" size={24} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl transition-transform group-hover:scale-110">📈</div>
                    <div className="text-[12px] text-text-dim font-medium">Click to upload analysis target</div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={runAnalysis}
              disabled={isLoading}
              className="mt-auto bg-accent-blue hover:brightness-110 disabled:brightness-50 text-white border-none py-4 rounded-lg font-bold text-[14px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-accent-blue/10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span className="font-mono tracking-widest">EXECUTING QUANT ANALYSIS...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">EXECUTE QUANT ANALYSIS</span>
                  <span className="opacity-70">⚡</span>
                </>
              )}
            </button>
            
            {error && (
              <div className="p-3 bg-red-900/10 border border-red-800/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0" size={14} />
                <p className="text-[11px] text-red-200">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Intelligence Report Panel */}
        <section className="bg-[#111113] flex flex-col h-full overflow-hidden">
          <div className="h-[52px] px-5 border-b border-border flex items-center justify-between shrink-0 bg-bg/50">
            <span className="text-[12px] font-bold text-text-dim tracking-widest uppercase">Intelligence Report</span>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-red-500/80 rounded-[2px]" />
              <div className="w-3 h-3 bg-amber-500/80 rounded-[2px]" />
              <div className="w-3 h-3 bg-emerald-500/80 rounded-[2px]" />
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto scroll-smooth">
            <AnimatePresence mode="wait">
              {!analysis && !isLoading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6"
                >
                  <BarChart3 size={80} className="text-text-dim" strokeWidth={1} />
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold tracking-[0.2em] text-text-main">READY FOR SCAN</h3>
                    <p className="text-[11px] text-text-dim font-mono tracking-widest uppercase">UPLINK ESTABLISHED. WAITING FOR DATA INGESTION.</p>
                  </div>
                </motion.div>
              ) : null}

              {isLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center gap-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 border-[3px] border-accent-blue/10 border-t-accent-blue rounded-full animate-spin" />
                    <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-blue animate-pulse" size={24} fill="currentColor" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[10px] font-bold text-accent-blue tracking-[0.3em] uppercase animate-pulse">Decoding Telemetry...</p>
                    <p className="text-text-dim text-[11px] italic">正在同步多維度市場數據</p>
                  </div>
                </motion.div>
              ) : null}

              {analysis && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface border border-border rounded-xl p-8 shadow-2xl relative"
                >
                  <div ref={resultEndRef} className="absolute -top-40" />
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-10">
                    {/* Report Text */}
                    <div className="prose prose-invert max-w-none text-slate-300">
                      <ReactMarkdown>{analysis.markdown}</ReactMarkdown>
                      <div className="mt-10 pt-6 border-t border-border flex items-center gap-4 text-[11px] text-text-dim italic leading-relaxed">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>QUANTUM ANALYTICS MODELS FOR EXPERIMENTAL USE ONLY. TRADING INVOLVES SIGNIFICANT RISK.</span>
                      </div>
                    </div>

                    {/* Quantitative Sidebar */}
                    <div className="flex flex-col items-center shrink-0 pt-2 lg:pt-0">
                      <span className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] mb-6">Quantitative Score</span>
                      
                      <div className="h-56 w-56 mb-8 bg-bg/30 rounded-full p-2 border border-border/50">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="#27272a" strokeDasharray="3" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }} />
                            <Radar
                              name="Analysis"
                              dataKey="A"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.25}
                              strokeWidth={2}
                              animationDuration={1500}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="w-full grid grid-cols-2 gap-3">
                        {[
                          { label: '趨勢強度', value: `${analysis.scores.trend}%`, color: 'text-accent' },
                          { label: '勝率預估', value: `${analysis.scores.winrate}%`, color: 'text-accent' },
                          { label: '風險評析', value: analysis.scores.risk > 70 ? '穩定' : analysis.scores.risk > 40 ? '中性' : '警示', color: analysis.scores.risk > 70 ? 'text-accent' : analysis.scores.risk > 40 ? 'text-amber-400' : 'text-red-400' },
                          { label: '策略適配', value: `${analysis.scores.strategy}%`, color: 'text-accent' },
                        ].map((item) => (
                          <div key={item.label} className="bg-bg/60 border border-border p-3 rounded-lg flex flex-col gap-1 transition-colors hover:border-accent-blue/30">
                            <span className="text-[10px] uppercase font-bold text-text-dim tracking-tight">{item.label}</span>
                            <span className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-[32px] bg-surface border-t border-border flex items-center justify-between px-5 text-[10px] text-text-dim font-mono tracking-wider shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            SYSTEM LOG: READY...
          </span>
          <span>INGRESS_PORT: 3000</span>
          <span>EPOCH: {Math.floor(Date.now() / 1000)}</span>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex gap-4">
            <span className="hover:text-text-main transition-colors cursor-help">LATENCY: 42ms</span>
            <span className="text-border">|</span>
            <span className="hover:text-text-main transition-colors cursor-help">REGION: ASIA-NORTHEAST-1</span>
          </div>
          <div className="bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">STABLE</div>
        </div>
      </footer>
    </div>
  );
}
