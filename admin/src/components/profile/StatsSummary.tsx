"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Award,
  AlertTriangle,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsSummaryProps {
  stats?: {
    attendanceRate?: number;
    punctualityRate?: number;
    leavesUsed?: number;
    totalLeaves?: number;
    violationsThisMonth?: number;
    violationsLastMonth?: number;
    penaltiesTotal?: number;
    perfectDays?: number;
    currentStreak?: number;
    longestStreak?: number;
  };
  loading?: boolean;
}

export function StatsSummary({ stats, loading = false }: StatsSummaryProps) {
  // Mock data for demonstration
  const mockStats = stats || {
    attendanceRate: 92.5,
    punctualityRate: 87.3,
    leavesUsed: 8,
    totalLeaves: 21,
    violationsThisMonth: 3,
    violationsLastMonth: 5,
    penaltiesTotal: 45,
    perfectDays: 18,
    currentStreak: 5,
    longestStreak: 12
  };

  const getTrendIcon = (current: number, previous: number, isPositiveBetter = true) => {
    if (current > previous) {
      const Icon = isPositiveBetter ? TrendingUp : TrendingDown;
      const color = isPositiveBetter ? "text-green-600" : "text-red-600";
      return <Icon className={cn("h-4 w-4", color)} />;
    } else if (current < previous) {
      const Icon = isPositiveBetter ? TrendingDown : TrendingUp;
      const color = isPositiveBetter ? "text-red-600" : "text-green-600";
      return <Icon className={cn("h-4 w-4", color)} />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 bg-green-100";
    if (rate >= 85) return "text-blue-600 bg-blue-100";
    if (rate >= 75) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 95) return "bg-green-500";
    if (rate >= 85) return "bg-blue-500";
    if (rate >= 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  const statCards = [
    {
      title: "Attendance Rate",
      value: `${mockStats.attendanceRate}%`,
      icon: CheckCircle,
      description: "Overall attendance",
      progress: mockStats.attendanceRate,
      color: getPerformanceColor(mockStats.attendanceRate || 0),
      progressColor: getProgressColor(mockStats.attendanceRate || 0)
    },
    {
      title: "Punctuality Rate",
      value: `${mockStats.punctualityRate}%`,
      icon: Clock,
      description: "On-time check-ins",
      progress: mockStats.punctualityRate,
      color: getPerformanceColor(mockStats.punctualityRate || 0),
      progressColor: getProgressColor(mockStats.punctualityRate || 0)
    },
    {
      title: "Leave Balance",
      value: `${(mockStats.totalLeaves || 0) - (mockStats.leavesUsed || 0)}`,
      icon: Calendar,
      description: `${mockStats.leavesUsed || 0} of ${mockStats.totalLeaves || 0} used`,
      progress: ((((mockStats.totalLeaves || 0) - (mockStats.leavesUsed || 0)) / (mockStats.totalLeaves || 1)) * 100),
      color: "text-blue-600 bg-blue-100",
      progressColor: "bg-blue-500"
    },
    {
      title: "Violations",
      value: mockStats.violationsThisMonth || 0,
      icon: AlertTriangle,
      description: "This month",
      trend: getTrendIcon(mockStats.violationsThisMonth || 0, mockStats.violationsLastMonth || 0, false),
      color: (mockStats.violationsThisMonth || 0) > 3
        ? "text-red-600 bg-red-100"
        : "text-yellow-600 bg-yellow-100"
    }
  ];

  const achievementCards = [
    {
      label: "Perfect Days",
      value: mockStats.perfectDays,
      icon: Award,
      color: "text-green-600"
    },
    {
      label: "Current Streak",
      value: `${mockStats.currentStreak} days`,
      icon: Target,
      color: "text-blue-600"
    },
    {
      label: "Best Streak",
      value: `${mockStats.longestStreak} days`,
      icon: Award,
      color: "text-purple-600"
    },
    {
      label: "Total Penalties",
      value: `$${mockStats.penaltiesTotal}`,
      icon: AlertTriangle,
      color: "text-red-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex h-24 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("rounded-lg p-2", stat.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {stat.trend && stat.trend}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
                  </div>
                  {stat.progress !== undefined && (
                    <div className="space-y-1">
                      <Progress
                        value={stat.progress}
                        className="h-2"
                        indicatorClassName={stat.progressColor}
                      />
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </div>
                  )}
                  {!stat.progress && stat.description && (
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Achievements Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">Performance Highlights</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievementCards.map((achievement) => {
              const Icon = achievement.icon;

              return (
                <div
                  key={achievement.label}
                  className="text-center p-3 rounded-lg bg-muted/50"
                >
                  <Icon className={cn("h-5 w-5 mx-auto mb-2", achievement.color)} />
                  <p className="text-lg font-bold">{achievement.value}</p>
                  <p className="text-xs text-muted-foreground">{achievement.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Overall Performance</h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Attendance Consistency</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={mockStats.attendanceRate}
                    className="w-24 h-2"
                    indicatorClassName={getProgressColor(mockStats.attendanceRate || 0)}
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {mockStats.attendanceRate}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Punctuality Score</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={mockStats.punctualityRate}
                    className="w-24 h-2"
                    indicatorClassName={getProgressColor(mockStats.punctualityRate || 0)}
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {mockStats.punctualityRate}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Leave Utilization</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={((mockStats.leavesUsed || 0) / (mockStats.totalLeaves || 1)) * 100}
                    className="w-24 h-2"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {Math.round(((mockStats.leavesUsed || 0) / (mockStats.totalLeaves || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Badge */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Performance Level</span>
                <div className="flex items-center gap-2">
                  {(mockStats.attendanceRate || 0) >= 95 && (mockStats.punctualityRate || 0) >= 90 ? (
                    <>
                      <Award className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Excellent</span>
                    </>
                  ) : (mockStats.attendanceRate || 0) >= 85 && (mockStats.punctualityRate || 0) >= 80 ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Good</span>
                    </>
                  ) : (mockStats.attendanceRate || 0) >= 75 && (mockStats.punctualityRate || 0) >= 70 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-600">Needs Improvement</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Poor</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}