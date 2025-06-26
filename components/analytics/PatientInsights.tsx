import React from 'react';

interface PatientData {
  top_patients: Array<{
    name: string;
    species: string;
    note_count: number;
  }>;
  species_distribution: Array<{
    species: string;
    count: number;
  }>;
  note_types: Array<{
    type: string;
    count: number;
  }>;
}

interface PatientInsightsProps {
  data: PatientData;
}

export const PatientInsights: React.FC<PatientInsightsProps> = ({ data }) => {
  const getSpeciesEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog':
        return '🐕';
      case 'cat':
        return '🐱';
      case 'bird':
        return '🐦';
      case 'rabbit':
        return '🐰';
      case 'hamster':
        return '🐹';
      case 'guinea pig':
        return '🐹';
      case 'ferret':
        return '🦔';
      case 'reptile':
      case 'snake':
      case 'lizard':
        return '🦎';
      case 'fish':
        return '🐠';
      default:
        return '🐾';
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'soap standard':
        return 'bg-blue-100 text-blue-800';
      case 'soap callback':
        return 'bg-green-100 text-green-800';
      case 'dental record':
        return 'bg-purple-100 text-purple-800';
      case 'ultrasound abdomen':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalNotes = data.species_distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Patient Insights
      </h3>

      {totalNotes === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No patient data available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Patients */}
          {data.top_patients.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Most Documented Patients</h4>
              <div className="space-y-2">
                {data.top_patients.slice(0, 5).map((patient, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getSpeciesEmoji(patient.species)}</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{patient.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({patient.species})</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {patient.note_count} notes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Species Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Species Distribution</h4>
            <div className="space-y-2">
              {data.species_distribution.map((species, index) => {
                const percentage = totalNotes > 0 ? (species.count / totalNotes * 100) : 0;
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 w-24">
                      <span className="text-lg">{getSpeciesEmoji(species.species)}</span>
                      <span className="text-sm text-gray-700 capitalize">{species.species}</span>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-right w-16">
                      <span className="text-sm font-medium text-gray-900">{species.count}</span>
                      <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Note Types</h4>
            <div className="grid grid-cols-1 gap-2">
              {data.note_types.map((noteType, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getNoteTypeColor(noteType.type)}`}>
                    {noteType.type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {noteType.count} notes
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-gray-900">{data.top_patients.length}</div>
                <div className="text-gray-600">Active Patients</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">{data.species_distribution.length}</div>
                <div className="text-gray-600">Species Types</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};