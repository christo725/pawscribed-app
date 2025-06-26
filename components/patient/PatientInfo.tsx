import React from 'react';

interface Patient {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  sex: string;
  weight: number;
  microchip_number?: string;
  medical_record_number?: string;
  owner: {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
  };
}

interface PatientInfoProps {
  patient: Patient;
}

export const PatientInfo: React.FC<PatientInfoProps> = ({ patient }) => {
  const patientDetails = [
    { label: 'Species', value: patient.species, icon: '🐾' },
    { label: 'Breed', value: patient.breed, icon: '🏷️' },
    { label: 'Age', value: `${patient.age} years`, icon: '🎂' },
    { label: 'Sex', value: patient.sex, icon: '♀♂' },
    { label: 'Weight', value: `${patient.weight} kg`, icon: '⚖️' },
    { label: 'Microchip', value: patient.microchip_number || 'Not recorded', icon: '💳' },
    { label: 'Medical Record #', value: patient.medical_record_number || 'Not assigned', icon: '🏥' }
  ];

  const ownerDetails = [
    { label: 'Name', value: patient.owner.full_name, icon: '👤' },
    { label: 'Email', value: patient.owner.email, icon: '✉️' },
    { label: 'Phone', value: patient.owner.phone_number, icon: '📞' }
  ];

  return (
    <div className="space-y-6">
      {/* Patient Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patientDetails.map((detail, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{detail.icon}</span>
              <div>
                <p className="text-sm text-gray-600">{detail.label}</p>
                <p className="font-medium text-gray-900">{detail.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Owner Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ownerDetails.map((detail, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{detail.icon}</span>
              <div>
                <p className="text-sm text-gray-600">{detail.label}</p>
                <p className="font-medium text-gray-900">{detail.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Alerts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Alerts</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">No active medical alerts</p>
              <p className="text-xs text-yellow-600 mt-1">
                Medical alerts will appear here when added to the patient's record
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vaccination Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vaccination Status</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-blue-800">Vaccination tracking coming soon</p>
              <p className="text-xs text-blue-600 mt-1">
                Track rabies, DHPP, and other vaccinations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};