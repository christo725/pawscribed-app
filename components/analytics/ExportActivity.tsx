import React from 'react';

interface ExportData {
  total_exports: number;
  success_rate: number;
  export_types: {
    [key: string]: number;
  };
  top_recipients: Array<{
    email: string;
    count: number;
  }>;
}

interface ExportActivityProps {
  data: ExportData;
}

export const ExportActivity: React.FC<ExportActivityProps> = ({ data }) => {
  const exportTypeNames: { [key: string]: string } = {
    pdf: 'PDF Downloads',
    email: 'Email Exports'
  };

  const getExportTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'email':
        return '✉️';
      default:
        return '📤';
    }
  };

  const totalExportsByType = Object.values(data.export_types).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Export Activity
      </h3>

      {data.total_exports === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No export activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.total_exports}
              </div>
              <div className="text-sm text-gray-600">Total Exports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.success_rate}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>

          {/* Export Types */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Export Types</h4>
            {Object.entries(data.export_types).map(([type, count]) => {
              const percentage = totalExportsByType > 0 ? (count / totalExportsByType * 100) : 0;
              
              return (
                <div key={type} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 w-32">
                    <span className="text-lg">{getExportTypeIcon(type)}</span>
                    <span className="text-sm text-gray-700">
                      {exportTypeNames[type] || type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right w-16">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Recipients */}
          {data.top_recipients.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Top Email Recipients</h4>
              <div className="space-y-2">
                {data.top_recipients.slice(0, 5).map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {index + 1}.
                      </span>
                      <span className="text-sm text-gray-700 truncate max-w-48">
                        {recipient.email}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {recipient.count} emails
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Rate Indicator */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Export Reliability:</span>
              <div className="flex items-center space-x-2">
                {data.success_rate >= 95 ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-medium">Excellent</span>
                  </>
                ) : data.success_rate >= 85 ? (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-700 font-medium">Good</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span className="text-orange-700 font-medium">Needs Attention</span>
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