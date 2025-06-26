import React from 'react';

interface WorkflowData {
  current_distribution: {
    [key: string]: number;
  };
  workflow_flow: Array<{
    stage: string;
    count: number;
  }>;
}

interface WorkflowDistributionProps {
  data: WorkflowData;
}

export const WorkflowDistribution: React.FC<WorkflowDistributionProps> = ({ data }) => {
  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 border-gray-300 text-gray-700';
      case 'processing':
        return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'available_for_review':
        return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'ready_to_export':
        return 'bg-green-100 border-green-300 text-green-700';
      case 'exported':
        return 'bg-purple-100 border-purple-300 text-purple-700';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  const formatStageName = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const total = Object.values(data.current_distribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Current Workflow Distribution
      </h3>
      
      {total === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No notes in workflow</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(data.current_distribution).map(([stage, count]) => {
            const percentage = total > 0 ? (count / total * 100) : 0;
            
            return (
              <div key={stage} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStageColor(stage)}`}>
                    {formatStageName(stage)}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStageColor(stage).split(' ')[0]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <span className="font-semibold text-gray-900">{count}</span>
                  <span className="text-sm text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
            );
          })}
          
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-700">Total Notes</span>
              <span className="text-gray-900">{total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};