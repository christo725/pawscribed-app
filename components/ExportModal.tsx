import React, { useState } from 'react';
import { exportAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteIds: number[];
  noteCount: number;
}

type ExportType = 'pdf' | 'email';
type ExportFormat = 'individual' | 'combined';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  noteIds,
  noteCount
}) => {
  const [exportType, setExportType] = useState<ExportType>('pdf');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('individual');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (noteIds.length === 0) {
      toast.error('No notes selected for export');
      return;
    }

    if (exportType === 'email' && (!recipientEmail || !recipientName)) {
      toast.error('Please provide recipient email and name for email export');
      return;
    }

    setIsExporting(true);

    try {
      if (exportType === 'pdf') {
        if (noteIds.length === 1) {
          // Single note PDF export
          const result = await exportAPI.exportNotePdf(noteIds[0]);
          if (result.success) {
            // Trigger download
            const downloadResult = await exportAPI.downloadExport(result.export_id);
            const blob = new Blob([downloadResult.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.pdf_filename || 'soap_note.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success('PDF exported successfully');
          }
        } else {
          // Batch PDF export
          const combineNotes = exportFormat === 'combined';
          const result = await exportAPI.exportBatchPdf(noteIds, combineNotes);
          
          if (result.success) {
            if (combineNotes && result.download_url) {
              // Download combined PDF
              const downloadResult = await exportAPI.downloadExport(result.export_id);
              const blob = new Blob([downloadResult.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'combined_soap_notes.pdf';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
            
            toast.success(`${noteCount} notes exported as PDF${combineNotes ? ' (combined)' : 's'}`);
          }
        }
      } else if (exportType === 'email') {
        if (noteIds.length === 1) {
          // Single note email
          const result = await exportAPI.emailNote(
            noteIds[0],
            recipientEmail,
            recipientName,
            customMessage || undefined
          );
          
          if (result.success) {
            toast.success(`Email sent successfully to ${recipientEmail}`);
          }
        } else {
          // Batch email
          const result = await exportAPI.emailBatchNotes(
            noteIds,
            recipientEmail,
            recipientName,
            customMessage || undefined
          );
          
          if (result.success) {
            toast.success(`${result.attachments_sent} notes emailed to ${recipientEmail}`);
          }
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(error.response?.data?.detail || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Export {noteCount} Note{noteCount !== 1 ? 's' : ''}
          </h3>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportType('pdf')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  exportType === 'pdf'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </div>
              </button>
              <button
                onClick={() => setExportType('email')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  exportType === 'email'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Email
                </div>
              </button>
            </div>
          </div>

          {/* PDF Format Options */}
          {exportType === 'pdf' && noteCount > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF Format
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="individual"
                    checked={exportFormat === 'individual'}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="mr-2"
                  />
                  <span>Individual PDFs for each note</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="combined"
                    checked={exportFormat === 'combined'}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="mr-2"
                  />
                  <span>Combined PDF with all notes</span>
                </label>
              </div>
            </div>
          )}

          {/* Email Fields */}
          {exportType === 'email' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Pet Owner Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a personal message..."
                />
              </div>
            </div>
          )}

          {/* Export Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Export Summary:</p>
                <ul className="mt-1 space-y-1">
                  <li>• {noteCount} note{noteCount !== 1 ? 's' : ''} selected</li>
                  <li>• Format: Professional SOAP note PDF</li>
                  {exportType === 'email' && (
                    <li>• Will be sent to: {recipientEmail || 'Not specified'}</li>
                  )}
                  {exportType === 'pdf' && noteCount > 1 && (
                    <li>• {exportFormat === 'combined' ? 'Combined into one PDF' : 'Separate PDF files'}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || (exportType === 'email' && (!recipientEmail || !recipientName))}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {exportType === 'pdf' ? 'Generating...' : 'Sending...'}
                </>
              ) : (
                <>
                  {exportType === 'pdf' ? 'Download PDF' : 'Send Email'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};