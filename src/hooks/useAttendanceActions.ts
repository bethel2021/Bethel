import React, { useCallback } from 'react';
import { attendanceService } from '../services/attendanceService';
import {
  saveLocalData,
  addLocalDeletedRecordKey,
  removeLocalDeletedRecordKey,
} from '../utils/localStore';
import { checkIsWithinSundayWindow, getRomeTimeParts } from '../utils/dateUtils';
import type { AttendanceRecord, Student, SystemConfig, AdminUser } from '../types';

export function useAttendanceActions(params: {
  currentUser: AdminUser | null;
  config: SystemConfig;
  students: Student[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  checkinLockRef: React.MutableRefObject<Map<string, number>>;
  pendingMutationsRef: React.MutableRefObject<Set<string>>;
  recentRecordMutationsRef: React.MutableRefObject<Map<string, { record: AttendanceRecord | null; timestamp: number }>>;
  setIsLoginModalOpen: (open: boolean) => void;
  setIsServerAvailable: (available: boolean) => void;
  notifyCrossTabSync: () => void;
}) {
  const {
    currentUser,
    config,
    students,
    setRecords,
    checkinLockRef,
    pendingMutationsRef,
    recentRecordMutationsRef,
    setIsLoginModalOpen,
    setIsServerAvailable,
    notifyCrossTabSync,
  } = params;

  const handleManualUpdate = useCallback(async (data: {
    studentId: string;
    date: string;
    status: 'present' | 'late' | 'excused' | 'absent';
    memoryVerseCompleted?: boolean;
    offeringCompleted?: boolean;
    notes?: string;
  }) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      throw new Error('请先登录教师或管理员账号后再进行签到打卡操作');
    }

    const windowStatus = checkIsWithinSundayWindow(
      new Date(),
      config.checkinStartTime,
      config.checkinEndTime,
      config.testMode
    );

    if (!windowStatus.isAllowed) {
      const msg = '非主日签到开放时段，请等待下一个主日！';
      throw new Error(msg);
    }

    const now = Date.now();
    const studentLockKey = data.studentId;
    const lastTrigger = checkinLockRef.current.get(studentLockKey) || 0;
    // Per-student 250ms debounce lock to prevent duplicate concurrent network dispatch
    if (now - lastTrigger < 250) {
      return;
    }
    checkinLockRef.current.set(studentLockKey, now);

    // Housekeep old lock entries
    if (checkinLockRef.current.size > 200) {
      for (const [id, time] of checkinLockRef.current.entries()) {
        if (now - time > 10000) {
          checkinLockRef.current.delete(id);
        }
      }
    }

    const studentDateKey = `${data.studentId}_${data.date}`;
    const mutationKey = `${data.studentId}_KEY_SPLIT_${data.date}`;
    pendingMutationsRef.current.add(mutationKey);

    let optRecordCreated: AttendanceRecord | null = null;
    let backupPrevRecords: AttendanceRecord[] = [];

    const updateLocally = () => {
      setRecords(prev => {
        backupPrevRecords = prev;
        const existingIdx = prev.findIndex(r => r.studentId === data.studentId && r.date === data.date);

        if (data.status === 'absent') {
          addLocalDeletedRecordKey(studentDateKey);
          if (existingIdx !== -1) {
            addLocalDeletedRecordKey(prev[existingIdx].id);
          }
          const updated = existingIdx !== -1 ? prev.filter((_, i) => i !== existingIdx) : prev;
          saveLocalData({ records: updated });
          return updated;
        }

        removeLocalDeletedRecordKey(studentDateKey);
        removeLocalDeletedRecordKey(data.studentId);
        if (existingIdx !== -1) {
          removeLocalDeletedRecordKey(prev[existingIdx].id);
        }

        const student = students.find(s => s.id === data.studentId);
        const studentName = student ? student.name : '';
        const studentClassId = student ? student.classId : '';
        const nowTimeParts = getRomeTimeParts();
        const nowTimeStr = nowTimeParts.timeStr;

        let finalStatus = data.status;
        if (finalStatus === 'present') {
          let isLate = false;
          if (config.enableLateRule) {
            const [lateH, lateM] = (config.lateThresholdTime || '15:00').split(':').map(Number);
            if (nowTimeParts.hour > lateH || (nowTimeParts.hour === lateH && nowTimeParts.minute > lateM)) {
              isLate = true;
            }
          }
          if (config.checkinEndTime) {
            const [endH, endM] = config.checkinEndTime.split(':').map(Number);
            if (!isNaN(endH) && !isNaN(endM)) {
              if (nowTimeParts.hour > endH || (nowTimeParts.hour === endH && nowTimeParts.minute > endM)) {
                isLate = true;
              }
            }
          }
          if (isLate) {
            finalStatus = 'late';
          }
        }

        const newRecord: AttendanceRecord = {
          id: existingIdx !== -1 ? prev[existingIdx].id : `rec-${data.date}-${data.studentId}-${Date.now()}`,
          studentId: data.studentId,
          studentName,
          classId: studentClassId,
          date: data.date,
          timestamp: new Date().toISOString(),
          timeStr: nowTimeStr,
          status: finalStatus,
          method: 'manual_teacher',
          memoryVerseCompleted: !!data.memoryVerseCompleted,
          offeringCompleted: data.offeringCompleted,
          notes: data.notes
        };

        optRecordCreated = newRecord;
        const updated = existingIdx !== -1
          ? prev.map((r, i) => i === existingIdx ? newRecord : r)
          : [...prev, newRecord];

        saveLocalData({ records: updated });
        return updated;
      });
    };

    updateLocally();

    recentRecordMutationsRef.current.set(mutationKey, {
      record: data.status === 'absent' ? null : optRecordCreated,
      timestamp: Date.now()
    });

    notifyCrossTabSync();

    try {
      const res = await attendanceService.manualCheckin(data);
      if (res.ok && res.data) {
        setIsServerAvailable(true);
        const result = res.data;
        if (result && result.record) {
          removeLocalDeletedRecordKey(result.record.id);
          removeLocalDeletedRecordKey(`${result.record.studentId}_${result.record.date}`);
          setRecords(prev => {
            const existingIdx = prev.findIndex(r => r.studentId === result.record!.studentId && r.date === result.record!.date);
            let updated: AttendanceRecord[];
            if (existingIdx !== -1) {
              updated = prev.map((r, i) => i === existingIdx ? result.record! : r);
            } else {
              updated = [...prev, result.record!];
            }
            saveLocalData({ records: updated });
            return updated;
          });
        } else if (result && result.success && data.status === 'absent') {
          setRecords(prev => {
            const updated = prev.filter(r => !(r.studentId === data.studentId && r.date === data.date));
            saveLocalData({ records: updated });
            return updated;
          });
        }
      } else if (!res.ok) {
        // Rollback optimistic update on server rejection
        if (backupPrevRecords.length > 0) {
          setRecords(backupPrevRecords);
          saveLocalData({ records: backupPrevRecords });
        }
        recentRecordMutationsRef.current.delete(mutationKey);
        throw new Error((res as any)?.error || '签到记录更新失败，请重试');
      }
    } catch (err: any) {
      // Robust Offline Guard: Do NOT rollback if it is a transient network timeout/connectivity issue
      const isNetworkError = !navigator.onLine || 
        String(err.message || '').toLowerCase().includes('fetch') ||
        String(err.message || '').toLowerCase().includes('network') ||
        String(err.message || '').toLowerCase().includes('timeout') ||
        String(err.message || '').toLowerCase().includes('failed to load') ||
        String(err.message || '').toLowerCase().includes('unreachable');

      if (isNetworkError) {
        console.warn('[Offline Mode] Network connectivity issue detected. Saving check-in locally and queuing for auto-sync.');
        setIsServerAvailable(false);
        
        // Cache the offline action to localStorage for later synchronization
        try {
          const raw = localStorage.getItem('bethel_offline_actions') || '[]';
          const queue = JSON.parse(raw);
          // Check if this student and date is already queued to avoid duplicates
          const isDup = queue.some((q: any) => q.studentId === data.studentId && q.date === data.date);
          if (!isDup) {
            queue.push({ ...data, timestamp: Date.now() });
            localStorage.setItem('bethel_offline_actions', JSON.stringify(queue));
          }
        } catch (queueErr) {
          console.error('[Offline Mode] Failed to queue offline action:', queueErr);
        }
      } else {
        // Rollback on non-network hard code/validation errors
        if (backupPrevRecords.length > 0) {
          setRecords(backupPrevRecords);
          saveLocalData({ records: backupPrevRecords });
        }
        recentRecordMutationsRef.current.delete(mutationKey);
        throw err;
      }
    } finally {
      pendingMutationsRef.current.delete(mutationKey);
      notifyCrossTabSync();
    }
  }, [currentUser, config, students, setRecords, checkinLockRef, pendingMutationsRef, recentRecordMutationsRef, setIsLoginModalOpen, setIsServerAvailable, notifyCrossTabSync]);

  // Online Background Replayer
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncOfflineQueue = async () => {
      if (!navigator.onLine) return;
      try {
        const raw = localStorage.getItem('bethel_offline_actions');
        if (!raw) return;
        const queue = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return;

        console.log(`[Offline Sync] Replaying ${queue.length} cached offline check-ins...`);
        const remainingQueue = [];

        for (const action of queue) {
          try {
            await attendanceService.manualCheckin(action);
            console.log(`[Offline Sync] Successfully uploaded offline action for student ${action.studentId}`);
          } catch (err) {
            console.error(`[Offline Sync] Failed to upload action for student ${action.studentId}:`, err);
            remainingQueue.push(action);
          }
        }

        if (remainingQueue.length > 0) {
          localStorage.setItem('bethel_offline_actions', JSON.stringify(remainingQueue));
        } else {
          localStorage.removeItem('bethel_offline_actions');
          console.log('[Offline Sync] All cached check-ins successfully synced to Supabase!');
          setIsServerAvailable(true);
        }
      } catch (err) {
        console.error('[Offline Sync] Error replaying cached queue:', err);
      }
    };

    window.addEventListener('online', syncOfflineQueue);
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', syncOfflineQueue);
    };
  }, [setIsServerAvailable]);

  return {
    handleManualUpdate,
  };
}
