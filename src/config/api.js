// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000, // 10 seconds
};

export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    REFRESH: '/auth/refresh',
  },
  VERIFICATION: {
    SUBMIT: '/verification/submit',
    MY_REQUESTS: '/verification/my-requests',
    GET_REQUEST: '/verification/:id',
    ADMIN_ALL: '/verification/admin/all',
    APPROVE: '/verification/:id/approve',
    REJECT: '/verification/:id/reject',
    COMMENT: '/verification/:id/comment',
  },
  TEAMS: {
    LIST: '/teams',
    CREATE: '/teams',
    GET: '/teams/:id',
    UPDATE: '/teams/:id',
    DELETE: '/teams/:id',
  },
  TOURNAMENTS: {
    LIST: '/tournaments',
    CREATE: '/tournaments',
    GET: '/tournaments/:id',
    UPDATE: '/tournaments/:id',
    DELETE: '/tournaments/:id',
  },
  USERS: {
    LIST: '/users',
    GET: '/users/:id',
    UPDATE: '/users/:id',
  },
  ADMIN: {
    STATS: '/admin/stats',
  },
  HEALTH: '/health',
};
