const API_BASE = '/api';

const api = {
  async req(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'API Error');
      }

      return data.data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  get: (endpoint) => api.req(endpoint),
  post: (endpoint, body) => api.req(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) => api.req(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => api.req(endpoint, { method: 'DELETE' }),
};
