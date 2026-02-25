import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { getTeamMetrics, triggerSync } from '../api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];

interface TeamMetricsProps {
  refreshKey: number;
}

const TeamMetrics: React.FC<TeamMetricsProps> = ({ refreshKey }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeamMetrics();
      setMetrics(res.data);
    } catch {
      console.error('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await triggerSync();
      const res = await getTeamMetrics();
      setMetrics(res.data);
      toast.success('Metrics refreshed');
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { if (refreshKey > 0) fetchMetrics(); }, [refreshKey, fetchMetrics]);

  const s = metrics?.summary;
  const hasSummary = s && s.total_tickets > 0;

  // Transform grouped data for recharts
  const buData = metrics?.by_business_unit
    ? Object.entries(metrics.by_business_unit).map(([name, v]: any) => ({ name, ...v }))
    : [];
  const wsData = metrics?.by_work_stream
    ? Object.entries(metrics.by_work_stream).map(([name, v]: any) => ({ name, ...v }))
    : [];
  const typeData = metrics?.issue_type_breakdown
    ? Object.entries(metrics.issue_type_breakdown).map(([name, v]: any) => ({ name, ...v }))
    : [];
  const trend = metrics?.monthly_trend || [];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center flex-shrink-0">
        <h1 className="text-lg font-semibold text-slate-100">Team Metrics</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-md shadow-indigo-500/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={syncing ? 'animate-spin' : ''} size={16} />
          <span>{syncing ? 'Syncing...' : 'Sync & Refresh'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !metrics ? (
          <div className="flex flex-col justify-center items-center h-64 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-indigo-400" />
            <p className="text-sm text-slate-400">Loading metrics...</p>
          </div>
        ) : !hasSummary ? (
          <div className="flex flex-col justify-center items-center h-64 gap-2">
            <p className="text-slate-300 font-medium">No data available</p>
            <p className="text-sm text-slate-500">Click "Sync & Refresh" to fetch tickets from JIRA first.</p>
          </div>
        ) : (
          <div className="max-w-7xl space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Total Tickets" value={s.total_tickets} />
              <KpiCard label="Total Story Points" value={s.total_story_points} />
              <KpiCard label="Total Eng Hours" value={s.total_eng_hours} suffix="h" />
              <KpiCard
                label="Estimation Accuracy"
                value={s.estimation_accuracy}
                suffix="x"
                hint="(SP*8h) / actual hours. 1.0 = perfect"
                color={s.estimation_accuracy === null ? undefined : s.estimation_accuracy >= 0.8 && s.estimation_accuracy <= 1.2 ? 'text-emerald-400' : 'text-amber-400'}
              />
              <KpiCard label="Avg Hours / SP" value={s.avg_eng_hours_per_sp} suffix="h" />
              <KpiCard label="Avg Cycle Time" value={s.avg_cycle_time_hours} suffix="h" hint="Avg eng hours per ticket" />
              <KpiCard label="Bug Count" value={s.bug_count} />
              <KpiCard label="Bug Ratio" value={Math.round(s.bug_ratio * 100)} suffix="%" />
              <KpiCard label="Bug Hours %" value={s.bug_eng_hours_pct} suffix="%" hint="% of eng hours spent on bugs" />
            </div>

            {/* Monthly Trend */}
            {trend.length > 1 && (
              <Section title="Monthly Trend">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="story_points" name="Story Points" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="eng_hours" name="Eng Hours" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="tickets" name="Tickets" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            {/* Eng Hours by Business Unit + Work Stream side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {buData.length > 0 && (
                <Section title="Eng Hours by Business Unit">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={buData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} />
                        <Bar dataKey="eng_hours" name="Eng Hours" radius={[0, 4, 4, 0]}>
                          {buData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              {wsData.length > 0 && (
                <Section title="Eng Hours by Work Stream">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={wsData} dataKey="eng_hours" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {wsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}
            </div>

            {/* Story Points by BU + Issue Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {buData.length > 0 && (
                <Section title="Story Points by Business Unit">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={buData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} />
                        <Bar dataKey="story_points" name="Story Points" radius={[0, 4, 4, 0]}>
                          {buData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              {typeData.length > 0 && (
                <Section title="Issue Type Breakdown">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={typeData} dataKey="tickets" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, suffix, hint, color }: { label: string; value: any; suffix?: string; hint?: string; color?: string }) => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
    <span className={`text-2xl font-bold tabular-nums ${color || 'text-slate-100'}`}>
      {value === null || value === undefined ? '—' : `${value}${suffix || ''}`}
    </span>
    {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
    <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">{title}</h3>
    {children}
  </div>
);

export default TeamMetrics;
