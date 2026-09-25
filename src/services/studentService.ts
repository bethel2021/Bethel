import { apiRequest } from './apiClient';
import type { Student } from '../types';

export const studentService = {
  async saveStudent(studentData: any) {
    return apiRequest<{
      status: string;
      syncVersion?: number;
      students?: Student[];
      student?: Student;
    }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  async batchAddStudents(payload: { classId: string; namesText: string; defaultAge?: number; defaultBirthDate?: string }) {
    return apiRequest<{
      status: string;
      syncVersion?: number;
      students?: Student[];
    }>('/api/students/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteStudent(studentId: string) {
    return apiRequest<{
      status: string;
      syncVersion?: number;
      students?: Student[];
    }>(`/api/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    });
  },
};
