import { apiRequest } from './apiClient';
import type { ClassGroup, SystemConfig } from '../types';

export const classService = {
  async saveClass(classData: Partial<ClassGroup>) {
    return apiRequest<{
      status: string;
      syncVersion?: number;
      class?: ClassGroup;
      classes?: ClassGroup[];
    }>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  },

  async toggleVisibility(classId: string, isHiddenFromHome: boolean, hiddenClassIds: string[]) {
    return apiRequest<{
      status: string;
      syncVersion?: number;
      class?: ClassGroup;
      classes?: ClassGroup[];
      config?: SystemConfig;
    }>(`/api/classes/${encodeURIComponent(classId)}/visibility`, {
      method: 'POST',
      body: JSON.stringify({ isHiddenFromHome, hiddenClassIds }),
    });
  },

  async deleteClass(classId: string) {
    return apiRequest<{
      status: string;
      syncVersion?: number;
      classes?: ClassGroup[];
    }>(`/api/classes/${encodeURIComponent(classId)}`, {
      method: 'DELETE',
    });
  },
};
