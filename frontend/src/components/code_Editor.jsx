import React, { useState, useEffect } from 'react';
import { FileCode2, Play, Download, Settings, Loader2, AlertTriangle, ShieldAlert, Cpu, X, Globe, Bot } from 'lucide-react';
import axios from 'axios';

const DEFAULT_CODE = '// Welcome to the DevForge Editor\n// Logic flows from here.\n\nfunction calculateDiscount(price, discount) {\n  if(price < 0) return 0;\n  let finalPrice = price - (price * discount);\n  return finalPrice;\n}\n\ncalculateDiscount(100, 0.2);';

export default function CodeEditor({ initialCode, onCodeChange }) {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Analysis mode: 'api' (DeepSeek) or 'local' (ML Model)
  const [analysisMode, setAnalysisMode] = useState('local');

  // When initialCode prop changes (like from a file import), update the editor
  useEffect(() => {
    if (initialCode !== null && initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleEditorChange = (e) => {
      setCode(e.target.value);
      if (onCodeChange) onCodeChange();
  };

  // Close tab: reset to default code
  const handleCloseTab = () => {
    setCode(DEFAULT_CODE);
    setAnalysisResult(null);
    if (onCodeChange) onCodeChange();
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await axios.post('http://localhost:5000/api/scans/analyze', {
        codeSnippet: code,
        fileName: 'imported_script.js',
        analysisMode: analysisMode
      });
      setAnalysisResult(res.data);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisResult({ 
        error: error.response?.data?.details || error.message || 'Failed to connect to backend api gateway.' 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-300 overflow-hidden bg-bg-primary">
       {/* Header */}
       <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Code Editor</h1>
          <p className="text-text-secondary mt-1 text-sm text-text-muted">Write and analyze your logic.</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* ---- Analysis Mode Toggle ---- */}
          <div className="flex items-center bg-bg-secondary border border-border-primary rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setAnalysisMode('api')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                analysisMode === 'api'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-text-muted hover:text-text-secondary border border-transparent'
              }`}
              title="Use DeepSeek API for analysis"
            >
              <Globe size={13} /> API
            </button>
            <button
              onClick={() => setAnalysisMode('local')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                analysisMode === 'local'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm'
                  : 'text-text-muted hover:text-text-secondary border border-transparent'
              }`}
              title="Use local ML model for analysis (no API calls)"
            >
              <Bot size={13} /> Model
            </button>
          </div>

          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors border border-transparent hover:border-border-primary">
            <Settings size={20} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-bg-secondary text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors text-sm font-medium">
            <Download size={16} /> Export
          </button>
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors shadow-sm text-sm font-bold border 
              ${isAnalyzing 
                ? 'bg-emerald-500/50 text-white/80 cursor-not-allowed border-emerald-600/50' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-600'}`}
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
         {/* Editor Section */}
         <div className="flex-1 bg-bg-primary border border-border-primary shadow-sm rounded-xl flex flex-col overflow-hidden relative group font-mono">
            {/* File Tabs with Close Button */}
            <div className="flex bg-bg-secondary border-b border-border-primary text-sm shrink-0">
               <div className="px-4 py-2 bg-bg-primary text-accent border-r border-border-primary flex items-center gap-2 font-medium border-t-2 border-t-accent group/tab">
                 <FileCode2 size={14} /> workspace.js
                 <button 
                   onClick={handleCloseTab}
                   className="ml-2 p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-text-muted/40 opacity-0 group-hover/tab:opacity-100 transition-all duration-200"
                   title="Close file (reset editor)"
                 >
                   <X size={12} />
                 </button>
               </div>
            </div>

            {/* Code Textarea Area */}
            <div className="flex-1 flex overflow-hidden">
               {/* Line numbers */}
               <div className="w-12 shrink-0 bg-bg-secondary/50 border-r border-border-primary text-right py-4 pr-3 text-text-muted/50 select-none flex flex-col text-sm border-dashed overflow-y-hidden">
                  {code.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}
               </div>
               <textarea 
                  className="flex-1 bg-transparent text-text-primary p-4 resize-none focus:outline-none focus:ring-0 leading-relaxed text-sm overflow-y-auto whitespace-pre custom-scrollbar"
                  value={code}
                  onChange={handleEditorChange}
                  spellCheck="false"
               />
            </div>
         </div>

         {/* Results Section */}
         <div className="w-96 shrink-0 bg-bg-secondary border border-border-primary shadow-sm rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-primary bg-bg-tertiary/50">
               <h2 className="font-semibold text-text-primary flex items-center gap-2">
                 <Cpu size={18} className="text-accent" /> AI Analysis Panel
               </h2>
               <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs text-text-muted">
                   {analysisMode === 'local' 
                     ? 'Local ML Model + Static Analyzer' 
                     : 'DeepSeek API via Flask Gateway'}
                 </p>
                 <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                   analysisMode === 'local'
                     ? 'bg-purple-500/20 text-purple-400'
                     : 'bg-blue-500/20 text-blue-400'
                 }`}>
                   {analysisMode === 'local' ? 'MODEL' : 'API'}
                 </span>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-bg-primary space-y-4">
               {!analysisResult && !isAnalyzing && (
                 <div className="text-center text-text-muted mt-10 text-sm">
                    Ready to scan code. Click Analyze below to start pipeline.
                 </div>
               )}

               {isAnalyzing && (
                 <div className="flex flex-col items-center justify-center text-accent mt-10 p-4 border border-accent/20 bg-accent/5 rounded-lg">
                    <Loader2 size={32} className="animate-spin mb-3" />
                    <span className="text-sm font-medium">
                      {analysisMode === 'local' 
                        ? 'Running local ML model & static analyzer...' 
                        : 'Forwarding via Node.js Gateway...'}
                    </span>
                 </div>
               )}

               {analysisResult?.error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex gap-2 items-start">
                     <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                     <p className="font-semibold">{analysisResult.error}</p>
                  </div>
               )}

               {analysisResult && !analysisResult.error && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Analysis Mode Badge */}
                    {analysisResult.analysisMode === 'local' && (
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium flex items-center gap-2">
                        <Bot size={14} /> Analyzed using local ML model — no API calls made
                      </div>
                    )}

                    {/* Risk Score */}
                    <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex justify-between items-center group hover:border-accent transition-colors">
                      <div>
                         <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Risk Score</p>
                         <p className="text-3xl font-bold mt-1 group-hover:text-accent transition-colors">
                           {analysisResult.riskScore} <span className="text-sm text-text-muted font-normal">%</span>
                         </p>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex justify-center items-center font-bold text-white shadow-inner ${
                        analysisResult.riskScore > 80 ? 'bg-rose-500' : analysisResult.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                         {analysisResult.riskScore > 50 ? 'HIGH' : 'LOW'}
                      </div>
                    </div>

                    {/* Bugs Detected */}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <ShieldAlert size={14} className="text-amber-500" /> Detected Vulnerabilities 
                        ({analysisResult.detectedBugs?.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {analysisResult.detectedBugs?.map((bug, i) => (
                           <div key={i} className={`p-3 rounded-lg border text-sm hover:bg-opacity-10 transition-colors ${
                             bug.bugType === 'Clean' 
                               ? 'border-emerald-500/20 bg-emerald-500/5' 
                               : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                           }`}>
                              <p className={`font-medium mb-1 ${
                                bug.bugType === 'Clean' ? 'text-emerald-500/90' : 'text-amber-500/90'
                              }`}>{bug.bugType === 'Clean' ? '✅ Clean' : `${bug.bugType} Bug`}</p>
                              <p className="text-text-secondary leading-relaxed">{bug.description}</p>
                              {bug.lineNumbers && bug.lineNumbers.length > 0 && (
                                <p className="text-xs text-text-muted mt-2 font-mono">Lines: {bug.lineNumbers.join(', ')}</p>
                              )}
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Fixes */}
                    {analysisResult.aiSuggestedFixes?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-2 mt-4 text-emerald-500">AI Suggested Fixes</h3>
                      <div className="space-y-3">
                        {analysisResult.aiSuggestedFixes?.map((fix, i) => (
                           <div key={i} className="rounded-lg border border-border-primary overflow-hidden text-sm flex flex-col bg-bg-secondary">
                              <p className="text-text-primary p-3 bg-bg-tertiary font-medium">✨ {fix.explanation}</p>
                              <div className="p-3 bg-rose-500/5 text-rose-500 font-mono whitespace-pre-wrap text-xs overflow-x-auto border-y border-rose-500/10">
                                - {fix.originalCode}
                              </div>
                              <div className="p-3 bg-emerald-500/5 text-emerald-500 font-mono whitespace-pre-wrap text-xs overflow-x-auto">
                                + {fix.fixedCode}
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                    )}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
