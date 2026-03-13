import React from 'react';
import { GitCompare, ArrowRight, Save, Play } from 'lucide-react';

export default function DiffViewer() {
  return (
    <div className="p-6 h-full flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Diff Viewer</h1>
          <p className="text-text-secondary mt-1 text-sm text-text-muted">Compare changes between versions.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-bg-secondary text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors text-sm font-medium">
            <Save size={16} /> Save Merge
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors shadow-sm text-sm font-medium border border-accent">
            <Play size={16} /> Run Tests
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* Original Code */}
        <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-2 bg-bg-tertiary border-b border-border-primary flex items-center gap-2 font-mono text-xs text-text-secondary">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Original: v1.0.4
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-text-muted overflow-auto whitespace-pre">
<span className="text-rose-400 bg-rose-500/10 block px-1 -mx-1 rounded">- function calculateTotal(items) {'{'}</span>
<span className="text-rose-400 bg-rose-500/10 block px-1 -mx-1 rounded">-   return items.reduce((a, b) =&gt; a + b.price, 0);</span>
<span className="text-rose-400 bg-rose-500/10 block px-1 -mx-1 rounded">- {'}'}</span>
<br />
<span className="block text-text-primary px-1 -mx-1">  function renderList(items) {'{'}</span>
<span className="block text-text-primary px-1 -mx-1">    return items.map(item =&gt; &lt;Item key=&#123;item.id&#125; data=&#123;item&#125; /&gt;);</span>
<span className="block text-text-primary px-1 -mx-1">  {'}'}</span>
          </div>
        </div>

        {/* Modified Code */}
        <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden shadow-sm flex flex-col relative">
          <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-7 h-7 bg-bg-tertiary border border-border-primary rounded-full flex items-center justify-center z-10 shadow-sm">
             <ArrowRight size={14} className="text-text-muted" />
          </div>
          <div className="px-4 py-2 bg-bg-tertiary border-b border-border-primary flex items-center gap-2 font-mono text-xs text-text-secondary">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Modified: Working Tree
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-text-muted overflow-auto whitespace-pre">
<span className="text-emerald-400 bg-emerald-500/10 block px-1 -mx-1 rounded">+ const calculateTotal = (items, tax = 0) =&gt; {'{'}</span>
<span className="text-emerald-400 bg-emerald-500/10 block px-1 -mx-1 rounded">+   const sub = items.reduce((a, b) =&gt; a + b.price, 0);</span>
<span className="text-emerald-400 bg-emerald-500/10 block px-1 -mx-1 rounded">+   return sub + (sub * tax);</span>
<span className="text-emerald-400 bg-emerald-500/10 block px-1 -mx-1 rounded">+ {'}'};</span>
<br />
<span className="block text-text-primary px-1 -mx-1">  function renderList(items) {'{'}</span>
<span className="block text-text-primary px-1 -mx-1">    return items.map(item =&gt; &lt;Item key=&#123;item.id&#125; data=&#123;item&#125; /&gt;);</span>
<span className="block text-text-primary px-1 -mx-1">  {'}'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
