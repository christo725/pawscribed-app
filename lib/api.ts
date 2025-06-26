import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          
          // Update tokens
          Cookies.set('auth_token', access_token, {
            expires: 1/48, // 30 minutes
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
          
          Cookies.set('refresh_token', newRefreshToken, {
            expires: 7, // 7 days
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          Cookies.remove('auth_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user } = response.data;
    
    // Store tokens in secure cookies
    Cookies.set('auth_token', access_token, { 
      expires: 1/48, // 30 minutes
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    Cookies.set('refresh_token', refresh_token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    return { user, access_token, refresh_token };
  },

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    veterinary_license?: string;
  }) {
    const response = await api.post('/auth/register', userData);
    const { access_token, refresh_token, user } = response.data;
    
    // Store tokens in secure cookies
    Cookies.set('auth_token', access_token, { 
      expires: 1/48, // 30 minutes
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    Cookies.set('refresh_token', refresh_token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    return { user, access_token, refresh_token };
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    Cookies.remove('auth_token');
    Cookies.remove('refresh_token');
    window.location.href = '/login';
  }
};

// Owners API
export const ownersAPI = {
  async create(ownerData: any) {
    const response = await api.post('/owners', ownerData);
    return response.data;
  },

  async getAll() {
    const response = await api.get('/owners');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/owners/${id}`);
    return response.data;
  }
};

// Pets API
export const petsAPI = {
  async create(petData: any) {
    const response = await api.post('/pets', petData);
    return response.data;
  },

  async getAll(params?: {
    search?: string;
    owner_id?: number;
    species?: string;
    skip?: number;
    limit?: number;
  }) {
    const response = await api.get('/pets', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/pets/${id}`);
    return response.data;
  },

  async update(id: number, petData: any) {
    const response = await api.put(`/pets/${id}`, petData);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/pets/${id}`);
    return response.data;
  }
};

// Visits API
export const visitsAPI = {
  async create(visitData: any) {
    const response = await api.post('/visits', visitData);
    return response.data;
  },

  async getAll(params?: { pet_id?: number }) {
    const response = await api.get('/visits', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/visits/${id}`);
    return response.data;
  }
};

// Chart Generation API
export const chartAPI = {
  async generateChart(chartData: {
    pet_id: number;
    visit_type: string;
    clinical_notes: string;
    chief_complaint?: string;
    symptoms?: string;
    physical_exam?: string;
    diagnostic_findings?: string;
    style?: string;
  }) {
    try {
      const response = await api.post('/generate-chart', chartData);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate chart');
      throw error;
    }
  },

  async validateChart(visitId: number) {
    try {
      const response = await api.post(`/validate-chart/${visitId}`);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to validate chart');
      throw error;
    }
  }
};

// Templates API
export const templatesAPI = {
  async create(templateData: any) {
    const response = await api.post('/templates', templateData);
    return response.data;
  },

  async getAll(visitType?: string) {
    const params = visitType ? { visit_type: visitType } : {};
    const response = await api.get('/templates', { params });
    return response.data;
  }
};

// Audio API
export const audioAPI = {
  async upload(file: File, patientId?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (patientId) {
      formData.append('patient_id', patientId.toString());
    }

    const response = await api.post('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getFiles() {
    const response = await api.get('/audio/files');
    return response.data;
  },

  async getTranscriptionStatus(jobId: number) {
    const response = await api.get(`/transcriptions/${jobId}`);
    return response.data;
  }
};

// Notes API
export const notesAPI = {
  async create(noteData: any) {
    const response = await api.post('/notes', noteData);
    return response.data;
  },

  async getAll(params?: {
    status?: string;
    patient_id?: number;
    skip?: number;
    limit?: number;
  }) {
    const response = await api.get('/notes', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },

  async updateStatus(id: number, status: string) {
    const response = await api.put(`/notes/${id}/status?status=${status}`);
    return response.data;
  },

  // Batch operations
  async batchUpdateStatus(noteIds: number[], status: string) {
    const response = await api.post(`/notes/batch/status?status=${status}`, noteIds);
    return response.data;
  },

  async batchDelete(noteIds: number[]) {
    const response = await api.delete('/notes/batch', {
      data: noteIds
    });
    return response.data;
  },

  async batchExport(noteIds: number[], format: string = 'pdf') {
    const response = await api.post(`/notes/batch/export?export_format=${format}`, noteIds);
    return response.data;
  }
};

// Workflow API
export const workflowAPI = {
  async getStats() {
    const response = await api.get('/workflow/stats');
    return response.data;
  }
};

// Export API
export const exportAPI = {
  async exportNotePdf(noteId: number) {
    const response = await api.post(`/export/pdf/${noteId}`);
    return response.data;
  },

  async exportBatchPdf(noteIds: number[], combineNotes: boolean = true) {
    const response = await api.post('/export/pdf/batch', noteIds, {
      params: { combine_notes: combineNotes }
    });
    return response.data;
  },

  async emailNote(noteId: number, recipientEmail: string, recipientName: string, customMessage?: string) {
    const response = await api.post(`/export/email/${noteId}`, null, {
      params: {
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        custom_message: customMessage
      }
    });
    return response.data;
  },

  async emailBatchNotes(noteIds: number[], recipientEmail: string, recipientName: string, customMessage?: string) {
    const response = await api.post('/export/email/batch', noteIds, {
      params: {
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        custom_message: customMessage
      }
    });
    return response.data;
  },

  async downloadExport(exportId: number) {
    const response = await api.get(`/export/download/${exportId}`, {
      responseType: 'blob'
    });
    return response;
  },

  async getExportHistory(skip: number = 0, limit: number = 50, exportType?: string) {
    const params: any = { skip, limit };
    if (exportType) params.export_type = exportType;
    
    const response = await api.get('/export/history', { params });
    return response.data;
  },

  async testEmailConnection() {
    const response = await api.get('/export/test-email');
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  async getWorkflowAnalytics(startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get('/analytics/workflow', { params });
    return response.data;
  },

  async getPerformanceSummary(period: 'week' | 'month' | 'quarter' = 'week') {
    const response = await api.get('/analytics/performance', { 
      params: { period } 
    });
    return response.data;
  }
};

// Team Management API
export const teamAPI = {
  async getMembers() {
    const response = await api.get('/team/members');
    return response.data;
  },

  async createMember(memberData: {
    email: string;
    full_name: string;
    role: string;
    veterinary_license?: string;
  }) {
    const response = await api.post('/team/members', memberData);
    return response.data;
  },

  async updateMember(memberId: number, updateData: {
    full_name?: string;
    role?: string;
    veterinary_license?: string;
    is_active?: boolean;
  }) {
    const response = await api.put(`/team/members/${memberId}`, updateData);
    return response.data;
  },

  async removeMember(memberId: number) {
    const response = await api.delete(`/team/members/${memberId}`);
    return response.data;
  },

  async getActivity(days: number = 7) {
    const response = await api.get('/team/activity', { params: { days } });
    return response.data;
  }
};

export default api;