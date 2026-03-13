import React from 'react';
import { History as HistoryIcon, Clock, GitCommit, Search } from 'lucide-react';

export default function History() {
  const logs = [
    { id: '1a2b3c', message: 'Implemented generic UI layout', time: '2 mins ago', status: 'success' },
    { id: '4d5e6f', message: 'Configured Tailwind multi-theme', time: '1 hour ago', status: 'success' },
    { id: '7g8h9i', message: 'Failed to deploy to staging', time: '3 hours ago', status: 'error' },
    { id: '0j1k2l', message: 'Initial commit', time: '1 day ago', status: 'success' },
  ];

  return (
    <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">History Log</h1>
          <p className="text-text-secondary mt-1 text-sm text-text-muted">Review previous actions and events.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="bg-bg-secondary border border-border-primary text-text-primary rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-accent transition-colors w-64 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 bg-bg-secondary border border-border-primary rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-primary text-text-secondary text-xs uppercase tracking-wider bg-bg-tertiary/30">
                  <th className="px-6 py-4 font-medium flex items-center gap-2">
                    <GitCommit size={14} /> Commit
                  </th>
                  <th className="px-6 py-4 font-medium">Message</th>
                  <th className="px-6 py-4 font-medium"><Clock size={14} className="inline mr-1" /> Time</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-hover transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-mono text-sm text-accent">{log.id}</td>
                    <td className="px-6 py-4 text-sm text-text-primary group-hover:text-accent transition-colors font-medium">{log.message}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{log.time}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}