'use client';

import { useMemo } from 'react';
import { 
  BarChart as LucideBarChart, 
  TrendingUp, 
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

interface ChartDataItem {
  date: string;
  formattedDate: string;
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  data: ChartDataItem[];
  isLoading: boolean;
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <Card className="shadow-lg border border-gray-200 bg-white/95 backdrop-blur-sm p-0">
        <CardContent className="p-3">
          <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
          <p className="text-gray-900 font-medium">₸ {payload[0].value?.toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">{payload[1].value} bookings</p>
        </CardContent>
      </Card>
    );
  }
  return null;
};

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  // Calculate trend
  const trend = useMemo(() => {
    if (data.length < 2) return { isUp: true, percentage: 0 };
    
    const firstValue = data[0].revenue;
    const lastValue = data[data.length - 1].revenue;
    
    const change = lastValue - firstValue;
    const percentage = firstValue !== 0 
      ? Math.round((change / firstValue) * 100) 
      : 0;
    
    return {
      isUp: change >= 0,
      percentage: Math.abs(percentage)
    };
  }, [data]);

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
        <LucideBarChart className="h-12 w-12 text-gray-300" />
        <p>No revenue data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {/* Trend indicator */}
      <div className="mb-4 flex items-center gap-2">
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
          trend.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {trend.isUp 
            ? <TrendingUp className="h-3 w-3" /> 
            : <TrendingDown className="h-3 w-3" />
          }
          <span>{trend.percentage}%</span>
        </div>
        
        <span className="text-sm text-muted-foreground">
          {trend.isUp ? 'increase' : 'decrease'} over period
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#f0f0f0' }}
          />
          <YAxis 
            yAxisId="left"
            orientation="left"
            tickFormatter={(value) => `₸${value/1000}k`}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value}`}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="revenue" 
            name="Revenue"
            stroke="#8884d8" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)" 
          />
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="count" 
            name="Bookings"
            stroke="#82ca9d" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCount)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
