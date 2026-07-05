import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  UserX,
  Users,
  GraduationCap,
} from 'lucide-react';
import { admissionResultsAPI } from '../services/api';
import toast from 'react-hot-toast';

// Fixed status palette (validated with the dataviz skill). Status colors are
// never themed and always ship with a text label (the legend), so meaning is
// never carried by color alone.
const STATUS_META = {
  SELECTED: { label: 'Selected', color: '#0ca30c', icon: CheckCircle2 },
  WAITING: { label: 'Waiting', color: '#fab219', icon: Clock },
  REJECTED: { label: 'Rejected', color: '#d03b3b', icon: XCircle },
  ABSENT: { label: 'Absent', color: '#898781', icon: UserX },
} as const;

type StatusKey = keyof typeof STATUS_META;
const STATUS_ORDER: StatusKey[] = ['SELECTED', 'WAITING', 'REJECTED', 'ABSENT'];

// Chart ink tokens (kept out of the series colors).
const INK = {
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
};

const DEPT_TOTAL_COLOR = '#2a78d6';
const DEPT_SELECTED_COLOR = '#0ca30c';

interface DailyRow {
  date: string;
  SELECTED: number;
  WAITING: number;
  REJECTED: number;
  ABSENT: number;
  total: number;
}

interface DeptRow {
  department: string;
  department_name: string;
  total: number;
  selected: number;
}

interface DashboardStats {
  days: number;
  daily: DailyRow[];
  status_totals: Record<StatusKey, number>;
  publication_totals: Record<string, number>;
  by_department: DeptRow[];
  totals: {
    total_results: number;
    selected: number;
    waiting: number;
    rejected: number;
    absent: number;
    admitted: number;
    attended: number;
    published: number;
  };
}

const RANGE_OPTIONS = [
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
];

const formatDay = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface AdmissionAnalyticsProps {
  gradientClass?: string;
}

export function AdmissionAnalytics({ gradientClass }: AdmissionAnalyticsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(90);

  const loadStats = useCallback(async (selectedDays: number) => {
    setIsLoading(true);
    try {
      const data = await admissionResultsAPI.getDashboardStats({ days: selectedDays });
      setStats(data);
    } catch (error) {
      console.error('Error loading admission stats:', error);
      toast.error('Failed to load admission statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(days);
  }, [days, loadStats]);

  const kpis = stats
    ? [
        {
          title: 'Total Results',
          value: stats.totals.total_results,
          description: `${stats.totals.attended} attended`,
          icon: Users,
          accent: '#2a78d6',
        },
        {
          title: 'Selected',
          value: stats.totals.selected,
          description: `${stats.totals.admitted} admitted`,
          icon: CheckCircle2,
          accent: STATUS_META.SELECTED.color,
        },
        {
          title: 'Waiting',
          value: stats.totals.waiting,
          description: 'On waiting list',
          icon: Clock,
          accent: STATUS_META.WAITING.color,
        },
        {
          title: 'Published',
          value: stats.totals.published,
          description: `${stats.totals.rejected} rejected`,
          icon: GraduationCap,
          accent: '#4a3aa7',
        },
      ]
    : [];

  const statusPieData = stats
    ? STATUS_ORDER.map((key) => ({
        name: STATUS_META[key].label,
        value: stats.status_totals[key] || 0,
        color: STATUS_META[key].color,
      })).filter((d) => d.value > 0)
    : [];

  const hasDaily = !!stats && stats.daily.length > 0;
  const hasDept = !!stats && stats.by_department.length > 0;
  const hasStatus = statusPieData.length > 0;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {isLoading && !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 h-7 w-14 animate-pulse rounded bg-gray-200" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card
                  key={kpi.title}
                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-950">{kpi.title}</span>
                      <span
                        className="rounded-lg p-2"
                        style={{ backgroundColor: `${kpi.accent}1a`, color: kpi.accent }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-1 text-2xl font-bold leading-tight text-[#0D1B4C]">
                      {kpi.value}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-700">{kpi.description}</div>
                  </CardContent>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: kpi.accent }}
                  />
                </Card>
              );
            })}
      </div>

      {/* Date-wise stacked bar chart */}
      <Card className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between px-4 pb-2 pt-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-950 md:text-xl">
              Admission Results Over Time
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-700">
              Results per day, split by outcome status
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDays(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    days === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => loadStats(days)}
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-slate-300 text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4 md:px-4">
          {isLoading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : hasDaily ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={stats!.daily} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke={INK.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  tick={{ fontSize: 11, fill: INK.muted }}
                  tickLine={false}
                  axisLine={{ stroke: INK.axis }}
                  minTickGap={16}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: INK.muted }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(11,11,11,0.04)' }}
                  labelFormatter={(label) => formatDay(String(label))}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid rgba(11,11,11,0.10)',
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                {STATUS_ORDER.map((key, idx) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="results"
                    name={STATUS_META[key].label}
                    fill={STATUS_META[key].color}
                    // Round only the top segment of each stack.
                    radius={idx === STATUS_ORDER.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={48}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-slate-500">
              No admission results in this period yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status distribution + department breakdown */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-5">
        {/* Status donut */}
        <Card className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="px-4 pb-0 pt-4">
            <CardTitle className="text-base font-bold text-slate-950 md:text-lg">
              Outcome Distribution
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-700">
              Share of each result status
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : hasStatus ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="#fcfcfb"
                      strokeWidth={2}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid rgba(11,11,11,0.10)',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  {STATUS_ORDER.map((key) => {
                    const Icon = STATUS_META[key].icon;
                    const value = stats!.status_totals[key] || 0;
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4" style={{ color: STATUS_META[key].color }} />
                        <span className="text-slate-700">{STATUS_META[key].label}</span>
                        <span className="ml-auto font-semibold text-slate-950">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No results to summarize yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department breakdown */}
        <Card className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <CardHeader className="px-4 pb-0 pt-4">
            <CardTitle className="text-base font-bold text-slate-950 md:text-lg">
              Results by Department
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-700">
              Total candidates vs. selected (top departments)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4 md:px-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : hasDept ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats!.by_department}
                  margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                  barGap={4}
                >
                  <CartesianGrid vertical={false} stroke={INK.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 11, fill: INK.muted }}
                    tickLine={false}
                    axisLine={{ stroke: INK.axis }}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: INK.muted }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(11,11,11,0.04)' }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid rgba(11,11,11,0.10)',
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="total" name="Total" fill={DEPT_TOTAL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar
                    dataKey="selected"
                    name="Selected"
                    fill={DEPT_SELECTED_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No department data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdmissionAnalytics;
