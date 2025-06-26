import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { petsAPI, ownersAPI } from '../lib/api';
import { MobileLayout } from '../components/layout/MobileLayout';
import { MobilePatientCard } from '../components/mobile/MobilePatientCard';
import { useResponsive } from '../hooks/useResponsive';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

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

export default function PatientsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isMobile } = useResponsive();
  const { t } = useTranslation(['common', 'veterinary']);
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterOwner, setFilterOwner] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load pets and owners
        const [petsData, ownersData] = await Promise.all([
          petsAPI.getAll({ limit: 200 }),
          ownersAPI.getAll()
        ]);
        
        setPets(petsData);
        setOwners(ownersData);
      } catch (error) {
        console.error('Failed to load patients:', error);
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Filter pets
  const filteredPets = pets.filter(pet => {
    const matchesSearch = !searchQuery || 
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.owner?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecies = !filterSpecies || pet.species === filterSpecies;
    const matchesOwner = !filterOwner || pet.owner_id === parseInt(filterOwner);
    
    return matchesSearch && matchesSpecies && matchesOwner && pet.is_active;
  });

  // Get unique species
  const uniqueSpecies = Array.from(new Set(pets.map(pet => pet.species))).sort();

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

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mobile render with MobileLayout
  if (isMobile) {
    return (
      <MobileLayout title={t('navigation.patients')}>
        {/* Mobile Search */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="relative mb-3">
            <input
              type="text"
              placeholder={t('search.patients')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Mobile Filters */}
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">{t('filters.allSpecies')}</option>
              {uniqueSpecies.map(species => (
                <option key={species} value={species}>
                  {getSpeciesEmoji(species)} {species}
                </option>
              ))}
            </select>

            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">{t('filters.allOwners')}</option>
              {owners.map(owner => (
                <option key={owner.id} value={owner.id.toString()}>
                  {owner.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="mt-3 text-sm text-gray-600 text-center">
            {filteredPets.length} of {pets.length} patients
          </div>
        </div>

        {/* Mobile Patient List */}
        <div className="p-4">
          {filteredPets.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🐾</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {pets.length === 0 ? 'No patients yet' : 'No patients found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {pets.length === 0 
                  ? "Add your first patient to get started."
                  : "Try adjusting your search or filters."
                }
              </p>
              <button
                onClick={() => router.push('/patients/new')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('buttons.addPatient')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPets.map((pet) => (
                <MobilePatientCard
                  key={pet.id}
                  pet={pet}
                  onRecordClick={(petId) => router.push(`/record?patient_id=${petId}`)}
                />
              ))}
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
              <p className="text-sm text-gray-600">
                Manage your veterinary patients
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/patients/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add New Patient
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patients, breeds, or owners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Species</option>
                {uniqueSpecies.map(species => (
                  <option key={species} value={species}>{species}</option>
                ))}
              </select>

              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Owners</option>
                {owners.map(owner => (
                  <option key={owner.id} value={owner.id}>{owner.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredPets.length} of {pets.length} patients
          </div>
        </div>

        {/* Patients Grid */}
        {filteredPets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Found</h3>
            <p className="text-gray-600 mb-4">
              {pets.length === 0 
                ? "You haven't added any patients yet."
                : "No patients match your current filters."
              }
            </p>
            <button
              onClick={() => router.push('/patients/new')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Patient
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPets.map((pet) => (
              <div
                key={pet.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/patients/${pet.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getSpeciesEmoji(pet.species)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{pet.name}</h3>
                      <p className="text-sm text-gray-600">{pet.breed}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/record?patient_id=${pet.id}`);
                    }}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="New recording"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium">{pet.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sex:</span>
                    <span className="font-medium">{pet.sex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{pet.weight} kg</span>
                  </div>
                  {pet.medical_record_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">MRN:</span>
                      <span className="font-medium">{pet.medical_record_number}</span>
                    </div>
                  )}
                </div>

                {pet.owner && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Owner</p>
                    <p className="font-medium text-gray-900">{pet.owner.full_name}</p>
                    <p className="text-xs text-gray-500">{pet.owner.phone_number}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/patients/${pet.id}`);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}