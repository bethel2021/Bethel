import { apiRequest } from './apiClient';
import type { AttendanceRecord } from '../types';

export const attendanceService = {
  async manualCheckin(data: {
    studentId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused' | 'leave';
    notes?: string;
    memoryVerseCompleted?: boolean;
    offeringCompleted?: boolean;
  }) {
    return apiRequest<{
      status: string;
      success?: boolean;
      syncVersion?: number;
      record?: AttendanceRecord;
    }>('/api/manual-checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async batchCheckin(data: {
    studentIds: string[];
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused' | 'leave';
  }) {
    return apiRequest<{
      status: string;
      success?: boolean;
      syncVersion?: number;
      records?: AttendanceRecord[];
    }>('/api/batch-checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
