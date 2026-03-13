import React from 'react';
import { Activity, Users, Zap, Award } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-secondary mt-1 text-sm text-text-muted">Welcome back, Architect.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Commits', value: '1,284', icon: <Activity className="text-accent" size={20} /> },
          { label: 'Active Tasks', value: '12', icon: <Zap className="text-accent" size={20} /> },
          { label: 'Team Members', value: '8', icon: <Users className="text-accent" size={20} /> },
          { label: 'Rank Points', value: '4,520', icon: <Award className="text-accent" size={20} /> },
        ].map((stat, i) => (
          <div key={i} className="bg-bg-secondary border border-border-primary rounded-xl p-5 shadow-sm hover:border-accent transition-colors cursor-pointer group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-text-secondary text-sm font-medium">{stat.label}</p>
                <h3 className="text-text-primary text-2xl font-bold mt-2 group-hover:text-accent transition-colors">{stat.value}</h3>
              </div>
              <div className="p-2.5 bg-bg-tertiary rounded-lg">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex-1 bg-bg-secondary border border-border-primary rounded-xl p-6 shadow-sm overflow-hidden flex flex-col relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h2 className="text-xl font-semibold text-text-primary mb-4">Activity Graph</h2>
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border-primary rounded-lg text-text-secondary hover:border-accent transition-colors">
             <Activity size={48} className="text-bg-tertiary mb-3 group-hover:text-accent/50 transition-colors" />
             <p className="text-sm">Activity visualization will render here</p>
          </div>
      </div>
    </div>
  );
}
