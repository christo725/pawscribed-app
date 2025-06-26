import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface AnalyticsData {
  overview: {
    total_notes: number;
    notes_this_week: number;
    avg_completion_time: number;
    most_used_template: string;
    active_patients: number;
    completion_rate: number;
  };
  workflow_distribution: Array<{ status: string; count: number; percentage: number }>;
  productivity_trends: Array<{ date: string; notes_created: number; notes_completed: number }>;
  completion_times: Array<{ template: string; avg_time: number; median_time: number }>;
  export_activity: Array<{ date: string; exports: number; format: string }>;
  patient_insights: Array<{ species: string; count: number; avg_notes_per_patient: number }>;
  quality_metrics: {
    avg_note_length: number;
    template_adherence: number;
    review_rate: number;
    revision_rate: number;
  };
}

interface MobileAnalyticsDashboardProps {
  analyticsData: AnalyticsData;
  isLoading?: boolean;
  onPeriodChange: (startDate: string, endDate: string) => void;
}

export const MobileAnalyticsDashboard: React.FC<MobileAnalyticsDashboardProps> = ({
  analyticsData,
  isLoading = false,
  onPeriodChange
}) => {
  const { t } = useTranslation(['common', 'veterinary']);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const tabs = [
    { id: 'overview', label: t('analytics.overview'), icon: '📊' },
    { id: 'workflow', label: t('analytics.workflow'), icon: '🔄' },
    { id: 'productivity', label: t('analytics.productivity'), icon: '📈' },
    { id: 'patients', label: t('analytics.patients'), icon: '🐾' },
    { id: 'quality', label: t('analytics.quality'), icon: '⭐' }
  ];

  const periods = [
    { id: 'week', label: t('periods.week') },
    { id: 'month', label: t('periods.month') },
    { id: '3months', label: t('periods.quarter') },
    { id: 'year', label: t('periods.year') }
  ];

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const today = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }

    onPeriodChange(startDate.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'available_for_review': return 'bg-yellow-100 text-yellow-800';
      case 'ready_to_export': return 'bg-green-100 text-green-800';
      case 'exported': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Period Selector */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex overflow-x-auto scrollbar-hide space-x-2">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => handlePeriodChange(period.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium text-sm">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(analyticsData.overview.total_notes)}</div>
                <div className="text-sm text-gray-600">{t('analytics.totalNotes')}</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{formatNumber(analyticsData.overview.notes_this_week)}</div>
                <div className="text-sm text-gray-600">{t('analytics.thisWeek')}</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">{formatTime(analyticsData.overview.avg_completion_time)}</div>
                <div className="text-sm text-gray-600">{t('analytics.avgTime')}</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-orange-600">{analyticsData.overview.completion_rate}%</div>
                <div className="text-sm text-gray-600">{t('analytics.completionRate')}</div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">{t('analytics.quickStats')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('analytics.activePatients')}</span>
                  <span className="font-medium">{formatNumber(analyticsData.overview.active_patients)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('analytics.mostUsedTemplate')}</span>
                  <span className="font-medium">{analyticsData.overview.most_used_template.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('analytics.workflowDistribution')}</h3>
            <div className="space-y-3">
              {analyticsData.workflow_distribution.map((item) => (
                <div key={item.status} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="font-bold text-lg">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{item.percentage}% of total</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'productivity' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('analytics.productivityTrends')}</h3>
            <div className="space-y-3">
              {analyticsData.productivity_trends.slice(-7).map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-blue-600">{item.notes_created} created</span>
                      <span className="text-green-600">{item.notes_completed} completed</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1 bg-blue-100 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (item.notes_created / 10) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (item.notes_completed / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('analytics.patientInsights')}</h3>
            <div className="space-y-3">
              {analyticsData.patient_insights.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 capitalize">{item.species}</span>
                    <span className="text-2xl font-bold text-blue-600">{item.count}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.avg_notes_per_patient.toFixed(1)} avg notes per patient
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('analytics.qualityMetrics')}</h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('analytics.avgNoteLength')}</span>
                  <span className="font-bold">{formatNumber(analyticsData.quality_metrics.avg_note_length)} chars</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (analyticsData.quality_metrics.avg_note_length / 1000) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('analytics.templateAdherence')}</span>
                  <span className="font-bold">{analyticsData.quality_metrics.template_adherence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${analyticsData.quality_metrics.template_adherence}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('analytics.reviewRate')}</span>
                  <span className="font-bold">{analyticsData.quality_metrics.review_rate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${analyticsData.quality_metrics.review_rate}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('analytics.revisionRate')}</span>
                  <span className="font-bold">{analyticsData.quality_metrics.revision_rate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${analyticsData.quality_metrics.revision_rate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};