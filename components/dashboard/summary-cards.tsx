'use client';

import {
  Users,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppointmentStatus } from '@/types';

interface StatisticsData {
  totalAppointments: number;
  totalRevenue: number;
  averageValue: number;
  completionRate: number;
  statusCounts: Record<AppointmentStatus, number>;
  topServices: Array<{ id: string; name: string; count: number; revenue: number }>;
}

interface SummaryCardsProps {
  statistics: StatisticsData;
  isLoading: boolean;
  dateRangeLabel: string;
}

export function SummaryCards({ statistics, isLoading, dateRangeLabel }: SummaryCardsProps) {
  // Helper function to render a card with loading state
  const renderCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    trendIcon?: React.ReactNode,
    trendText?: string,
    isCurrency: boolean = false
  ) => (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shadow-sm">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-9 w-24 animate-pulse bg-gray-100 rounded-md"></div>
        ) : (
          <div className="text-2xl font-bold">
            {isCurrency ? `₸ ${(typeof value === 'number' ? value.toLocaleString() : value)}` : value}
          </div>
        )}
        {trendText && (
          <div className="flex items-center gap-1 text-xs mt-2 font-medium">
            {trendIcon}
            <span>{trendText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {renderCard(
        "Total Appointments",
        statistics.totalAppointments,
        <Calendar className="h-5 w-5" />,
        <ArrowUpRight className="h-3 w-3 text-green-500" />,
        `2.5% ${dateRangeLabel}`
      )}
      
      {renderCard(
        "Total Revenue",
        statistics.totalRevenue,
        <DollarSign className="h-5 w-5" />,
        <ArrowUpRight className="h-3 w-3 text-green-500" />,
        `18.1% ${dateRangeLabel}`,
        true
      )}
      
      {renderCard(
        "Average Value",
        Math.round(statistics.averageValue),
        <Users className="h-5 w-5" />,
        <ArrowUpRight className="h-3 w-3 text-green-500" />,
        `7.2% ${dateRangeLabel}`,
        true
      )}
      
      {renderCard(
        "Completion Rate",
        `${Math.round(statistics.completionRate)}%`,
        <CheckCircle className="h-5 w-5" />,
        statistics.completionRate > 80 
          ? <ArrowUpRight className="h-3 w-3 text-green-500" />
          : <ArrowDownRight className="h-3 w-3 text-red-500" />,
        statistics.completionRate > 80 
          ? "Good performance"
          : "Needs improvement"
      )}
    </div>
  );
}
