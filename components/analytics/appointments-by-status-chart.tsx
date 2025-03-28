'use client';

import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';

interface StatusChartDataItem {
  name: string;
  value: number;
}

interface AppointmentsByStatusChartProps {
  data: StatusChartDataItem[];
  isLoading: boolean;
}

// Status colors
const STATUS_COLORS = {
  'Pending': '#ffa500',
  'Confirmed': '#3b82f6',
  'Arrived': '#22c55e',
  'Completed': '#10b981',
  'Cancelled': '#ef4444',
  'No-Show': '#6b7280'
};

// Custom pie chart rendering
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function AppointmentsByStatusChart({ data, isLoading }: AppointmentsByStatusChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full h-48 bg-gray-50 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-2 text-muted-foreground">
        <PieChartIcon className="h-12 w-12 text-gray-300" />
        <p>No appointment status data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#8884d8'} 
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [`${value} appointments`, 'Count']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center"
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
