import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Clock, Github, Search, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:5000/api/history');
      setLogs(res.data);
    } catch (err) {
      setError('Could not load history from server.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/history/${id}`);
      setLogs(prev => prev.filter(log => log._id !== id));
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  const filtered = logs.filter(log =>
    (log.repoUrl || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.repoName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.owner || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
            <HistoryIcon className="text-accent" size={28} />
            Analysis History
          </h1>
          <p className="text-text-secondary mt-1 text-sm">All repository analyses — stored in MongoDB.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search repos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-bg-secondary border border-border-primary text-text-primary rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-accent transition-colors w-56 text-sm"
            />
          </div>
          <button
            onClick={fetchHistory}
            className="bg-bg-secondary border border-border-primary hover:bg-bg-hover text-text-primary p-2 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex-1 bg-bg-secondary border border-border-primary rounded-xl shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <RefreshCw size={20} className="animate-spin mr-3" />
            <span className="text-sm">Loading history...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-3">
            <Github size={32} className="opacity-20" />
            <p className="text-sm">{searchQuery ? 'No matches found.' : 'No repositories analyzed yet. Go to Repo Analyzer to get started!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-primary text-text-secondary text-xs uppercase tracking-wider bg-bg-tertiary/30">
                  <th className="px-6 py-4 font-medium">Repository</th>
                  <th className="px-6 py-4 font-medium">AI Summary</th>
                  <th className="px-6 py-4 font-medium">Files</th>
                  <th className="px-6 py-4 font-medium"><Clock size={12} className="inline mr-1" />Analyzed</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {filtered.map((log) => (
                  <tr key={log._id} className="hover:bg-bg-hover transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Github size={14} className="text-accent shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{log.owner}/{log.repoName}</p>
                          <a
                            href={log.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-text-muted hover:text-accent transition-colors truncate max-w-[200px] block"
                          >
                            {log.repoUrl}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-text-secondary max-w-xs truncate">
                        {log.aiSummary?.projectExplanation || 'No summary available.'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {log.filesCount ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {log.status === 'success' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(log._id)}
                        className="text-text-muted hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}