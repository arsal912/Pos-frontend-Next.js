'use client';

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import type { ReportChartData } from '@/types';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--destructive))', '#f59e0b', '#8b5cf6', '#06b6d4'];

interface Props {
  data: ReportChartData;
  height?: number;
}

export default function ReportChart({ data, height = 280 }: Props) {
  if (!data) return null;

  const chartData = data.labels.map((label, i) => {
    const point: Record<string, any> = { label };
    data.series.forEach(s => { point[s.name] = s.data[i] ?? 0; });
    return point;
  });

  if (data.type === 'pie') {
    const pieData = data.series[0]?.data.map((value, i) => ({
      name: data.labels[i], value,
    })) ?? [];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({name, percent}) => `${name} (${(percent*100).toFixed(0)}%)`}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => v.toFixed(2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (data.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
          <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
          <YAxis tick={{ fontSize: 11 }}/>
          <Tooltip/>
          <Legend/>
          {data.series.map((s, i) => (
            <Area key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]+'33'} strokeWidth={2}/>
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (data.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
          <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
          <YAxis tick={{ fontSize: 11 }}/>
          <Tooltip/>
          <Legend/>
          {data.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={COLORS[i%COLORS.length]} radius={[4,4,0,0]}/>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: line
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
        <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
        <YAxis tick={{ fontSize: 11 }}/>
        <Tooltip/>
        <Legend/>
        {data.series.map((s, i) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={false}/>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
