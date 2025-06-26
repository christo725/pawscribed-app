import React from 'react';

interface ProductivityData {
  daily_trends: Array<{
    date: string;
    notes_created: number;
    exports: number;
  }>;
  weekly_average: number;
}

interface ProductivityTrendsProps {
  data: ProductivityData;
}

export const ProductivityTrends: React.FC<ProductivityTrendsProps> = ({ data }) => {
  const maxNotes = Math.max(...data.daily_trends.map(d => d.notes_created), 1);
  const maxExports = Math.max(...data.daily_trends.map(d => d.exports), 1);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Daily Productivity Trends
        </h3>
        <div className="text-sm text-gray-600">
          Avg: {data.weekly_average} notes/day
        </div>
      </div>

      {data.daily_trends.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No productivity data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart */}
          <div className="space-y-2">
            {data.daily_trends.map((day, index) => {
              const notesHeight = (day.notes_created / maxNotes) * 100;
              const exportsHeight = (day.exports / maxExports) * 100;

              return (
                <div key={index} className="flex items-end space-x-2">
                  <div className="w-16 text-xs text-gray-600 text-right">
                    <div>{getDayOfWeek(day.date)}</div>
                    <div className="text-gray-400">{formatDate(day.date)}</div>
                  </div>
                  
                  <div className="flex-1 flex items-end space-x-1 h-12">
                    {/* Notes bar */}
                    <div className="relative flex-1">
                      <div
                        className="bg-blue-500 rounded-t"
                        style={{ height: `${notesHeight}%` }}
                        title={`${day.notes_created} notes created`}
                      />
                      {day.notes_created > 0 && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                          {day.notes_created}
                        </div>
                      )}
                    </div>
                    
                    {/* Exports bar */}
                    <div className="relative flex-1">
                      <div
                        className="bg-green-500 rounded-t"
                        style={{ height: `${exportsHeight}%` }}
                        title={`${day.exports} exports`}
                      />
                      {day.exports > 0 && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                          {day.exports}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center space-x-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Notes Created</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Exports</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded p-3 text-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-semibold text-gray-900">
                  {data.daily_trends.reduce((sum, day) => sum + day.notes_created, 0)}
                </div>
                <div className="text-gray-600">Total Notes</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {data.daily_trends.reduce((sum, day) => sum + day.exports, 0)}
                </div>
                <div className="text-gray-600">Total Exports</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {data.weekly_average}
                </div>
                <div className="text-gray-600">Daily Average</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};