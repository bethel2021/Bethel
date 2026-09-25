import React, { useCallback } from 'react';
import { classService } from '../services/classService';
import { getLocalHiddenClassIds, saveLocalHiddenClassIds, saveLocalData } from '../utils/localStore';
import type { ClassGroup, Student, AttendanceRecord, SystemConfig, AdminUser } from '../types';

export function useClassActions(params: {
  currentUser: AdminUser | null;
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  setClasses: React.Dispatch<React.SetStateAction<ClassGroup[]>>;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  syncVersionRef: React.MutableRefObject<number>;
  recentDeletionsRef: React.MutableRefObject<Set<string>>;
  pendingClassMutationsRef: React.MutableRefObject<Map<string, Partial<ClassGroup>>>;
  expectedEntitiesRef: React.MutableRefObject<Map<string, { type: string; timestamp: number; name: string }>>;
  setIsServerAvailable: (available: boolean) => void;
  showSyncNotification: (msg: string) => void;
  notifyCrossTabSync: () => void;
}) {
  const {
    currentUser,
    classes,
    students,
    records,
    config,
    setConfig,
    setClasses,
    setStudents,
    setRecords,
    syncVersionRef,
    recentDeletionsRef,
    pendingClassMutationsRef,
    expectedEntitiesRef,
    setIsServerAvailable,
    showSyncNotification,
    notifyCrossTabSync,
  } = params;

  const handleSaveClass = useCallback(async (classData: Partial<ClassGroup>) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有添加或修改班级的权限！');
    }

    const classId = classData.id || `class-${Date.now()}`;
    const mutationPayload: Partial<ClassGroup> = { ...classData, id: classId };
    pendingClassMutationsRef.current.set(classId, mutationPayload);
    expectedEntitiesRef.current.set(classId, { type: 'class', timestamp: Date.now(), name: classData.name || '' });
    syncVersionRef.current = (syncVersionRef.current || 0) + 1;

    const saveLocally = () => {
      if (classData.isHiddenFromHome !== undefined) {
        const hiddenSet = getLocalHiddenClassIds();
        if (classData.isHiddenFromHome) {
          hiddenSet.add(classId);
        } else {
          hiddenSet.delete(classId);
        }
        saveLocalHiddenClassIds(hiddenSet);
      }

      setClasses(prev => {
        let updated: ClassGroup[];
        if (classData.id) {
          updated = prev.map(c => c.id === classData.id ? { ...c, ...classData } as ClassGroup : c);
        } else {
          const newClass: ClassGroup = {
            id: classId,
            name: classData.name || '新班级',
            ageRange: classData.ageRange || '3-12岁',
            teacher: classData.teacher || '班级负责人',
            subjectTeacher: classData.subjectTeacher || '上课老师',
            classroom: classData.classroom || '主堂教室',
            color: classData.color || 'bg-amber-500',
            groupType: classData.groupType || 'sunday_school',
            description: classData.description || '',
            isHiddenFromHome: !!classData.isHiddenFromHome
          };
          updated = [...prev, newClass];
        }
        saveLocalData({ classes: updated });
        return updated;
      });
    };

    saveLocally();

    try {
      const res = await classService.saveClass(mutationPayload);
      if (res.ok && res.data) {
        setIsServerAvailable(true);
        if (typeof res.data.syncVersion === 'number') {
          syncVersionRef.current = res.data.syncVersion;
        }
        if (res.data.class && res.data.class.id) {
          const authoritativeClasses: ClassGroup[] = Array.isArray(res.data.classes) ? res.data.classes : [];
          const cls = res.data.class;
          setClasses(prev => {
            const updated = authoritativeClasses.length > 0
              ? authoritativeClasses
              : (prev.some(c => c.id === cls.id)
                  ? prev.map(c => c.id === cls.id ? cls : c)
                  : [...prev, cls]);
            saveLocalData({ classes: updated });
            return updated;
          });
        }
        showSyncNotification(`✅ 班级【${classData.name || '信息'}】已保存并同步！`);
      }
    } finally {
      pendingClassMutationsRef.current.delete(classId);
      notifyCrossTabSync();
    }
  }, [currentUser, setClasses, syncVersionRef, pendingClassMutationsRef, expectedEntitiesRef, setIsServerAvailable, showSyncNotification, notifyCrossTabSync]);

  const handleToggleClassVisibility = useCallback(async (classId: string, isHiddenFromHome: boolean) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号没有修改班级首页展示状态的权限！');
    }
    const currentClass = classes.find(c => c.id === classId);
    if (!currentClass) return;

    // 1. Immediately update persistent local hidden set
    const hiddenSet = getLocalHiddenClassIds();
    if (isHiddenFromHome) {
      hiddenSet.add(classId);
    } else {
      hiddenSet.delete(classId);
    }
    saveLocalHiddenClassIds(hiddenSet);

    // 2. Protect with in-flight mutation ref
    const mutationTimestamp = Date.now();
    pendingClassMutationsRef.current.set(classId, {
      ...currentClass,
      isHiddenFromHome,
      _ts: mutationTimestamp
    } as any);
    syncVersionRef.current = (syncVersionRef.current || 0) + 1;

    // 3. Memory state consistency check for hiddenClassIds & classes
    const nextHiddenArray = Array.from(hiddenSet);

    setConfig(prev => {
      const mergedHiddenIds = Array.from(new Set([
        ...(Array.isArray(prev?.hiddenClassIds) ? prev.hiddenClassIds : []),
        ...nextHiddenArray
      ])).filter(id => isHiddenFromHome ? true : id !== classId);
      return {
        ...prev,
        hiddenClassIds: mergedHiddenIds
      };
    });

    setClasses(prev => {
      const updated = prev.map(c => {
        if (c.id === classId) {
          return { ...c, isHiddenFromHome };
        }
        return c;
      });

      const validatedHiddenIds = updated.filter(c => c.isHiddenFromHome === true).map(c => c.id);

      saveLocalData({
        classes: updated,
        config: {
          ...config,
          hiddenClassIds: validatedHiddenIds
        }
      });
      return updated;
    });

    const safeDeletePending = () => {
      setTimeout(() => {
        const currentPending = pendingClassMutationsRef.current.get(classId) as any;
        if (currentPending && currentPending._ts === mutationTimestamp) {
          pendingClassMutationsRef.current.delete(classId);
        }
      }, 3500);
    };

    try {
      const res = await classService.toggleVisibility(classId, isHiddenFromHome, nextHiddenArray);
      if (res.ok && res.data) {
        setIsServerAvailable(true);
        if (typeof res.data.syncVersion === 'number') {
          syncVersionRef.current = res.data.syncVersion;
        }
        if (res.data.config) {
          setConfig(res.data.config);
        }
        const authoritativeClasses: ClassGroup[] = Array.isArray(res.data.classes) ? res.data.classes : [];
        if (authoritativeClasses.length > 0) {
          setClasses(authoritativeClasses);
          saveLocalData({ classes: authoritativeClasses, config: res.data.config });
        } else if (res.data.class) {
          const cls = res.data.class;
          setClasses(prev => {
            const updated = prev.map(c => c.id === classId ? { ...c, ...cls, isHiddenFromHome } : c);
            saveLocalData({ classes: updated, config: res.data?.config });
            return updated;
          });
        }
        showSyncNotification(isHiddenFromHome ? '✅ 班级已设置为不在首页展示' : '✅ 班级已恢复在首页正常展示');
      } else {
        // Fallback save class
        const fallbackRes = await classService.saveClass({ ...currentClass, isHiddenFromHome });
        if (fallbackRes.ok && fallbackRes.data) {
          if (typeof fallbackRes.data.syncVersion === 'number') {
            syncVersionRef.current = fallbackRes.data.syncVersion;
          }
          showSyncNotification('✅ 班级展示状态已同步保存');
        }
      }
    } finally {
      safeDeletePending();
      notifyCrossTabSync();
    }
  }, [currentUser, classes, config, setConfig, setClasses, syncVersionRef, pendingClassMutationsRef, setIsServerAvailable, showSyncNotification, notifyCrossTabSync]);

  const handleDeleteClass = useCallback(async (classId: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有删除班级的权限！');
    }

    recentDeletionsRef.current.add(classId);

    const deleteLocally = () => {
      const enrolledStudents = students.filter(s => s.classId === classId);
      const studentIdsToDelete = new Set(enrolledStudents.map(s => s.id));
      const updatedClasses = classes.filter(c => c.id !== classId);
      const updatedStudents = students.filter(s => s.classId !== classId);
      const updatedRecords = records.filter(r => !studentIdsToDelete.has(r.studentId));

      setClasses(updatedClasses);
      setStudents(updatedStudents);
      setRecords(updatedRecords);
      saveLocalData({ classes: updatedClasses, students: updatedStudents, records: updatedRecords });
      notifyCrossTabSync();
    };

    deleteLocally();

    const res = await classService.deleteClass(classId);
    if (res.ok) {
      setIsServerAvailable(true);
      showSyncNotification('✅ 班级及关联数据已成功删除并同步！');
    }
  }, [currentUser, classes, students, records, setClasses, setStudents, setRecords, recentDeletionsRef, setIsServerAvailable, showSyncNotification, notifyCrossTabSync]);

  return {
    handleSaveClass,
    handleToggleClassVisibility,
    handleDeleteClass,
  };
}
