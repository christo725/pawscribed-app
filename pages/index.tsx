import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { HeartIcon, DocumentTextIcon, ShieldCheckIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Redirecting to dashboard
  }

  return (
    <>
      <Head>
        <title>Pawscribed - AI-Powered Veterinary Documentation</title>
        <meta name="description" content="Streamline your veterinary practice with AI-powered SOAP note generation, secure patient records, and HIPAA-compliant documentation." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
                  <HeartIcon className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Pawscribed</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Sign in
                </Link>
                <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium">
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              AI-Powered{' '}
              <span className="text-indigo-600">Veterinary</span>{' '}
              Documentation
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Transform your clinical notes into professional SOAP documentation instantly. 
              Secure, HIPAA-compliant, and designed specifically for veterinary professionals.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link href="/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10">
                  Start free trial
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link href="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Everything you need for efficient documentation
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
                Powered by Google's Gemini AI with enterprise-grade security and privacy protection.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                  <CpuChipIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">AI-Powered SOAP Notes</h3>
                <p className="mt-2 text-base text-gray-500">
                  Transform natural language into structured SOAP documentation automatically.
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                  <ShieldCheckIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">HIPAA Compliant</h3>
                <p className="mt-2 text-base text-gray-500">
                  Enterprise-grade security with PII protection and secure data handling.
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                  <DocumentTextIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Smart Templates</h3>
                <p className="mt-2 text-base text-gray-500">
                  Pre-built templates for common visit types and customizable workflows.
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                  <HeartIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Client Communication</h3>
                <p className="mt-2 text-base text-gray-500">
                  Generate plain-language summaries for pet owners automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Example Flow */}
          <div className="mt-20 bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              See How It Works
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  1. Input Clinical Notes
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 italic">
                    "Lucy is a 2-year-old Beagle. Owner says she's been scratching her ears a lot. 
                    Found mild redness in both ears, likely yeast. Prescribed antifungal drops."
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  2. Generated SOAP Note
                </h3>
                <div className="space-y-2">
                  <div className="bg-blue-50 p-2 rounded text-xs">
                    <strong>S:</strong> Owner reports increased ear scratching
                  </div>
                  <div className="bg-green-50 p-2 rounded text-xs">
                    <strong>O:</strong> Mild erythema in both ear canals
                  </div>
                  <div className="bg-yellow-50 p-2 rounded text-xs">
                    <strong>A:</strong> Suspected bilateral yeast otitis
                  </div>
                  <div className="bg-purple-50 p-2 rounded text-xs">
                    <strong>P:</strong> Antifungal drops 1x daily for 7 days
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Ready to streamline your practice?
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              Join veterinary professionals who trust Pawscribed for their documentation needs.
            </p>
            <div className="mt-8">
              <Link href="/register" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Start your free trial
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-500">
              <p>&copy; 2024 Pawscribed. All rights reserved.</p>
              <p className="mt-2 text-sm">
                Secure, HIPAA-compliant veterinary documentation powered by AI.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}