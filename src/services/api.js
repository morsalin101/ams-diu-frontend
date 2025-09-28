import axios from 'axios';

// Base URL for the API
const BASE_URL = 'https://ams-diu-backend.onrender.com';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API endpoints
export const examAPI = {
  // Create new exam
  createExam: async (examData) => {
    try {
      const response = await api.post('/api/create-exam/', examData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all questions for an exam
  getExamQuestions: async (examId) => {
    try {
      const response = await api.get(`/api/exam-questions/${examId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Edit specific question
  editQuestion: async (examId, questionId, questionData) => {
    try {
      const response = await api.put(`/api/exam-questions/${examId}/question/${questionId}/`, questionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete specific question
  deleteQuestion: async (examId, questionId) => {
    try {
      const response = await api.delete(`/api/exam-questions/${examId}/question/${questionId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add new question
  addQuestion: async (examId, questionData) => {
    try {
      const response = await api.post(`/api/exam-questions/${examId}/add/`, questionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all exams
  getAllExams: async () => {
    try {
      const response = await api.get('/api/all-exams/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete exam
  deleteExam: async (examId) => {
    try {
      const response = await api.delete(`/api/exam-questions/${examId}/delete/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get questions statistics
  getQuestionsStats: async () => {
    try {
      const response = await api.get('/api/questions-stats/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Students API endpoints
export const studentsAPI = {
  // Get all students
  getAllStudents: async () => {
    try {
      const response = await api.get('/api/students/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create new student
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/api/students/', studentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update student
  updateStudent: async (studentId, studentData) => {
    try {
      const response = await api.put(`/api/students/${studentId}/`, studentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete student
  deleteStudent: async (studentId) => {
    try {
      const response = await api.delete(`/api/students/${studentId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Schedule API endpoints
export const scheduleAPI = {
  // Create exam schedule
  createSchedule: async (scheduleData) => {
    try {
      const response = await api.post('/api/schedules/create/', scheduleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all exam schedules
  getAllSchedules: async () => {
    try {
      const response = await api.get('/api/schedules/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete exam schedule
  deleteSchedule: async (scheduleId) => {
    try {
      const response = await api.delete(`/api/schedules/${scheduleId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Authentication API endpoints
export const authAPI = {
  // Login
  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login/', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Users API endpoints
export const usersAPI = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await api.get('/api/users/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create user
  createUser: async (userData) => {
    try {
      const response = await api.post('/api/users/create/', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/api/users/${userId}/update/`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/api/users/${userId}/delete/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get single user
  getUser: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Role API endpoints
export const roleAPI = {
  // Get all roles
  getAllRoles: async () => {
    try {
      const response = await api.get('/api/roles/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create role
  createRole: async (roleData) => {
    try {
      const response = await api.post('/api/roles/create/', roleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get role by ID
  getRole: async (roleId) => {
    try {
      const response = await api.get(`/api/roles/${roleId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update role
  updateRole: async (roleId, roleData) => {
    try {
      const response = await api.put(`/api/roles/${roleId}/update/`, roleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete role
  deleteRole: async (roleId) => {
    try {
      const response = await api.delete(`/api/roles/${roleId}/delete/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default api;