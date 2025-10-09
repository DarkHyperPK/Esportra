// API Client for MongoDB Backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async logout() {
    this.setToken(null);
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Verification endpoints
  async submitVerification(formData) {
    const response = await fetch(`${this.baseURL}/verification/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Verification submission failed');
    }
    return data;
  }

  async getMyVerificationRequests() {
    return this.request('/verification/my-requests');
  }

  async getVerificationRequest(requestId) {
    return this.request(`/verification/${requestId}`);
  }

  // Teams endpoints
  async getTeams(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/teams?${queryString}`);
  }

  async createTeam(teamData) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  // Tournaments endpoints
  async getTournaments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tournaments?${queryString}`);
  }

  async createTournament(tournamentData) {
    return this.request('/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournamentData),
    });
  }

  // Users endpoints
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users?${queryString}`);
  }

  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }

  // Admin endpoints
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAllVerificationRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/verification/admin/all?${queryString}`);
  }

  async approveVerificationRequest(requestId, notes = '') {
    return this.request(`/verification/${requestId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  async rejectVerificationRequest(requestId, reason, notes = '') {
    return this.request(`/verification/${requestId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason, notes }),
    });
  }

  async addVerificationComment(requestId, comment) {
    return this.request(`/verification/${requestId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;
