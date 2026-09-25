import React, { useCallback } from 'react';
import { studentService } from '../services/studentService';
import { saveLocalData } from '../utils/localStore';
import type { Student, AttendanceRecord, AdminUser } from '../types';

export function useStudentActions(params: {
  currentUser: AdminUser | null;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  syncVersionRef: React.MutableRefObject<number>;
  recentDeletionsRef: React.MutableRefObject<Set<string>>;
  expectedEntitiesRef: React.MutableRefObject<Map<string, { type: string; timestamp: number; name: string }>>;
  setIsServerAvailable: (available: boolean) => void;
  showSyncNotification: (msg: string) => void;
  notifyCrossTabSync: () => void;
}) {
  const {
    currentUser,
    setStudents,
    setRecords,
    syncVersionRef,
    recentDeletionsRef,
    expectedEntitiesRef,
    setIsServerAvailable,
    showSyncNotification,
    notifyCrossTabSync,
  } = params;

  const handleAddStudent = useCallback(async (studentData: any) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有添加或编辑学员的权限！');
    }

    const assignedId = studentData.id || `s-${Date.now()}`;
    const payload = { ...studentData, id: assignedId };
    expectedEntitiesRef.current.set(assignedId, { type: 'student', timestamp: Date.now(), name: payload.name });

    const saveLocally = () => {
      setStudents(prev => {
        let updated: Student[];
        const exists = prev.some(s => s.id === payload.id);
        if (exists) {
          updated = prev.map(s => s.id === payload.id ? { ...s, ...payload } : s);
        } else {
          updated = [...prev, payload];
        }
        saveLocalData({ students: updated });
        return updated;
      });

      if (payload.id && payload.name) {
        setRecords(prev => {
          const updated = prev.map(r => r.studentId === payload.id ? {
            ...r,
            studentName: payload.name,
            classId: payload.classId || r.classId
          } : r);
          saveLocalData({ records: updated });
          return updated;
        });
      }
      notifyCrossTabSync();
    };

    saveLocally();

    const res = await studentService.saveStudent(payload);
    if (res.ok && res.data) {
      setIsServerAvailable(true);
      if (typeof res.data.syncVersion === 'number' && res.data.syncVersion < syncVersionRef.current) {
        return;
      }
      if (typeof res.data.syncVersion === 'number') {
        syncVersionRef.current = res.data.syncVersion;
      }
      if (Array.isArray(res.data.students) && res.data.students.length > 0) {
        const filtered = res.data.students.filter((s: any) => !recentDeletionsRef.current.has(s.id));
        setStudents(filtered);
        saveLocalData({ students: filtered });
      } else if (res.data.student && !recentDeletionsRef.current.has(res.data.student.id)) {
        const serverStudent = res.data.student;
        setStudents(prev => {
          const exists = prev.some(s => s.id === serverStudent.id);
          const updated = exists ? prev.map(s => s.id === serverStudent.id ? serverStudent : s) : [...prev, serverStudent];
          saveLocalData({ students: updated });
          return updated;
        });
      }
      expectedEntitiesRef.current.delete(assignedId);
      showSyncNotification(`✅ 学员【${payload.name}】档案已保存并同步！`);
    }
  }, [currentUser, setStudents, setRecords, syncVersionRef, recentDeletionsRef, expectedEntitiesRef, setIsServerAvailable, showSyncNotification, notifyCrossTabSync]);

  const handleBatchAddStudents = useCallback(async (classId: string, namesText: string, defaultAge?: number, defaultBirthDate?: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有批量添加学员的权限！');
    }

    const addLocally = () => {
      const lines = namesText.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean);
      const newItems: Student[] = lines.map((name, i) => {
        const id = `s-${Date.now()}-${i}`;
        expectedEntitiesRef.current.set(id, { type: 'student', timestamp: Date.now(), name });
        return {
          id,
          name,
          gender: (i % 2 === 0 ? 'boy' : 'girl') as 'boy' | 'girl',
          age: defaultAge || 7,
          birthDate: defaultBirthDate || '2019-06-01',
          classId,
          parentName: '家长/本人',
          parentPhone: '未填写',
          memberCode: `BTL-${Math.floor(100 + Math.random() * 900)}`,
          joinDate: new Date().toISOString().split('T')[0]
        };
      });
      setStudents(prev => {
        const updated = [...prev, ...newItems];
        saveLocalData({ students: updated });
        return updated;
      });
      notifyCrossTabSync();
    };

    addLocally();

    const res = await studentService.batchAddStudents({ classId, namesText, defaultAge, defaultBirthDate });
    if (res.ok && res.data) {
      setIsServerAvailable(true);
      if (typeof res.data.syncVersion === 'number' && res.data.syncVersion < syncVersionRef.current) {
        return;
      }
      if (typeof res.data.syncVersion === 'number') {
        syncVersionRef.current = res.data.syncVersion;
      }
      if (Array.isArray(res.data.students) && res.data.students.length > 0) {
        const filtered = res.data.students.filter((s: any) => !recentDeletionsRef.current.has(s.id));
        setStudents(filtered);
        saveLocalData({ students: filtered });
      }
      showSyncNotification(`✅ 批量录入学员成功并同步！`);
    }
  }, [currentUser, setStudents, syncVersionRef, recentDeletionsRef, expectedEntitiesRef, setIsServerAvailable, showSyncNotification, notifyCrossTabSync]);

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有删除学员的权限！');
    }

    recentDeletionsRef.current.add(studentId);

    const deleteLocally = () => {
      setStudents(prev => {
        const updated = prev.filter(s => s.id !== studentId);
        saveLocalData({ students: updated });
        return updated;
      });
      setRecords(prev => {
        const updated = prev.filter(r => r.studentId !== studentId);
        saveLocalData({ records: updated });
        return updated;
      });
      notifyCrossTabSync();
    };

    deleteLocally();

    const res = await studentService.deleteStudent(studentId);
    if (res.ok && res.data) {
      setIsServerAvailable(true);
      if (typeof res.data.syncVersion === 'number' && res.data.syncVersion < syncVersionRef.current) {
        return;
      }
      if (typeof res.data.syncVersion === 'number') {
        syncVersionRef.current = res.data.syncVersion;
      }
      if (Array.isArray(res.data.students)) {
        const filtered = res.data.students.filter((s: any) => !recentDeletionsRef.current.has(s.id));
        setStudents(filtered);
        saveLocalData({ students: filtered });
      }
      showSyncNotification('✅ 学员档案已成功删除并同步！');
    }
  }, [currentUser, setStudents, setRecords, syncVersionRef, recentDeletionsRef, setIsServerAvailable, showSyncNotification, notifyCrossTabSync]);

  return {
    handleAddStudent,
    handleBatchAddStudents,
    handleDeleteStudent,
  };
}
