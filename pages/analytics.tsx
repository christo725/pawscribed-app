import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../lib/api';
import { AnalyticsOverview } from '../components/analytics/AnalyticsOverview';
import { WorkflowDistribution } from '../components/analytics/WorkflowDistribution';
import { ProductivityTrends } from '../components/analytics/ProductivityTrends';
import { CompletionTimes } from '../components/analytics/CompletionTimes';
import { ExportActivity } from '../components/analytics/ExportActivity';
import { PatientInsights } from '../components/analytics/PatientInsights';
import { QualityMetrics } from '../components/analytics/QualityMetrics';
import toast from 'react-hot-toast';

interface AnalyticsData {
  overview: any;
  workflow_distribution: any;
  productivity_trends: any;
  completion_times: any;
  export_activity: any;
  patient_insights: any;
  quality_metrics: any;
  date_range: {
    start_date: string;
    end_date: string;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (dateRange.start && dateRange.end) {
        startDate = new Date(dateRange.start).toISOString();
        endDate = new Date(dateRange.end).toISOString();
      } else {
        // Use predefined period
        const now = new Date();
        const start = new Date();
        
        switch (selectedPeriod) {
          case 'week':
            start.setDate(now.getDate() - 7);
            break;
          case 'month':
            start.setDate(now.getDate() - 30);
            break;
          case 'quarter':
            start.setDate(now.getDate() - 90);
            break;
        }
        
        startDate = start.toISOString();
        endDate = now.toISOString();
      }

      const result = await analyticsAPI.getWorkflowAnalytics(startDate, endDate);
      
      if (result.success) {
        setAnalyticsData(result.analytics);
      } else {
        toast.error(result.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated, selectedPeriod, dateRange]);

  // Handle period change
  const handlePeriodChange = (period: 'week' | 'month' | 'quarter') => {
    setSelectedPeriod(period);
    setDateRange({ start: '', end: '' }); // Clear custom date range
  };

  // Handle custom date range
  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600">
                Workflow insights and practice performance metrics
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/inbox')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Inbox
              </button>
              <button
                onClick={() => router.push('/workflow')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Workflow Board
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Period Selection */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Time Period:</span>
              <div className="flex space-x-1">
                {['week', 'month', 'quarter'].map((period) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodChange(period as 'week' | 'month' | 'quarter')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedPeriod === period && !dateRange.start
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Last {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Custom Range:</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              {dateRange.start && dateRange.end && (
                <button
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Date Range Display */}
          {analyticsData && (
            <div className="mt-2 text-sm text-gray-600">
              Showing data from {new Date(analyticsData.date_range.start_date).toLocaleDateString()} 
              {' '}to {new Date(analyticsData.date_range.end_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Analytics Content */}
        {analyticsData ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <AnalyticsOverview data={analyticsData.overview} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WorkflowDistribution data={analyticsData.workflow_distribution} />
              <ProductivityTrends data={analyticsData.productivity_trends} />
              <CompletionTimes data={analyticsData.completion_times} />
              <ExportActivity data={analyticsData.export_activity} />
            </div>

            {/* Patient and Quality Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PatientInsights data={analyticsData.patient_insights} />
              <QualityMetrics data={analyticsData.quality_metrics} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
              <p className="text-gray-600 mb-4">
                Start creating notes to see your practice analytics
              </p>
              <button
                onClick={() => router.push('/record')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}