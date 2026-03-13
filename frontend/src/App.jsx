import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, History as HistoryIcon, FileCode2, GitCompare, Moon, Sun, Monitor, Menu, FolderOpen, Upload, X } from 'lucide-react';
import { gsap } from 'gsap';
import Dashboard from '../pages/dashboard';
import History from '../components/History';
import DiffViewer from '../components/Diff_Viewer';
import CodeEditor from '../components/code_Editor';

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); // Default to editor for the IDE feel
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // File Upload State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importedCode, setImportedCode] = useState(null);
  
  // Refs for GSAP
  const modalRef = useRef(null);
  const modalOverlayRef = useRef(null);

  // Apply theme to document globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // GSAP Modal Animations
  useEffect(() => {
    if (isModalOpen) {
      // Animate In
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

  const closeModal = () => {
    // Animate Out
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
        setActiveTab('editor'); // Force switch to editor
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
    { id: 'editor', label: 'Code Editor', icon: <FileCode2 size={18} /> },
    { id: 'diff', label: 'Diff Viewer', icon: <GitCompare size={18} /> },
    { id: 'history', label: 'History Logs', icon: <HistoryIcon size={18} /> },
  ];

  const themes = [
    { id: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { id: 'grey', label: 'Grey', icon: <Monitor size={14} /> },
    { id: 'white', label: 'Light', icon: <Sun size={14} /> },
  ];

  // Component router mapping
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'history': return <History />;
      case 'diff': return <DiffViewer />;
      case 'editor': return <CodeEditor initialCode={importedCode} onCodeChange={() => setImportedCode(null)} />; // pass initial code
      default: return <CodeEditor />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-bg-primary text-text-primary overflow-hidden font-sans transition-colors duration-300 antialiased selection:bg-accent/30">
      
      {/* ----------------- TOP MENU BAR (Adobe Style) ----------------- */}
      <header className="h-10 shrink-0 bg-bg-secondary border-b border-border-primary flex items-center px-4 z-30 select-none text-sm">
         <div className="flex items-center gap-2 mr-6 text-accent font-bold tracking-tight">
            <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center border border-accent/40">
               <span className="text-accent text-xs">d</span>
            </div>
            DevForge
         </div>
         
         <nav className="flex items-center h-full">
            {/* File Menu Dropdown Trigger (Simplified for now) */}
            <div className="group relative h-full flex items-center px-3 hover:bg-bg-tertiary cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
               <span>File</span>
               {/* Dropdown content */}
               <div className="absolute top-full left-0 w-48 bg-bg-secondary border border-border-primary shadow-xl rounded-b-lg hidden group-hover:flex flex-col py-1 z-50">
                  <div 
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 hover:bg-bg-hover flex justify-between items-center text-text-primary"
                  >
                     <span>Open File...</span>
                     <span className="text-xs text-text-muted">Ctrl+O</span>
                  </div>
                  <div className="px-4 py-2 hover:bg-bg-hover flex justify-between items-center text-text-primary">
                     <span>Save</span>
                     <span className="text-xs text-text-muted">Ctrl+S</span>
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
            <div className="h-full flex items-center px-3 hover:bg-bg-tertiary cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
               <span>Terminal</span>
            </div>
         </nav>

         {/* Theme controls in top right */}
         <div className="ml-auto flex items-center space-x-1">
             {themes.map((t) => (
               <button
                 key={t.id}
                 onClick={() => setTheme(t.id)}
                 title={t.label}
                 className={`p-1.5 rounded transition-colors \${
                   theme === t.id 
                     ? 'bg-bg-tertiary text-accent' 
                     : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                 }`}
               >
                 {t.icon}
               </button>
             ))}
         </div>
      </header>

      {/* ----------------- MAIN LAYOUT ----------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Navigation (Slimmer, professional) */}
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

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative bg-bg-primary custom-scrollbar z-10">
          {/* subtle glass background glow removed for a cleaner professional IDE look, replaced with pure utilitarian background */}
          <div className="relative z-10 h-full overflow-hidden flex flex-col bg-bg-primary">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* ----------------- GSAP IMPORT MODAL ----------------- */}
      {isModalOpen && (
        <div 
          ref={modalOverlayRef}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none"
        >
          <div 
            ref={modalRef}
            className="bg-bg-secondary border border-border-primary shadow-2xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col will-change-transform"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-primary flex justify-between items-center bg-bg-tertiary">
               <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                 <FolderOpen size={20} className="text-accent" /> Import Code File
               </h3>
               <button onClick={closeModal} className="text-text-muted hover:text-rose-500 transition-colors rounded-full p-1 hover:bg-rose-500/10">
                 <X size={20} />
               </button>
            </div>
            
            {/* Modal Body */}
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
                  <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
               </label>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
