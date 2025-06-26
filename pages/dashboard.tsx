import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  UserIcon, 
  HeartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MicrophoneIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { chartAPI, petsAPI, ownersAPI } from '../lib/api';

interface ChartFormData {
  pet_id: number;
  visit_type: string;
  chief_complaint: string;
  symptoms: string;
  physical_exam: string;
  diagnostic_findings: string;
  clinical_notes: string;
  style: string;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  sex?: string;
  owner: {
    first_name: string;
    last_name: string;
  };
}

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  
  // Redirect to new workflow dashboard
  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/workflow');
    }
  }, [isAuthenticated, loading, router]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [generatedSOAP, setGeneratedSOAP] = useState<SOAPNote | null>(null);
  const [clientSummary, setClientSummary] = useState<string>('');
  const [validation, setValidation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'soap' | 'summary'>('form');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChartFormData>();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPets();
    }
  }, [isAuthenticated]);

  const fetchPets = async () => {
    try {
      const petsData = await petsAPI.getAll();
      setPets(petsData);
    } catch (error) {
      console.error('Failed to fetch pets:', error);
    }
  };

  const onSubmit = async (data: ChartFormData) => {
    setIsGenerating(true);
    setActiveTab('soap');

    try {
      const result = await chartAPI.generateChart({
        pet_id: Number(data.pet_id),
        visit_type: data.visit_type,
        clinical_notes: data.clinical_notes,
        chief_complaint: data.chief_complaint,
        symptoms: data.symptoms,
        physical_exam: data.physical_exam,
        diagnostic_findings: data.diagnostic_findings,
        style: data.style,
      });

      if (result.success) {
        setGeneratedSOAP(result.soap);
        setClientSummary(result.client_summary || '');
        setValidation(result.validation);
        toast.success('SOAP note generated successfully!');
      } else {
        toast.error(result.error || 'Failed to generate chart');
      }
    } catch (error: any) {
      toast.error('Failed to generate chart');
      console.error('Chart generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getValidationColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard - Pawscribed</title>
        <meta name="description" content="Veterinary documentation dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
                  <HeartIcon className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Pawscribed</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">Welcome, {user?.full_name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-6">
                  <DocumentTextIcon className="h-6 w-6 text-indigo-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Generate Chart</h2>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet
                    </label>
                    <select
                      {...register('pet_id', { required: 'Please select a pet' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a pet...</option>
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} - {pet.species} ({pet.owner.first_name} {pet.owner.last_name})
                        </option>
                      ))}
                    </select>
                    {errors.pet_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.pet_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visit Type
                    </label>
                    <select
                      {...register('visit_type', { required: 'Please select visit type' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select visit type...</option>
                      <option value="wellness">Wellness Check</option>
                      <option value="injury">Injury/Trauma</option>
                      <option value="illness">Illness</option>
                      <option value="dental">Dental</option>
                      <option value="surgery">Surgery</option>
                      <option value="vaccination">Vaccination</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.visit_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.visit_type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style
                    </label>
                    <select
                      {...register('style')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="detailed">Detailed</option>
                      <option value="concise">Concise</option>
                      <option value="legal-ready">Legal Ready</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chief Complaint
                    </label>
                    <input
                      {...register('chief_complaint')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Owner's main concern..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Symptoms
                    </label>
                    <textarea
                      {...register('symptoms')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Observable symptoms..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Physical Exam
                    </label>
                    <textarea
                      {...register('physical_exam')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Examination findings..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diagnostic Findings
                    </label>
                    <textarea
                      {...register('diagnostic_findings')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Lab results, imaging, etc..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinical Notes
                    </label>
                    <textarea
                      {...register('clinical_notes', { required: 'Clinical notes are required' })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Describe the visit in your own words..."
                    />
                    {errors.clinical_notes && (
                      <p className="mt-1 text-sm text-red-600">{errors.clinical_notes.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </div>
                    ) : (
                      'Generate SOAP Note'
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-2">
              {generatedSOAP ? (
                <div className="bg-white shadow rounded-lg">
                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                      <button
                        onClick={() => setActiveTab('soap')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${
                          activeTab === 'soap'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        SOAP Note
                      </button>
                      <button
                        onClick={() => setActiveTab('summary')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${
                          activeTab === 'summary'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Client Summary
                      </button>
                    </nav>
                  </div>

                  <div className="p-6">
                    {activeTab === 'soap' && (
                      <div className="space-y-6">
                        {validation && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                              <span className="font-medium">Completeness Score: </span>
                              <span className={`font-bold ${getValidationColor(validation.completeness_score)}`}>
                                {Math.round(validation.completeness_score * 100)}%
                              </span>
                            </div>
                            {validation.missing_elements?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600 mb-1">Missing elements:</p>
                                <ul className="text-sm text-red-600 list-disc list-inside">
                                  {validation.missing_elements.map((element: string, index: number) => (
                                    <li key={index}>{element}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Subjective</h3>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {generatedSOAP.subjective}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Objective</h3>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {generatedSOAP.objective}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Assessment</h3>
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {generatedSOAP.assessment}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Plan</h3>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {generatedSOAP.plan}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'summary' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Client Summary</h3>
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {clientSummary || 'No client summary generated.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No SOAP note yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Fill out the form and click "Generate SOAP Note" to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}