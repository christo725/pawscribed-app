import React from 'react';

interface OverviewData {
  total_notes: number;
  completed_notes: number;
  completion_rate: number;
  avg_notes_per_day: number;
  total_exports: number;
  status_distribution: {
    [key: string]: number;
  };
}

interface AnalyticsOverviewProps {
  data: OverviewData;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ data }) => {
  const cards = [
    {
      title: 'Total Notes',
      value: data.total_notes,
      icon: '📝',
      color: 'blue'
    },
    {
      title: 'Completion Rate',
      value: `${data.completion_rate}%`,
      icon: '✅',
      color: 'green'
    },
    {
      title: 'Daily Average',
      value: data.avg_notes_per_day,
      icon: '📊',
      color: 'purple'
    },
    {
      title: 'Total Exports',
      value: data.total_exports,
      icon: '📤',
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'green':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'purple':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'orange':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`p-6 rounded-lg border-2 ${getColorClasses(card.color)}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{card.title}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
            <div className="text-2xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
};