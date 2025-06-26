import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '../../hooks/useTranslation';

interface Owner {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
}

interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  sex: string;
  weight: number;
  microchip_number?: string;
  medical_record_number?: string;
  is_active: boolean;
  owner?: Owner;
  owner_id: number;
}

interface MobilePatientCardProps {
  pet: Pet;
  onRecordClick?: (petId: number) => void;
}

export const MobilePatientCard: React.FC<MobilePatientCardProps> = ({
  pet,
  onRecordClick
}) => {
  const router = useRouter();
  const { t } = useTranslation(['common', 'veterinary']);

  const getSpeciesEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🐦';
      case 'rabbit': return '🐰';
      case 'hamster': return '🐹';
      case 'guinea pig': return '🐹';
      case 'ferret': return '🦔';
      case 'reptile':
      case 'snake':
      case 'lizard': return '🦎';
      case 'fish': return '🐠';
      default: return '🐾';
    }
  };

  const handleRecordClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRecordClick) {
      onRecordClick(pet.id);
    } else {
      router.push(`/record?patient_id=${pet.id}`);
    }
  };

  const handleCardClick = () => {
    router.push(`/patients/${pet.id}`);
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50 transition-colors"
      onClick={handleCardClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{getSpeciesEmoji(pet.species)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-lg truncate">{pet.name}</h3>
            <p className="text-sm text-gray-600 truncate">{pet.breed}</p>
          </div>
        </div>
        
        <button
          onClick={handleRecordClick}
          className="flex-shrink-0 p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
          title={t('recording.startRecording')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>

      {/* Patient Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <span className="text-gray-500">{t('patient.age')}:</span>
          <span className="ml-1 font-medium text-gray-900">{pet.age}y</span>
        </div>
        <div>
          <span className="text-gray-500">{t('patient.sex')}:</span>
          <span className="ml-1 font-medium text-gray-900">{pet.sex}</span>
        </div>
        <div>
          <span className="text-gray-500">{t('patient.weight')}:</span>
          <span className="ml-1 font-medium text-gray-900">{pet.weight}kg</span>
        </div>
        <div>
          <span className="text-gray-500">{t('patient.species')}:</span>
          <span className="ml-1 font-medium text-gray-900">{pet.species}</span>
        </div>
      </div>

      {/* Medical Record Number */}
      {pet.medical_record_number && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
          <span className="text-gray-500">MRN:</span>
          <span className="ml-1 font-mono font-medium text-gray-900">
            {pet.medical_record_number}
          </span>
        </div>
      )}

      {/* Owner Information */}
      {pet.owner && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{pet.owner.full_name}</p>
              <p className="text-sm text-gray-500 truncate">{pet.owner.phone_number}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${pet.owner?.phone_number}`;
              }}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Call owner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="pt-3 border-t border-gray-200 mt-3">
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/patients/${pet.id}`);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('buttons.view')} {t('common.details')} →
          </button>
          
          <div className="flex items-center space-x-3 text-gray-500">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {/* This would show actual note count */}
              0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};