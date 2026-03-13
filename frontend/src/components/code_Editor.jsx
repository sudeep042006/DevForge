import React, { useState, useEffect } from 'react';
import { FileCode2, Play, Download, Settings, Loader2, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';
import axios from 'axios';

export default function CodeEditor({ initialCode, onCodeChange }) {
  // If imported code was passed down, use it; otherwise use default template.
  const [code, setCode] = useState(initialCode || '// Welcome to the DevForge Editor\n// Logic flows from here.\n\nfunction calculateDiscount(price, discount) {\n  if(price < 0) return 0;\n  let finalPrice = price - (price * discount);\n  return finalPrice;\n}\n\ncalculateDiscount(100, 0.2);');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // When initialCode prop changes (like from a file import), update the editor
  useEffect(() => {
    if (initialCode !== null && initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleEditorChange = (e) => {
      setCode(e.target.value);
      if (onCodeChange) onCodeChange(); // Reset imported code state in parent if user edits
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Pointing to Node.js Gateway
      const res = await axios.post('http://localhost:5000/api/scans/analyze', {
        codeSnippet: code,
        fileName: 'imported_script.js'
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
        <div className="flex gap-2">
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
            {isAnalyzing ? 'Analyzing AI...' : 'Analyze Code'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
         {/* Editor Section */}
         <div className="flex-1 bg-bg-primary border border-border-primary shadow-sm rounded-xl flex flex-col overflow-hidden relative group font-mono">
            {/* File Tabs */}
            <div className="flex bg-bg-secondary border-b border-border-primary text-sm shrink-0">
               <div className="px-4 py-2 bg-bg-primary text-accent border-r border-border-primary flex items-center gap-2 font-medium border-t-2 border-t-accent">
                 <FileCode2 size={14} /> workspace.js
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
               <p className="text-xs text-text-muted mt-1">Metrics & vulnerabilities from Flask ML Model.</p>
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
                    <span className="text-sm font-medium">Forwarding via Node.js Gateway...</span>
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
                    {/* Risk Score */}
                    <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex justify-between items-center group hover:border-accent transition-colors">
                      <div>
                         <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Risk Score</p>
                         <p className="text-3xl font-bold mt-1 group-hover:text-accent transition-colors">
                           {analysisResult.riskScore} <span className="text-sm text-text-muted font-normal">%</span>
                         </p>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex justify-center items-center font-bold text-white shadow-inner \${
                        analysisResult.riskScore > 80 ? 'bg-rose-500' : analysisResult.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                         {analysisResult.riskScore > 50 ? 'HIGH' : 'LOW'}
                      </div>
                    </div>

                    {/* Bugs Detected via LLM */}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <ShieldAlert size={14} className="text-amber-500" /> Detected Vulnerabilities 
                        ({analysisResult.detectedBugs?.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {analysisResult.detectedBugs?.map((bug, i) => (
                           <div key={i} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm hover:bg-amber-500/10 transition-colors">
                              <p className="font-medium text-amber-500/90 mb-1">{bug.bugType} Bug</p>
                              <p className="text-text-secondary leading-relaxed">{bug.description}</p>
                              {bug.lineNumbers && bug.lineNumbers.length > 0 && (
                                <p className="text-xs text-text-muted mt-2 font-mono">Lines: {bug.lineNumbers.join(', ')}</p>
                              )}
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Fixes */}
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
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
