import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';

export const DashboardChart: React.FC = () => {
  const { data } = useDashboardData();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis
          tickFormatter={(value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)}
          ticks={[0, 20000, 40000, 60000, 80000, 100000]}
        />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#10b981" />
      </LineChart>
    </ResponsiveContainer>
  );
};