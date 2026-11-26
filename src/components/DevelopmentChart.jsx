import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { month: 'Jun', funds: 32, works: 24 },
  { month: 'Jul', funds: 43, works: 31 },
  { month: 'Aug', funds: 41, works: 38 },
  { month: 'Sep', funds: 58, works: 44 },
  { month: 'Oct', funds: 53, works: 50 },
  { month: 'Nov', funds: 72, works: 61 },
];

export default function DevelopmentChart() {
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="fundsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#547e61" stopOpacity={0.2}/><stop offset="95%" stopColor="#547e61" stopOpacity={0}/></linearGradient><linearGradient id="worksFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d79a58" stopOpacity={0.16}/><stop offset="95%" stopColor="#d79a58" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eceee8" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#848a81', fontSize: 11 }} dy={9}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#848a81', fontSize: 11 }}/><Tooltip/><Area type="monotone" dataKey="funds" stroke="#547e61" strokeWidth={2} fill="url(#fundsFill)"/><Area type="monotone" dataKey="works" stroke="#d79a58" strokeWidth={2} fill="url(#worksFill)"/></AreaChart></ResponsiveContainer></div>;
}
