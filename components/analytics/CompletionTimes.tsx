import React from 'react';

interface CompletionData {
  avg_total_time: number;
  total_completed: number;
  completion_distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

interface CompletionTimesProps {
  data: CompletionData;
}

export const CompletionTimes: React.FC<CompletionTimesProps> = ({ data }) => {
  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(1)}h`;
    }
  };

  const getBarColor = (range: string) => {
    switch (range) {
      case '< 1 hour':
        return 'bg-green-500';
      case '1-4 hours':
        return 'bg-blue-500';
      case '4-24 hours':
        return 'bg-yellow-500';
      case '1-3 days':
        return 'bg-orange-500';
      case '> 3 days':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Completion Times
      </h3>

      {data.total_completed === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No completed notes to analyze</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(data.avg_total_time)}
              </div>
              <div className="text-sm text-gray-600">Average Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.total_completed}
              </div>
              <div className="text-sm text-gray-600">Completed Notes</div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Completion Time Distribution</h4>
            {data.completion_distribution.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-600 text-right">
                  {item.range}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${getBarColor(item.range)} transition-all duration-300`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="text-right w-16">
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Indicator */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Performance:</span>
              <div className="flex items-center space-x-2">
                {data.avg_total_time < 4 ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-medium">Excellent</span>
                  </>
                ) : data.avg_total_time < 24 ? (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-700 font-medium">Good</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span className="text-orange-700 font-medium">Could Improve</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};