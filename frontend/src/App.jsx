import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, History as HistoryIcon, FileCode2, GitCompare, Moon, Sun, Monitor, Menu, FolderOpen, Upload, X, TerminalSquare, Search, Plus, Trash2, Github } from 'lucide-react';
import { gsap } from 'gsap';
import axios from 'axios';
import Dashboard from '../pages/dashboard';
import History from './components/History';
import DiffViewer from './components/Diff_Viewer';
import CodeEditor from './components/code_Editor';
import RepoAnalyzer from './components/RepoAnalyzer';

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); 
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // File Upload State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importedCode, setImportedCode] = useState(null);
  
  // Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([
     "> DevForge Initialized.",
     "> Waiting for user commands..."
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  // Refs for GSAP
  const modalRef = useRef(null);
  const modalOverlayRef = useRef(null);
  const terminalRef = useRef(null);

  // Apply theme to document globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global Keyboard listener for Ctrl+J (Terminal Toggle)
  useEffect(() => {
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
            e.preventDefault();
            setIsTerminalOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // GSAP Modal Animations
  useEffect(() => {
    if (isModalOpen) {
      gsap.fromTo(modalOverlayRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(modalRef.current, 
        { y: -50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)', delay: 0.1 }
      );
    }
  }, [isModalOpen]);

  // GSAP Terminal Slide Animations
  useEffect(() => {
    if (isTerminalOpen && terminalRef.current) {
        gsap.fromTo(terminalRef.current,
           { height: 0, opacity: 0 },
           { height: 250, opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
    }
  }, [isTerminalOpen]);

  // Terminal submission handler
  const handleTerminalSubmit = async (e) => {
      if (e.key === 'Enter' && terminalInput.trim() !== '') {
          const command = terminalInput.trim();
          setTerminalOutput(prev => [...prev, `> ${command}`]);
          setTerminalInput('');

          // Built-in client-side commands
          if (command === 'clear') {
              setTerminalOutput([]);
              return;
          }

          if (command === 'help') {
              setTerminalOutput(prev => [...prev, 
                'Available commands:',
                '  clear        - Clear terminal',
                '  help         - Show this help',
                '  fetch <entity> - Fetch from API (projects, codes, repos, plans, solutions, debugs)',
                '  Any other command is executed as a shell command on the server',
                '  Examples: echo hello, dir, node -v, python --version'
              ]);
              return;
          }

          // Handle 'fetch' command via API
          const cmdParts = command.split(' ');
          if (cmdParts[0] === 'fetch') {
              const entity = cmdParts[1] || 'projects';
              try {
                  const res = await axios.get(`http://localhost:5000/api/core/${entity}`);
                  setTerminalOutput(prev => [...prev, `Fetched ${res.data.data.length} ${entity}.`, JSON.stringify(res.data.data, null, 2)]);
              } catch (err) {
                  setTerminalOutput(prev => [...prev, `Error: ${err.message}. Endpoints available: projects, codes, repos, plans, solutions, debugs.`]);
              }
              return;
          }

          // Execute real shell command via backend
          try {
              const res = await axios.post('http://localhost:5000/api/terminal/execute', {
                  command: command,
                  cwd: 'D:\\RSOC'
              });
              
              const { output, stderr, exitCode } = res.data;
              
              if (output && output.trim()) {
                  // Split output into lines for proper display
                  output.trim().split('\n').forEach(line => {
                      setTerminalOutput(prev => [...prev, line]);
                  });
              }
              if (stderr && stderr.trim()) {
                  stderr.trim().split('\n').forEach(line => {
                      setTerminalOutput(prev => [...prev, `Error: ${line}`]);
                  });
              }
              if (exitCode && exitCode !== 0) {
                  setTerminalOutput(prev => [...prev, `Process exited with code ${exitCode}`]);
              }
          } catch (err) {
              const errorMsg = err.response?.data?.error || err.message;
              setTerminalOutput(prev => [...prev, `Error: ${errorMsg}`]);
          }
      }
  };

  const closeModal = () => {
    gsap.to(modalRef.current, { 
      y: 30, opacity: 0, scale: 0.95, duration: 0.3, ease: 'power2.in' 
    });
    gsap.to(modalOverlayRef.current, { 
      opacity: 0, duration: 0.3, delay: 0.1, ease: 'power2.in',
      onComplete: () => setIsModalOpen(false) 
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('codeFile', file);

    try {
      const response = await fetch('http://localhost:5000/api/analyze/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok) {
        setImportedCode(data.codeSnippet);
        setActiveTab('editor'); 
        closeModal();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Failed to connect to the backend server for file processing.');
    }
  };


  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'repo', label: 'Repo Analyzer', icon: <Github size={18} /> },
    { id: 'editor', label: 'Code Editor', icon: <FileCode2 size={18} /> },
    { id: 'diff', label: 'Diff Viewer', icon: <GitCompare size={18} /> },
    { id: 'history', label: 'History Logs', icon: <HistoryIcon size={18} /> },
  ];

  const themes = [
    { id: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { id: 'grey', label: 'Grey', icon: <Monitor size={14} /> },
    { id: 'white', label: 'Light', icon: <Sun size={14} /> },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'repo': return <RepoAnalyzer />;
      case 'history': return <History />;
      case 'diff': return <DiffViewer />;
      case 'editor': return <CodeEditor initialCode={importedCode} onCodeChange={() => setImportedCode(null)} />;
      default: return <CodeEditor />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-bg-primary text-text-primary overflow-hidden font-sans transition-colors duration-300 antialiased selection:bg-accent/30">
      
      {/* ----------------- TOP MENU BAR ----------------- */}
      <header className="h-10 shrink-0 bg-bg-secondary border-b border-border-primary flex items-center px-4 z-30 select-none text-sm">
         <div className="flex items-center gap-2 mr-6 text-accent font-bold tracking-tight">
            <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center border border-accent/40">
               <span className="text-accent text-xs">d</span>
            </div>
            DevForge
         </div>
         
         <nav className="flex items-center h-full">
            <div className="group relative h-full flex items-center px-3 hover:bg-bg-tertiary cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
               <span>File</span>
               <div className="absolute top-full left-0 w-48 bg-bg-secondary border border-border-primary shadow-xl rounded-b-lg hidden group-hover:flex flex-col py-1 z-50">
                  <div onClick={() => setIsModalOpen(true)} className="px-4 py-2 hover:bg-bg-hover flex justify-between items-center text-text-primary">
                     <span>Open File...</span>
                     <span className="text-xs text-text-muted">Ctrl+O</span>
                  </div>
                  <div className="h-px bg-border-primary my-1 w-full scale-y-50"></div>
                  <div className="px-4 py-2 hover:bg-bg-hover flex justify-between items-center text-rose-500">
                     <span>Exit</span>
                  </div>
               </div>
            </div>
            <div className="h-full flex items-center px-3 hover:bg-bg-tertiary cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
               <span>Edit</span>
            </div>
            <div className="h-full flex items-center px-3 hover:bg-bg-tertiary cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
               <span>View</span>
            </div>
            
            {/* Terminal Toggle Trigger Menu */}
            <div className="group relative h-full flex items-center px-3 hover:bg-bg-tertiary cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
               <span>Terminal</span>
               <div className="absolute top-full left-0 w-48 bg-bg-secondary border border-border-primary shadow-xl rounded-b-lg hidden group-hover:flex flex-col py-1 z-50">
                  <div onClick={() => setIsTerminalOpen(prev => !prev)} className="px-4 py-2 hover:bg-bg-hover flex justify-between items-center text-text-primary">
                     <span>Toggle Terminal</span>
                     <span className="text-xs text-text-muted">Ctrl+J</span>
                  </div>
               </div>
            </div>
         </nav>

         <div className="ml-auto flex items-center space-x-1">
             {themes.map((t) => (
               <button
                 key={t.id}
                 onClick={() => setTheme(t.id)}
                 title={t.label}
                 className={`p-1.5 rounded transition-colors \${
                   theme === t.id ? 'bg-bg-tertiary text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                 }`}
               >
                 {t.icon}
               </button>
             ))}
         </div>
      </header>

      {/* ----------------- MAIN LAYOUT ----------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`\${isSidebarOpen ? 'w-56' : 'w-14'} shrink-0 flex flex-col bg-bg-secondary border-r border-border-primary transition-all duration-300 relative z-20`}>
          <div className="h-12 flex items-center justify-between px-3 border-b border-border-primary/50">
            {isSidebarOpen && <span className="font-semibold text-xs text-text-muted uppercase tracking-widest pl-1">Explorer</span>}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-focus ml-auto"
            >
              <Menu size={16} />
            </button>
          </div>

          <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-2 transition-all duration-200 group relative overflow-hidden \${
                  activeTab === item.id 
                    ? 'text-accent font-medium bg-accent/5' 
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                {activeTab === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                )}
                <div className={`flex-shrink-0 relative z-10 transition-colors \${activeTab === item.id ? 'text-accent' : 'group-hover:text-text-primary'}`}>
                  {item.icon}
                </div>
                {isSidebarOpen && (
                  <span className="ml-3 truncate relative z-10 text-sm">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-hidden relative bg-bg-primary custom-scrollbar z-10 flex flex-col">
          <div className="flex-1 relative z-10 h-full overflow-hidden flex flex-col bg-bg-primary">
            {renderContent()}
          </div>
          
          {/* ----------------- TERMINAL PANEL (Slide up/down) ----------------- */}
          {isTerminalOpen && (
              <div 
                ref={terminalRef}
                className="shrink-0 bg-[#0d0d0d] border-t border-border-primary flex flex-col will-change-transform z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                style={{ height: '250px' }}
              >
                 {/* Terminal Header */}
                 <div className="h-9 shrink-0 flex items-center justify-between px-4 border-b border-[#222]">
                    <div className="flex space-x-4 h-full">
                       <button className="h-full px-2 text-xs font-semibold text-text-primary border-b-2 border-accent transition-colors flex items-center gap-2 uppercase tracking-wide">
                          <TerminalSquare size={14} className="text-accent" /> Terminal
                       </button>
                       <button className="h-full px-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 uppercase tracking-wide">
                          Output
                       </button>
                       <button className="h-full px-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 uppercase tracking-wide">
                          Debug Console
                       </button>
                    </div>
                    <div className="flex space-x-1">
                        <button className="p-1 hover:bg-[#222] rounded text-text-muted hover:text-text-primary transition-colors">
                            <Plus size={14} />
                        </button>
                        <button onClick={() => setTerminalOutput([])} className="p-1 hover:bg-[#222] rounded text-text-muted hover:text-text-primary transition-colors" title="Clear Panel">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={() => setIsTerminalOpen(false)} className="p-1 hover:bg-[#222] rounded text-text-muted hover:text-text-primary transition-colors ml-2">
                            <X size={14} />
                        </button>
                    </div>
                 </div>

                 {/* Terminal Content Area */}
                 <div className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed custom-scrollbar bg-[#0d0d0d]">
                    {terminalOutput.map((line, idx) => (
                        <div key={idx} className={`${line.includes('Error') ? 'text-rose-400' : line.includes('Fetched') ? 'text-emerald-400' : 'text-zinc-300'}`}>
                           {line}
                        </div>
                    ))}
                    <div className="flex items-center text-zinc-300 mt-1">
                       <span className="text-emerald-500 mr-2 font-bold">PS D:\RSOC\DevForge&gt;</span>
                       <input 
                          type="text" 
                          className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-zinc-300 shadow-none font-mono placeholder:text-zinc-600"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyDown={handleTerminalSubmit}
                          placeholder="Type 'fetch projects'..."
                          autoFocus
                       />
                    </div>
                 </div>
              </div>
          )}
        </main>
      </div>

      {/* ----------------- GSAP IMPORT MODAL ----------------- */}
      {isModalOpen && (
        <div 
          ref={modalOverlayRef}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            ref={modalRef}
            className="bg-bg-secondary border border-border-primary shadow-2xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col will-change-transform"
          >
            <div className="px-6 py-4 border-b border-border-primary flex justify-between items-center bg-bg-tertiary">
               <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                 <FolderOpen size={20} className="text-accent" /> Import Code File
               </h3>
               <button onClick={closeModal} className="text-text-muted hover:text-rose-500 transition-colors rounded-full p-1 hover:bg-rose-500/10">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-8">
               <label 
                 htmlFor="file-upload" 
                 className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border-focus rounded-xl cursor-pointer bg-bg-primary hover:bg-bg-hover hover:border-accent transition-all duration-300 group"
               >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                     <div className="w-16 h-16 mb-4 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                       <Upload size={32} className="text-accent" />
                     </div>
                     <p className="mb-2 text-sm text-text-secondary">
                        <span className="font-semibold text-text-primary">Click to upload</span> or drag and drop
                     </p>
                     <p className="text-xs text-text-muted text-center tracking-wide">
                        .JS, .PY, .TS, .JSX, .HTML
                     </p>
                  </div>
                  <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
               </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
