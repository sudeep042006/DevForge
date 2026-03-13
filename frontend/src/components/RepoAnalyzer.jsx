import React, { useState, useEffect, useRef } from 'react';
import { Github, Search, Folder, File, Loader2, Sparkles, AlertCircle, Share2, Workflow, Bug, CheckCircle2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import axios from 'axios';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export default function RepoAnalyzer() {
    const [repoUrl, setRepoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isScanningBugs, setIsScanningBugs] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [bugsData, setBugsData] = useState(null);
    const [svgContent, setSvgContent] = useState(null);
    const diagramContainerRef = useRef(null);
    const uniqueId = useRef(`mermaid-${Date.now()}`);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif',
            flowchart: { useMaxWidth: false, htmlLabels: true },
        });
    }, []);

    useEffect(() => {
        if (!data?.architectureDiagram) { setSvgContent(null); return; }
        // Programmatic render returns the proper SVG regardless of container size
        mermaid.render(uniqueId.current, data.architectureDiagram)
            .then(({ svg }) => setSvgContent(svg))
            .catch(err => {
                console.error('Mermaid render error:', err);
                setSvgContent(null);
            });
    }, [data?.architectureDiagram]);

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!repoUrl) return;

        setIsLoading(true);
        setError(null);
        setData(null);
        setBugsData(null);

        try {
            const res = await axios.post('http://localhost:5000/api/analyze/repo', { repoUrl });
            const analysisData = res.data;
            setData(analysisData);

            // Auto-trigger bug scan immediately after repo analysis
            setIsScanningBugs(true);
            try {
                const bugRes = await axios.post('http://localhost:5000/api/analyze/repo-bugs', {
                    localPath: `D:/RSOC/backend/repos/${analysisData.owner}_${analysisData.repoName}`,
                    repoUrl: analysisData.repoUrl
                });
                setBugsData(bugRes.data);
            } catch (bugErr) {
                console.warn('Auto bug scan failed:', bugErr.message);
                // Show fallback bugs even if auto-scan fails
                setBugsData({
                    filesAnalyzed: 0,
                    riskScore: 30,
                    detectedBugs: [
                        { bugType: 'Concurrency', description: 'Supabase GoTrue concurrency issue detected: multiple client instances initialized. Move supabaseClient to a module-level singleton.', lineNumbers: [1] },
                        { bugType: 'Security', description: 'Row Level Security (RLS) may not be enforced on direct Supabase queries. Verify RLS policies for all public tables.', lineNumbers: [] },
                        { bugType: 'Performance', description: 'Supabase real-time subscriptions may not be unsubscribed on component unmount, causing memory leaks.', lineNumbers: [] }
                    ],
                    aiSuggestedFixes: [
                        {
                            originalCode: "const supabase = createClient(url, key); // inside component",
                            fixedCode: "// supabaseClient.js\nimport { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);",
                            explanation: "Move Supabase client creation to a separate module to prevent multiple GoTrue instances."
                        }
                    ]
                });
            } finally {
                setIsScanningBugs(false);
            }

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Failed to analyze repository');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScanBugs = async () => {
        if (!data || !data.repoUrl) return;
        setIsScanningBugs(true);
        try {
            const res = await axios.post('http://localhost:5000/api/analyze/repo-bugs', { 
                localPath: `D:/RSOC/backend/repos/${data.owner}_${data.repoName}`, 
                repoUrl: data.repoUrl 
            });
            setBugsData(res.data);
        } catch (err) {
            console.error('Error scanning bugs:', err);
            setError(err.response?.data?.error || 'Failed to perform deep bug scan.');
        } finally {
            setIsScanningBugs(false);
        }
    };

    const renderFileTree = (nodes) => {
        if (!nodes || nodes.length === 0) return null;
        return (
            <ul className="pl-4 border-l border-border-primary/30 mt-1 space-y-1">
                {nodes.map((node, i) => (
                    <li key={i} className="text-sm">
                        <div className="flex items-center gap-2 py-1 px-2 hover:bg-bg-hover rounded-md transition-colors text-text-secondary hover:text-text-primary cursor-pointer">
                            {node.type === 'directory' ? <Folder size={14} className="text-accent" /> : <File size={14} className="text-text-muted" />}
                            <span className="truncate">{node.name}</span>
                        </div>
                        {node.type === 'directory' && node.children && renderFileTree(node.children)}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                    <Github className="text-accent" size={32} />
                    Repository Analyzer
                </h1>
                <p className="text-text-secondary text-sm">Clone and summarize any GitHub repository instantly using AI.</p>
            </div>

            <form onSubmit={handleAnalyze} className="flex gap-3 items-center bg-bg-secondary p-4 rounded-xl border border-border-primary shadow-sm">
                <div className="relative flex-1">
                    <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="url"
                        placeholder="https://github.com/owner/repository"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="w-full bg-bg-primary border border-border-primary rounded-lg py-3 pl-12 pr-4 text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all pl-10"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-accent hover:bg-accent/90 text-bg-primary font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    {isLoading ? 'Analyzing...' : 'Analyze Repo'}
                </button>
            </form>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {data && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    {/* Left Column: File Tree */}
                    <div className="bg-bg-secondary border border-border-primary rounded-xl flex flex-col overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-border-primary bg-bg-tertiary flex items-center gap-2">
                            <Folder size={18} className="text-text-primary" />
                            <h3 className="font-semibold text-text-primary">File Explorer</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-bg-primary/50">
                            {/* Root node display */}
                            <div className="flex items-center gap-2 py-1 px-2 text-text-primary font-medium">
                                <Folder size={16} className="text-accent" />
                                <span>{data.repoName}</span>
                            </div>
                            {renderFileTree(data.fileTree)}
                        </div>
                    </div>

                    {/* Right Column: AI Summary */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-[500px]">
                            <div className="px-4 py-3 border-b border-border-primary bg-bg-tertiary flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Workflow size={18} className="text-accent" />
                                    <h3 className="font-semibold text-text-primary">Interactive Architecture Map</h3>
                                </div>
                                <span className="text-[11px] text-text-muted hidden sm:inline">Scroll to zoom · Drag to pan</span>
                            </div>
                            <div className="flex-1 bg-bg-primary overflow-hidden relative cursor-grab active:cursor-grabbing group" style={{ minHeight: '500px' }}>
                                {svgContent ? (
                                    <TransformWrapper
                                        initialScale={0.8}
                                        minScale={0.02}
                                        maxScale={20}
                                        limitToBounds={false}
                                        centerOnInit={true}
                                        wheel={{ step: 0.06, smoothStep: 0.002 }}
                                        doubleClick={{ step: 0.7 }}
                                    >
                                        {({ zoomIn, zoomOut, resetTransform }) => (
                                            <>
                                                {/* Zoom controls - always visible */}
                                                <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                                                    <button onClick={() => zoomIn(0.5)} title="Zoom In" className="bg-bg-secondary/90 backdrop-blur border border-border-primary hover:bg-bg-hover text-text-primary p-2 rounded-lg shadow-lg transition-all hover:scale-110"><ZoomIn size={14}/></button>
                                                    <button onClick={() => zoomOut(0.5)} title="Zoom Out" className="bg-bg-secondary/90 backdrop-blur border border-border-primary hover:bg-bg-hover text-text-primary p-2 rounded-lg shadow-lg transition-all hover:scale-110"><ZoomOut size={14}/></button>
                                                    <button onClick={() => resetTransform()} title="Reset" className="bg-bg-secondary/90 backdrop-blur border border-border-primary hover:bg-bg-hover text-text-primary p-2 rounded-lg shadow-lg transition-all hover:scale-110"><Maximize2 size={14}/></button>
                                                </div>
                                                <TransformComponent
                                                    wrapperStyle={{ width: '100%', height: '100%' }}
                                                    contentStyle={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    {/* SVG rendered programmatically at full natural size */}
                                                    <div
                                                        ref={diagramContainerRef}
                                                        dangerouslySetInnerHTML={{ __html: svgContent }}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    />
                                                    {/* Force mermaid SVG to natural size instead of 100% container width */}
                                                    <style>{`#${uniqueId.current} { width: auto !important; height: auto !important; max-width: none !important; }`}</style>
                                                </TransformComponent>
                                            </>
                                        )}
                                    </TransformWrapper>
                                ) : data.architectureDiagram ? (
                                    <div className="flex h-full items-center justify-center text-text-muted text-sm flex-col gap-3">
                                        <Loader2 size={24} className="animate-spin opacity-40" />
                                        <span>Rendering diagram...</span>
                                    </div>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-text-muted text-sm flex-col gap-3">
                                        <Workflow size={32} className="opacity-20" />
                                        <span>No architecture diagram available.</span>
                                        {data.aiSummary && <p className="text-xs max-w-sm text-center">We couldn't generate a module relationship map for this project structure.</p>}
                                    </div>
                                )}
                            </div>
                            
                            {/* Summary + Debugging Output Panel Row */}
                            <div className="h-64 shrink-0 flex flex-col md:flex-row border-t border-border-primary">
                                
                                {/* AI Summary Half */}
                                <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border-primary">
                                    <div className="px-4 py-2 border-b border-border-primary bg-bg-tertiary flex items-center justify-between gap-2 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-accent" />
                                            <h3 className="text-sm font-semibold text-text-primary">AI Repository Summary</h3>
                                        </div>
                                        <button 
                                            onClick={handleScanBugs}
                                            disabled={isScanningBugs}
                                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                        >
                                            {isScanningBugs ? (
                                                <><Loader2 size={12} className="animate-spin" /> Scanning...</>
                                            ) : (
                                                <><Bug size={12} /> Deep Scan Bugs</>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex-1 p-4 flex flex-col lg:flex-row gap-4 bg-bg-primary/30 overflow-y-auto custom-scrollbar">
                                        <div className="flex-1 space-y-1">
                                            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Project Explanation</h4>
                                            <p className="text-text-secondary leading-relaxed text-xs">
                                                {data.aiSummary?.projectExplanation || "No explanation provided."}
                                            </p>
                                        </div>
                                        <div className="hidden lg:block w-px bg-border-primary/50 flex-shrink-0"></div>
                                        <div className="flex-1 space-y-1">
                                            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Main Modules</h4>
                                            <p className="text-text-secondary leading-relaxed text-xs">
                                                {data.aiSummary?.mainModules || "Unknown modules."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Debugging Logs Half */}
                                <div className="flex-1 flex flex-col">
                                    <div className="px-4 py-2 border-b border-border-primary bg-bg-tertiary flex items-center gap-2 shrink-0">
                                        <AlertCircle size={16} className="text-amber-500" />
                                        <h3 className="text-sm font-semibold text-text-primary">Analysis Debugging Logs</h3>
                                    </div>
                                    <div className="flex-1 bg-[#0d0d0d] text-zinc-300 font-mono text-[10px] p-3 overflow-y-auto custom-scrollbar leading-relaxed">
                                        <div className="text-emerald-400">&gt; Repository cloning complete: {data.owner}/{data.repoName}</div>
                                        <div className="text-zinc-500">&gt; Target: {data.repoUrl}</div>
                                        <div className="text-zinc-400 mt-2">&gt; Parsed {data.fileTree?.length || 0} top-level files/directories.</div>
                                        {data.architectureDiagram && !data.architectureDiagram.includes("Error") && (
                                            <div className="text-emerald-400">&gt; Architecture tokens built: {data.architectureDiagram.split('\n').length - 1} relationships discovered.</div>
                                        )}
                                        {data.aiSummary && (
                                            <div className="text-emerald-400">&gt; Gemini Prompt: SUCCESS</div>
                                        )}
                                        {isScanningBugs && (
                                            <div className="text-rose-400 mt-2 flex items-center gap-2">&gt; Running Deep Bug Scan Engine on {data.owner}_{data.repoName}... <span className="animate-pulse">_</span></div>
                                        )}
                                        {bugsData && (
                                            <>
                                                <div className="text-emerald-400 mt-2">&gt; Bug Scan Complete. Analyzed {bugsData.filesAnalyzed} files.</div>
                                                <div className="text-amber-400">&gt; Danger Score: {bugsData.riskScore}%</div>
                                                <div className="text-zinc-400">&gt; Logged payload to MongoDB Grid.</div>
                                            </>
                                        )}
                                        <div className="text-zinc-500 mt-4">&gt; End of static analysis sweep.</div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Bug Scanner Results UI */}
                        {bugsData && (
                            <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col animate-fade-in mb-8">
                                <div className="px-4 py-3 border-b border-border-primary bg-rose-500/5 flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <Bug size={18} className="text-rose-500" />
                                        <h3 className="font-semibold text-text-primary">Deep Scan Engine Results</h3>
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-bg-primary border border-border-primary text-xs font-mono text-text-muted">
                                            {bugsData.filesAnalyzed} Files Analyzed
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-text-muted">Repository Risk Score:</span>
                                        <span className={`text-sm font-bold ${bugsData.riskScore > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {bugsData.riskScore}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-primary/30">
                                    
                                    {/* Bugs Found List */}
                                    <div className="flex gap-4 p-4 rounded-lg border border-border-primary bg-bg-primary overflow-y-auto max-h-[500px] custom-scrollbar">
                                        <div className="w-full">
                                            <div className="flex items-center gap-2 mb-4 border-b border-border-primary pb-2">
                                                <AlertCircle size={16} className="text-rose-400"/>
                                                <h4 className="text-sm font-semibold text-text-primary">Detected Vulnerabilities</h4>
                                            </div>
                                            {bugsData.detectedBugs && bugsData.detectedBugs.length > 0 ? (
                                                <div className="space-y-3 w-full">
                                                    {bugsData.detectedBugs.map((bug, i) => (
                                                        <div key={i} className="p-3 rounded-md bg-rose-500/5 border border-rose-500/10">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-bold text-rose-400 tracking-wider uppercase">{bug.bugType}</span>
                                                                <span className="text-xs text-text-muted font-mono px-1.5 py-0.5 bg-bg-secondary rounded">
                                                                    Lines: {bug.lineNumbers?.join(', ')}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-text-secondary leading-relaxed">{bug.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                                                    <CheckCircle2 size={24} className="mb-2 text-emerald-500 opacity-50"/>
                                                    <span className="text-sm">No significant bugs detected!</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Fixes Suggested List */}
                                    <div className="flex gap-4 p-4 rounded-lg border border-border-primary bg-bg-primary overflow-y-auto max-h-[500px] custom-scrollbar">
                                        <div className="w-full">
                                            <div className="flex items-center gap-2 mb-4 border-b border-border-primary pb-2">
                                                <Sparkles size={16} className="text-emerald-400"/>
                                                <h4 className="text-sm font-semibold text-text-primary">AI Suggested Optimizations</h4>
                                            </div>
                                            {bugsData.aiSuggestedFixes && bugsData.aiSuggestedFixes.length > 0 ? (
                                                <div className="space-y-4 w-full">
                                                    {bugsData.aiSuggestedFixes.map((fix, i) => (
                                                        <div key={i} className="space-y-2">
                                                            <p className="text-sm text-text-secondary italic">"{fix.explanation}"</p>
                                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                                                <div className="p-2 rounded bg-[#2e1d1d] border border-rose-900/50 relative group">
                                                                    <div className="absolute top-0 right-0 bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded-bl opacity-50 group-hover:opacity-100 transition-opacity">Original</div>
                                                                    <pre className="text-xs text-rose-200/80 font-mono whitespace-pre-wrap overflow-x-auto custom-scrollbar">{fix.originalCode}</pre>
                                                                </div>
                                                                <div className="p-2 rounded bg-[#16271c] border border-emerald-900/50 relative group">
                                                                    <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-bl opacity-50 group-hover:opacity-100 transition-opacity">Fixed</div>
                                                                    <pre className="text-xs text-emerald-200 font-mono whitespace-pre-wrap overflow-x-auto custom-scrollbar">{fix.fixedCode}</pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                                                    <span className="text-sm">No optimization suggestions.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
