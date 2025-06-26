import React from 'react';

interface QualityData {
  avg_transcription_confidence: number;
  total_transcriptions: number;
  section_completeness: Array<{
    section: string;
    completion_rate: number;
  }>;
  total_notes_analyzed: number;
}

interface QualityMetricsProps {
  data: QualityData;
}

export const QualityMetrics: React.FC<QualityMetricsProps> = ({ data }) => {
  const getSectionIcon = (section: string) => {
    switch (section.toLowerCase()) {
      case 'subjective':
        return '👂';
      case 'objective':
        return '🔍';
      case 'assessment':
        return '🎯';
      case 'plan':
        return '📋';
      default:
        return '📝';
    }
  };

  const getQualityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getQualityLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const overallCompleteness = data.section_completeness.length > 0 
    ? data.section_completeness.reduce((sum, section) => sum + section.completion_rate, 0) / data.section_completeness.length
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Quality Metrics
      </h3>

      {data.total_notes_analyzed === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No quality data available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Transcription Quality */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Transcription Quality</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Average Confidence</span>
                <span className={`text-lg font-bold ${getQualityColor(data.avg_transcription_confidence)}`}>
                  {data.avg_transcription_confidence}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getQualityBg(data.avg_transcription_confidence)}`}
                  style={{ width: `${data.avg_transcription_confidence}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{data.total_transcriptions} transcriptions</span>
                <span>{getQualityLabel(data.avg_transcription_confidence)}</span>
              </div>
            </div>
          </div>

          {/* SOAP Section Completeness */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">SOAP Section Completeness</h4>
            <div className="space-y-3">
              {data.section_completeness.map((section, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 w-24">
                    <span className="text-lg">{getSectionIcon(section.section)}</span>
                    <span className="text-sm text-gray-700">{section.section}</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getQualityBg(section.completion_rate)}`}
                      style={{ width: `${section.completion_rate}%` }}
                    />
                  </div>
                  <div className="text-right w-16">
                    <span className={`text-sm font-medium ${getQualityColor(section.completion_rate)}`}>
                      {section.completion_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Quality Score */}
          <div className="pt-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">Overall Documentation Quality</div>
                <div className={`text-3xl font-bold ${getQualityColor(overallCompleteness)}`}>
                  {overallCompleteness.toFixed(1)}%
                </div>
                <div className={`text-sm font-medium ${getQualityColor(overallCompleteness)}`}>
                  {getQualityLabel(overallCompleteness)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{data.total_notes_analyzed}</div>
                  <div className="text-xs text-gray-600">Notes Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{data.total_transcriptions}</div>
                  <div className="text-xs text-gray-600">Transcriptions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Insights */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Quality Insights</h5>
            <div className="text-sm text-blue-800 space-y-1">
              {overallCompleteness >= 90 && (
                <p>• Excellent documentation completeness! Keep up the great work.</p>
              )}
              {overallCompleteness < 75 && (
                <p>• Consider reviewing incomplete SOAP sections to improve documentation quality.</p>
              )}
              {data.avg_transcription_confidence < 80 && (
                <p>• Low transcription confidence may indicate audio quality issues.</p>
              )}
              {data.avg_transcription_confidence >= 95 && (
                <p>• Excellent transcription quality! Clear audio recording is paying off.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};