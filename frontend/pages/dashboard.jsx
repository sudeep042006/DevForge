import React, { useState, useEffect } from 'react';
import { Activity, Users, Zap, Award, Github, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// Custom Tooltip for chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-secondary border border-border-primary px-3 py-2 rounded-lg shadow-lg text-xs">
        <p className="text-text-muted mb-1">{label}</p>
        <p className="text-accent font-bold">{payload[0].value} scan{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [activityData, setActivityData] = useState([]);
  const [stats, setStats] = useState({ totalScans: 0, uniqueRepos: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadActivity = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/history/activity');
      setActivityData(res.data.activity || []);
      setStats(res.data.stats || { totalScans: 0, uniqueRepos: 0 });
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  // Format date label: "Mar 13"
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = activityData.map(d => ({
    date: formatDate(d.date),
    scans: d.scans
  }));

  const statCards = [
    { label: 'Total Scans', value: stats.totalScans.toLocaleString(), icon: <Activity className="text-accent" size={20} />, color: 'text-accent' },
    { label: 'Unique Repos', value: stats.uniqueRepos.toLocaleString(), icon: <Github className="text-emerald-500" size={20} />, color: 'text-emerald-500' },
    { label: 'Active Tasks', value: '—', icon: <Zap className="text-amber-500" size={20} />, color: 'text-amber-500' },
    { label: 'Rank Points', value: '4,520', icon: <Award className="text-purple-400" size={20} />, color: 'text-purple-400' },
  ];

  return (
    <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-secondary mt-1 text-sm text-text-muted">Welcome back, Architect.</p>
        </div>
        <button
          onClick={loadActivity}
          className="bg-bg-secondary border border-border-primary hover:bg-bg-hover text-text-primary p-2 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-bg-secondary border border-border-primary rounded-xl p-5 shadow-sm hover:border-accent transition-colors cursor-pointer group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-text-secondary text-sm font-medium">{stat.label}</p>
                <h3 className={`text-2xl font-bold mt-2 group-hover:${stat.color} transition-colors text-text-primary`}>
                  {isLoading && i < 2 ? '...' : stat.value}
                </h3>
              </div>
              <div className="p-2.5 bg-bg-tertiary rounded-lg">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Graph */}
      <div className="flex-1 bg-bg-secondary border border-border-primary rounded-xl p-6 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Repository Analysis Activity</h2>
            <p className="text-text-muted text-xs mt-0.5">Scans per day — last 30 days</p>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs text-text-muted">Live data</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="flex-1" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent, #6366f1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent, #6366f1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#accentGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {!isLoading && chartData.every(d => d.scans === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Activity size={32} className="text-text-muted opacity-20 mb-2" />
            <p className="text-text-muted text-sm">Analyze repositories to populate this graph</p>
          </div>
        )}
      </div>
    </div>
  );
}
