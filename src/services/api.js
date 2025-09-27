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

export default api;