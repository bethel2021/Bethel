import React, { useState, useEffect, useRef } from 'react';
import { 
  Church, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles
} from 'lucide-react';
import type { SystemConfig, ClassGroup, Student, AttendanceRecord, AdminUser, AdminAccount } from './types';
import { Header } from './components/Header';
import { TodayDashboard } from './components/TodayDashboard';
import { AttendanceStatsView } from './components/AttendanceStatsView';
import { BirthdayReminderView } from './components/BirthdayReminderView';
import { LoginModal } from './components/LoginModal';
import { MultiDeviceSyncModal } from './components/MultiDeviceSyncModal';
import { useStudentActions } from './hooks/useStudentActions';
import { useClassActions } from './hooks/useClassActions';
import { useAttendanceActions } from './hooks/useAttendanceActions';

const SettingsModal = React.lazy(() =>
  import('./components/SettingsModal').then(m => ({ default: m.SettingsModal }))
);
import { 
  getLocalData, 
  saveLocalData, 
  resetLocalData, 
  getLocalAccounts, 
  saveLocalAccounts,
  saveLocalAccount, 
  deleteLocalAccount, 
  updateLocalAccountPassword,
  exportLocalBackup,
  importLocalBackup,
  getLocalHiddenClassIds,
  saveLocalHiddenClassIds,
  getLocalDeletedRecordKeys,
  addLocalDeletedRecordKey,
  removeLocalDeletedRecordKey
} from './utils/localStore';
import { initialClasses, initialStudents, initialSystemConfig, generateInitialRecords, initialTeachers } from './mockData';
import { getCurrentRomeTimeStr, getCurrentRomeFullTimeStr, getRomeTimeParts, checkIsWithinSundayWindow, getActiveSundayDate } from './utils/dateUtils';
import { getAllStudentsBirthdayInfo } from './utils/birthdayUtils';

const TAB_ID = Math.random().toString(36).substring(2, 9);

function isDataEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'birthday' | 'settings'>('today');
  const [loading, setLoading] = useState(false);
  const [newCheckinAlert, setNewCheckinAlert] = useState<string | null>(null);

  // Detect whether backend server is online or running in static environment (e.g. GitHub Pages)
  const [isServerAvailable, setIsServerAvailable] = useState<boolean | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bethel_admin_user');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          if (user && (user.role === 'superadmin' || user.username === 'admin')) {
            user.displayName = '总管理员';
          }
          return user;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // App Data (Synchronously initialized from local cache to prevent refresh flicker)
  const [config, setConfig] = useState<SystemConfig>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalData();
      return local.config || initialSystemConfig;
    }
    return initialSystemConfig;
  });

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalData();
      return local.classes || initialClasses;
    }
    return initialClasses;
  });
  const [students, setStudents] = useState<Student[]>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalData();
      return local.students || initialStudents;
    }
    return initialStudents;
  });
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalData();
      return local.records || generateInitialRecords();
    }
    return generateInitialRecords();
  });
  const [accounts, setAccounts] = useState<AdminAccount[]>(() => getLocalAccounts());
  const [teachers, setTeachers] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalData();
      return (local as any).teachers && (local as any).teachers.length > 0 ? (local as any).teachers : initialTeachers;
    }
    return initialTeachers;
  });
  const [activeSunday, setActiveSunday] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalData();
      return local.activeSunday || getActiveSundayDate();
    }
    return getActiveSundayDate();
  });

  const previousRecordsCountRef = useRef<number>(0);
  const syncVersionRef = useRef<number>(0);
  const pendingMutationsRef = useRef<Set<string>>(new Set());
  const pendingClassMutationsRef = useRef<Map<string, Partial<ClassGroup>>>(new Map());
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [serverRuntime, setServerRuntime] = useState<string | null>(null);

  // Authoritative State Tracking Refs for Rollback Detection & Deep Verification
  const studentsRef = useRef<Student[]>(students);
  const classesRef = useRef<ClassGroup[]>(classes);
  const teachersRef = useRef<any[]>(teachers);
  const recordsRef = useRef<AttendanceRecord[]>(records);
  const checkinLockRef = useRef<Map<string, number>>(new Map());
  const recentRecordMutationsRef = useRef<Map<string, { record: AttendanceRecord | null; timestamp: number }>>(new Map());
  const expectedEntitiesRef = useRef<Map<string, { type: 'student' | 'class' | 'teacher'; timestamp: number; name?: string }>>(new Map());
  const recentDeletionsRef = useRef<Set<string>>(new Set());
  const lastToastTimerRef = useRef<any>(null);

  // Synchronize state tracking refs on state changes
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  useEffect(() => {
    teachersRef.current = teachers;
  }, [teachers]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // Unified Notification Toast Helper with automatic clearing
  const showSyncNotification = (message: string, duration = 3500) => {
    if (lastToastTimerRef.current) {
      clearTimeout(lastToastTimerRef.current);
    }
    setNewCheckinAlert(message);
    lastToastTimerRef.current = setTimeout(() => {
      setNewCheckinAlert(null);
    }, duration);
  };

  // Broadcast cross-tab synchronization
  const notifyCrossTabSync = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bethel_sync_ping', JSON.stringify({ tabId: TAB_ID, ts: Date.now() }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('bethel_sync_channel');
          bc.postMessage({ type: 'SYNC_STATE', tabId: TAB_ID, timestamp: Date.now() });
          bc.close();
        }
      }
    } catch {}
  };

  // Authoritative state application with explicit regression detection & deep state validation
  const applyServerState = (data: any, isInitial = false) => {
    if (!data || !data.config) return;
    setIsServerAvailable(true);
    if (data.runtime) setServerRuntime(data.runtime);

    if (typeof data.syncVersion === 'number') {
      if (!isInitial && data.syncVersion < syncVersionRef.current) {
        return;
      }
      syncVersionRef.current = data.syncVersion;
    }

    // -------------------------------------------------------------
    // 🔍 Explicit Critical Data Integrity & Anti-Rollback Validation
    // -------------------------------------------------------------
    let hasRegression = false;
    let regressionReason = '';
    const now = Date.now();

    // 1. Students list validation
    if (Array.isArray(data.students)) {
      const currentStudents = studentsRef.current || [];
      const incomingStudents = data.students;

      // Detect unexpected empty or severe drop in student count when no deletion took place
      if (currentStudents.length > 0 && incomingStudents.length === 0 && recentDeletionsRef.current.size === 0 && !isInitial) {
        hasRegression = true;
        regressionReason = '学员名单回退为空';
      }

      // Detect missing recently modified/added student
      if (!hasRegression) {
        for (const [id, meta] of expectedEntitiesRef.current.entries()) {
          if (meta.type === 'student' && now - meta.timestamp < 30000) {
            const found = incomingStudents.some((s: any) => s.id === id || (meta.name && s.name === meta.name));
            if (!found) {
              hasRegression = true;
              regressionReason = `近期保存的学员【${meta.name || id}】未包含在后台回传数据中`;
              break;
            }
          }
        }
      }
    }

    // 2. Classes list validation
    if (Array.isArray(data.classes) && !hasRegression) {
      const currentClasses = classesRef.current || [];
      const incomingClasses = data.classes;

      if (currentClasses.length > 0 && incomingClasses.length === 0 && !isInitial) {
        hasRegression = true;
        regressionReason = '班级名单回退为空';
      }

      if (!hasRegression) {
        for (const [id, meta] of expectedEntitiesRef.current.entries()) {
          if (meta.type === 'class' && now - meta.timestamp < 30000) {
            const found = incomingClasses.some((c: any) => c.id === id || (meta.name && c.name === meta.name));
            if (!found) {
              hasRegression = true;
              regressionReason = `近期保存的班级【${meta.name || id}】未包含在后台回传数据中`;
              break;
            }
          }
        }
      }
    }

    // If critical state regression is detected, reject rollback & force cloud full-recovery reload
    if (hasRegression && !isInitial) {
      console.warn(`[双向校验警告] 检测到后台关键数据状态回退（原因: ${regressionReason}），触发强制全量拉取与云端双向恢复...`);
      showSyncNotification(`⚠️ 检测到后台状态同步延迟（${regressionReason}），正在自动重新校验与强行同步...`, 4000);
      setTimeout(() => {
        syncWithCloud();
      }, 200);
      return;
    }

    // Smart diffing updates to prevent unnecessary re-renders & page flickering
    setConfig(prev => isDataEqual(prev, data.config) ? prev : data.config);

    let mergedClassesForCache: ClassGroup[] | undefined;
    if (Array.isArray(data.classes)) {
      const serverHiddenIds = new Set<string>([
        ...(Array.isArray(data.hiddenClassIds) ? data.hiddenClassIds : []),
        ...(Array.isArray(data.config?.hiddenClassIds) ? data.config.hiddenClassIds : []),
      ]);

      const mergedClasses = data.classes.map((c: any) => {
        // 1. If this class has a local mutation in flight, preserve the pending state
        if (pendingClassMutationsRef.current.has(c.id)) {
          const pending = pendingClassMutationsRef.current.get(c.id)!;
          return {
            ...c,
            ...pending,
            isHiddenFromHome: pending.isHiddenFromHome !== undefined 
              ? !!pending.isHiddenFromHome 
              : (serverHiddenIds.has(c.id) || c.isHiddenFromHome === true)
          };
        }

        // 2. Class hidden status is server-authoritative
        const isHidden = serverHiddenIds.has(c.id) || (c.isHiddenFromHome === true && (!data.hiddenClassIds || serverHiddenIds.has(c.id)));

        return {
          ...c,
          isHiddenFromHome: isHidden
        };
      });

      // Synchronize persistent hidden class IDs with authoritative server result
      const newHiddenSet = new Set<string>(mergedClasses.filter((c: any) => c.isHiddenFromHome === true).map((c: any) => c.id as string));
      saveLocalHiddenClassIds(newHiddenSet);

      const filteredClasses = mergedClasses.filter((c: any) => !recentDeletionsRef.current.has(c.id));
      mergedClassesForCache = filteredClasses;
      setClasses(prev => isDataEqual(prev, filteredClasses) ? prev : filteredClasses);
    }

    if (Array.isArray(data.students)) {
      const filteredStudents = data.students.filter((s: any) => !recentDeletionsRef.current.has(s.id));
      setStudents(prev => isDataEqual(prev, filteredStudents) ? prev : filteredStudents);
    }

    if (Array.isArray(data.teachers) && data.teachers.length > 0) {
      const filteredTeachers = data.teachers.filter((t: any) => !recentDeletionsRef.current.has(t.id));
      setTeachers(prev => isDataEqual(prev, filteredTeachers) ? prev : filteredTeachers);
    }

    if (data.config && typeof data.config === 'object') {
      setConfig(prev => {
        const nextConfig = { ...prev, ...data.config };
        return isDataEqual(prev, nextConfig) ? prev : nextConfig;
      });
    }

    if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
      setAccounts(prev => isDataEqual(prev, data.accounts) ? prev : data.accounts);
    } else if (!data.accounts) {
      setAccounts(getLocalAccounts());
    }

    if (data.activeSunday) {
      setActiveSunday(prev => prev === data.activeSunday ? prev : data.activeSunday);
    }

    if (Array.isArray(data.deletedRecordKeys)) {
      const serverDeletedKeys = new Set(data.deletedRecordKeys.filter((k: any) => typeof k === 'string' && k));
      // Remove any keys of active incoming records from deleted keys
      if (Array.isArray(data.records)) {
        data.records.forEach((r: any) => {
          if (r) {
            if (r.id) {
              serverDeletedKeys.delete(r.id);
              removeLocalDeletedRecordKey(r.id);
            }
            if (r.studentId && r.date) {
              serverDeletedKeys.delete(`${r.studentId}_${r.date}`);
              removeLocalDeletedRecordKey(`${r.studentId}_${r.date}`);
            }
          }
        });
      }
      try {
        localStorage.setItem('bethel_deleted_record_keys', JSON.stringify(Array.from(serverDeletedKeys)));
      } catch {}
    } else if (Array.isArray(data.records)) {
      data.records.forEach((r: any) => {
        if (r) {
          if (r.id) removeLocalDeletedRecordKey(r.id);
          if (r.studentId && r.date) removeLocalDeletedRecordKey(`${r.studentId}_${r.date}`);
        }
      });
    }

    let mergedRecordsForCache: AttendanceRecord[] | undefined;
    if (Array.isArray(data.records)) {
      const now = Date.now();

      // Clean up mutations older than 8s or that have already settled in incoming server data
      for (const [key, meta] of recentRecordMutationsRef.current.entries()) {
        const [sId, dStr] = key.split('_KEY_SPLIT_');
        const serverRec = data.records.find((r: any) => r.studentId === sId && r.date === dStr);
        if (meta.record) {
          if (serverRec && serverRec.status === meta.record.status) {
            recentRecordMutationsRef.current.delete(key);
          } else if (now - meta.timestamp > 8000) {
            recentRecordMutationsRef.current.delete(key);
          }
        } else {
          if (!serverRec) {
            recentRecordMutationsRef.current.delete(key);
          } else if (now - meta.timestamp > 8000) {
            recentRecordMutationsRef.current.delete(key);
          }
        }
      }

      setRecords(prev => {
        const deletedSet = getLocalDeletedRecordKeys();
        let incomingRecords: AttendanceRecord[] = data.records.filter((r: any) => 
          !deletedSet.has(r.id) && !deletedSet.has(`${r.studentId}_${r.date}`)
        );

        // Anti-Rollback & Anti-Bounce Protection:
        // Merge recent optimistic mutations (within 8s window or currently in flight)
        if (recentRecordMutationsRef.current.size > 0 || pendingMutationsRef.current.size > 0) {
          const merged = [...incomingRecords];

          // 1. Apply recent local mutations (highest priority against stale server snapshots)
          recentRecordMutationsRef.current.forEach((meta, key) => {
            const [sId, dStr] = key.split('_KEY_SPLIT_');
            const idx = merged.findIndex(r => r.studentId === sId && r.date === dStr);
            if (meta.record) {
              if (idx !== -1) merged[idx] = meta.record;
              else merged.push(meta.record);
            } else {
              if (idx !== -1) merged.splice(idx, 1);
            }
          });

          // 2. Apply in-flight mutations in prev
          pendingMutationsRef.current.forEach(key => {
            const [sId, dStr] = key.split('_KEY_SPLIT_');
            const optRec = prev.find(r => r.studentId === sId && r.date === dStr);
            const idx = merged.findIndex(r => r.studentId === sId && r.date === dStr);
            if (optRec) {
              if (idx !== -1) merged[idx] = optRec;
              else merged.push(optRec);
            }
          });

          incomingRecords = merged.filter((r: any) => 
            !deletedSet.has(r.id) && !deletedSet.has(`${r.studentId}_${r.date}`)
          );
        }

        mergedRecordsForCache = incomingRecords;
        saveLocalData({ records: incomingRecords });

        if (isDataEqual(prev, incomingRecords)) {
          return prev;
        }
        return incomingRecords;
      });
    }

    // Clean up verified expected mutations
    for (const [id, meta] of expectedEntitiesRef.current.entries()) {
      if (now - meta.timestamp > 30000) {
        expectedEntitiesRef.current.delete(id);
      } else if (meta.type === 'student' && Array.isArray(data.students)) {
        if (data.students.some((s: any) => s.id === id || (meta.name && s.name === meta.name))) {
          expectedEntitiesRef.current.delete(id);
        }
      } else if (meta.type === 'class' && Array.isArray(data.classes)) {
        if (data.classes.some((c: any) => c.id === id || (meta.name && c.name === meta.name))) {
          expectedEntitiesRef.current.delete(id);
        }
      } else if (meta.type === 'teacher' && Array.isArray(data.teachers)) {
        if (data.teachers.some((t: any) => t.id === id || (meta.name && t.name === meta.name))) {
          expectedEntitiesRef.current.delete(id);
        }
      }
    }

    setLastSyncTime(getCurrentRomeFullTimeStr());

    // Keep local cache synced as authoritative backup
    saveLocalData({
      classes: mergedClassesForCache || data.classes || classes,
      students: data.students || students,
      config: data.config || config,
      records: mergedRecordsForCache || recordsRef.current || data.records || records,
      activeSunday: data.activeSunday || activeSunday,
      accounts: data.accounts || accounts,
      teachers: data.teachers || teachers
    } as any);

    if (Array.isArray(data.records)) {
      previousRecordsCountRef.current = data.records.length;
    }
    if (isInitial) setLoading(false);
  };

  // Fetch state from server or local storage fallback with smart multi-device merge
  const loadState = async (isInitial = false) => {
    let serverOk = false;
    const maxRetries = isInitial ? 2 : 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Cold-start wait if first attempt did not succeed
          await new Promise(r => setTimeout(r, 800));
        }
        const res = await fetch(`/api/state?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.config) {
            serverOk = true;
            applyServerState(data, isInitial);
            return;
          }
        }
      } catch (err) {
        // Will retry or fall through to local fallback
      }
    }

    if (!serverOk) {
      try {
        const probeRes = await fetch(`/api/health?t=${Date.now()}`);
        const probeType = probeRes.headers.get('content-type') || '';
        if (probeRes.ok && probeType.includes('application/json')) {
          const probeData = await probeRes.json();
          if (probeData && probeData.status === 'ok') {
            serverOk = true;
            setIsServerAvailable(true);
            if (probeData.runtime) setServerRuntime(probeData.runtime);
            if (probeData.config) setConfig(probeData.config);
          }
        }
      } catch {}
    }

    if (!serverOk) {
      setIsServerAvailable(prev => (prev === true ? true : false));
    }

    // Fallback to local storage (Static / GitHub Pages)
    const local = getLocalData();
    setConfig(local.config);
    setClasses(local.classes);
    setStudents(local.students);
    setActiveSunday(local.activeSunday);
    setRecords(local.records);
    if (local.teachers && Array.isArray(local.teachers) && local.teachers.length >= 27) {
      setTeachers(local.teachers);
    } else {
      setTeachers(initialTeachers);
    }
    const localAccounts = getLocalAccounts();
    setAccounts(localAccounts);
    setLastSyncTime('本地离线模式已就绪');
    previousRecordsCountRef.current = local.records.length;

    if (isInitial) setLoading(false);
  };

  // Cross-device cloud sync: pushes local delta and pulls aggregate state
  const syncWithCloud = async () => {
    setIsSyncing(true);
    try {
      const local = getLocalData();
      const res = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classes: classes.length > 0 ? classes : local.classes,
          students: students.length > 0 ? students : local.students,
          records: records.length > 0 ? records : local.records,
          teachers: teachers.length > 0 ? teachers : (local as any).teachers,
          deletedRecordKeys: Array.from(getLocalDeletedRecordKeys()),
          config
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const result = await res.json();
        applyServerState(result, false);
        notifyCrossTabSync();
        showSyncNotification('✅ 云端双向校验完成，所有数据已完全同步！');
        return;
      }
      await loadState(false);
      notifyCrossTabSync();
      showSyncNotification('✅ 数据已完成同步校准！');
    } catch {
      await loadState(false);
      showSyncNotification('ℹ️ 当前处于本地离线模式，已保存最新离线数据');
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  const handleManualSync = async () => {
    await syncWithCloud();
  };

  useEffect(() => {
    document.title = '伯特利主日学与团契IMS';
  }, []);

  // Multi-Engine Ultra-Fast Real-Time Sync Loop (WebSocket + SSE + 1.5s Micro-Pulse Check + Interaction Wakeup)
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let wsPingInterval: any = null;
    let wsReconnectTimer: any = null;
    let es: EventSource | null = null;
    let esReconnectTimer: any = null;
    let pulseInterval: any = null;
    let isPulseInFlight = false;
    let lastInteractionCheckTime = 0;

    // 1. Initial State Load
    loadState(true);

    const isWsHealthy = () => ws && ws.readyState === WebSocket.OPEN;
    const isEsHealthy = () => es && es.readyState === EventSource.OPEN;

    // Fast Micro-Pulse Version Check (<15ms network overhead)
    const checkVersionPulse = async () => {
      if (!isMounted || isPulseInFlight || document.hidden) return;
      isPulseInFlight = true;
      try {
        const res = await fetch(`/api/sync-version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.syncVersion === 'number') {
            const isVersionNewer = data.syncVersion > syncVersionRef.current;
            const isRecordsCountMismatch = typeof data.recordsCount === 'number' && 
              recordsRef.current && 
              Math.abs(data.recordsCount - recordsRef.current.length) > 0 &&
              recentRecordMutationsRef.current.size === 0 &&
              pendingMutationsRef.current.size === 0;

            if (isVersionNewer || isRecordsCountMismatch) {
              await loadState(false);
            }
          }
        }
      } catch {
        // Silently continue pulse
      } finally {
        isPulseInFlight = false;
      }
    };

    // 2. Layer 1: WebSocket Real-Time Channel (<20ms latency)
    const setupWebSocket = () => {
      if (!isMounted || document.hidden) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          setIsServerAvailable(true);
          clearInterval(wsPingInterval);
          wsPingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN && !document.hidden) {
              try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data && data.config) {
              applyServerState(data, false);
            }
          } catch {}
        };

        ws.onclose = () => {
          clearInterval(wsPingInterval);
          if (!isMounted || document.hidden) return;
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = setTimeout(setupWebSocket, 1500);
        };

        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = setTimeout(setupWebSocket, 2000);
      }
    };

    // 3. Layer 2: Server-Sent Events (SSE) Stream (<20ms latency)
    const setupSSE = () => {
      if (!isMounted || document.hidden || typeof window === 'undefined' || !('EventSource' in window)) return;

      try {
        if (es) {
          es.close();
          es = null;
        }
        es = new EventSource('/api/realtime-stream');

        es.addEventListener('initial', (e) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data && data.config) applyServerState(data, false);
          } catch {}
        });

        es.addEventListener('update', (e) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data && data.config) applyServerState(data, false);
          } catch {}
        });

        es.onerror = () => {
          if (!isMounted) return;
          es?.close();
          es = null;
          clearTimeout(esReconnectTimer);
          esReconnectTimer = setTimeout(setupSSE, 1500);
        };
      } catch {
        clearTimeout(esReconnectTimer);
        esReconnectTimer = setTimeout(setupSSE, 2000);
      }
    };

    // Initialize parallel ultra-low latency push channels
    setupWebSocket();
    const sseInitTimer = setTimeout(() => {
      if (isMounted) setupSSE();
    }, 150);

    // 4. Layer 3: High-Speed Background Micro-Pulse (Every 1.5s guarantee across any network/firewall)
    pulseInterval = setInterval(() => {
      if (!isMounted || document.hidden) return;
      checkVersionPulse();
    }, 1500);

    // 5. Cross-tab BroadcastChannel listener (0ms intra-browser sync)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('bethel_sync_channel');
        bc.onmessage = (e) => {
          if (e.data?.tabId === TAB_ID) return; // Ignore self-triggered sync messages
          if (isMounted && !document.hidden) loadState(false);
        };
      }
    } catch {}

    // 6. Storage event for multi-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bethel_sync_ping' && isMounted && !document.hidden) {
        try {
          const parsed = JSON.parse(e.newValue || '{}');
          if (parsed.tabId === TAB_ID) return; // Ignore self
        } catch {}
        loadState(false);
      }
    };
    window.addEventListener('storage', onStorage);

    // 7. Focus & Visibility Change triggers (Instant Wakeup Refresh)
    const onWakeOrFocus = () => {
      if (isMounted && !document.hidden) {
        loadState(false);
        if (!isWsHealthy()) setupWebSocket();
        if (!isEsHealthy()) setupSSE();
      }
    };
    window.addEventListener('focus', onWakeOrFocus);
    document.addEventListener('visibilitychange', onWakeOrFocus);

    // 8. User Interaction Fast-Sync (Touch/Click on Device B triggers instant micro-check)
    const onUserInteraction = () => {
      const now = Date.now();
      if (now - lastInteractionCheckTime > 1200 && isMounted && !document.hidden) {
        lastInteractionCheckTime = now;
        checkVersionPulse();
      }
    };
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('pointerdown', onUserInteraction, { passive: true });

    return () => {
      isMounted = false;
      clearTimeout(sseInitTimer);
      clearInterval(pulseInterval);
      clearInterval(wsPingInterval);
      clearTimeout(wsReconnectTimer);
      clearTimeout(esReconnectTimer);
      if (ws) {
        try { ws.close(); } catch {}
      }
      if (es) {
        try { es.close(); } catch {}
      }
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onWakeOrFocus);
      document.removeEventListener('visibilitychange', onWakeOrFocus);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('pointerdown', onUserInteraction);
    };
  }, []);

  // Ensure non-superadmin accounts never stay on the full settings tab
  useEffect(() => {
    if (activeTab === 'settings' && currentUser && currentUser.role !== 'superadmin') {
      setActiveTab('today');
    }
  }, [activeTab, currentUser]);

  // Login & Logout Handlers
  const handleLoginSuccess = (user: AdminUser) => {
    let finalUser = user;
    if (user.role === 'superadmin' || user.username === 'admin') {
      finalUser = { ...user, displayName: '总管理员' };
    }
    setCurrentUser(finalUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bethel_admin_user', JSON.stringify(finalUser));
    }
    // Only superadmin enters the backend settings tab; teachers/coworkers return directly to front office
    if (finalUser.role === 'superadmin') {
      setActiveTab('settings');
      setNewCheckinAlert(`🔐 登录成功：欢迎 ${finalUser.displayName} 进入后台综合管理系统！`);
    } else {
      setActiveTab('today');
      setNewCheckinAlert(`✨ 登录成功：欢迎 ${finalUser.displayName} 老师，已直接返回主日签到前台！`);
    }
    setTimeout(() => setNewCheckinAlert(null), 3500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bethel_admin_user');
    }
    if (activeTab === 'settings') {
      setActiveTab('today');
    }
    setNewCheckinAlert('已退出后台管理模式');
    setTimeout(() => setNewCheckinAlert(null), 3000);
  };

  // Handle successful check-in
  const handleCheckinSuccess = (newRecord: AttendanceRecord, student: Student) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const mutationKey = `${newRecord.studentId}_KEY_SPLIT_${newRecord.date}`;
    recentRecordMutationsRef.current.set(mutationKey, {
      record: newRecord,
      timestamp: Date.now()
    });
    setRecords(prev => {
      const existing = prev.findIndex(r => r.id === newRecord.id || (r.studentId === newRecord.studentId && r.date === newRecord.date));
      let updated: AttendanceRecord[];
      if (existing !== -1) {
        updated = [...prev];
        updated[existing] = newRecord;
      } else {
        updated = [...prev, newRecord];
      }
      saveLocalData({ records: updated });
      return updated;
    });
    notifyCrossTabSync();
  };

  // Auth headers helper
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentUser?.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    if (currentUser?.role) {
      headers['X-User-Role'] = currentUser.role;
    }
    if (currentUser?.username) {
      headers['X-Username'] = currentUser.username;
    }
    return headers;
  };

  // Custom Action Hooks (Extracted for clean separation and bundle size optimization)
  const {
    handleAddStudent,
    handleBatchAddStudents,
    handleDeleteStudent,
  } = useStudentActions({
    currentUser,
    setStudents,
    setRecords,
    syncVersionRef,
    recentDeletionsRef,
    expectedEntitiesRef,
    setIsServerAvailable,
    showSyncNotification,
    notifyCrossTabSync,
  });

  const {
    handleSaveClass,
    handleToggleClassVisibility,
    handleDeleteClass,
  } = useClassActions({
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
  });

  const {
    handleManualUpdate,
  } = useAttendanceActions({
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
  });

  // Handle save config & toggles
  const handleSaveConfig = async (updated: Partial<SystemConfig>) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，无权更改系统设置！');
    }

    const saveLocally = () => {
      setConfig(prev => {
        const merged = { ...prev, ...updated };
        saveLocalData({ config: merged });
        return merged;
      });
      notifyCrossTabSync();
    };

    // 1. Optimistic local update
    saveLocally();

    // 2. Persist to serverless / cloud backend
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updated),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (data.config) {
          setConfig(data.config);
          saveLocalData({ config: data.config });
        }
        showSyncNotification('✅ 系统设置已通过双向状态校验并成功保存！');
      }
    } catch {
      // Offline fallback: already preserved locally in step 1
    }
  };

  // Handle save teacher (添加/修改教师)
  const handleSaveTeacher = async (teacherData: any) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有管理教师的权限！');
    }

    const teacherId = (teacherData.id && String(teacherData.id).trim()) || `t-${Date.now().toString().slice(-6)}`;
    const fullTeacherData = { ...teacherData, id: teacherId };
    expectedEntitiesRef.current.set(teacherId, { type: 'teacher', timestamp: Date.now(), name: fullTeacherData.name });

    const saveLocally = () => {
      setTeachers(prev => {
        let updated;
        const idx = prev.findIndex(t => (t.id && t.id === teacherId) || (t.name && t.name === fullTeacherData.name));
        if (idx !== -1) {
          updated = [...prev];
          updated[idx] = { ...updated[idx], ...fullTeacherData };
        } else {
          updated = [...prev, fullTeacherData];
        }
        saveLocalData({ teachers: updated } as any);
        return updated;
      });
      notifyCrossTabSync();
    };

    saveLocally();

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(fullTeacherData)
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (Array.isArray(data.teachers) && data.teachers.length > 0) {
          setTeachers(data.teachers);
          saveLocalData({ teachers: data.teachers } as any);
        } else if (data.teacher) {
          setTeachers(prev => {
            const idx = prev.findIndex(t => (data.teacher.id && t.id === data.teacher.id) || (data.teacher.name && t.name === data.teacher.name));
            let updated;
            if (idx !== -1) {
              updated = [...prev];
              updated[idx] = { ...updated[idx], ...data.teacher };
            } else {
              updated = [...prev, data.teacher];
            }
            saveLocalData({ teachers: updated } as any);
            return updated;
          });
        }
        expectedEntitiesRef.current.delete(teacherId);
        showSyncNotification(`✅ 教师【${fullTeacherData.name}】资料已保存并同步！`);
      } else {
        const errData = contentType.includes('application/json') ? await res.json() : null;
        throw new Error(errData?.error || `保存教师资料失败 (${res.status})`);
      }
    } catch (err: any) {
      throw err;
    }
  };

  // Handle delete teacher (删除教师)
  const handleDeleteTeacher = async (teacherId: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有删除教师的权限！');
    }

    recentDeletionsRef.current.add(teacherId);

    const deleteLocally = () => {
      setTeachers(prev => {
        const updated = prev.filter(t => t.id !== teacherId);
        saveLocalData({ teachers: updated } as any);
        return updated;
      });
      notifyCrossTabSync();
    };

    deleteLocally();

    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          saveLocalData({ teachers: data.teachers } as any);
        }
        showSyncNotification('✅ 教师资料已成功删除！');
      }
    } catch {
      // Offline fallback
    }
  };

  // Handle reset data (恢复示范数据)
  const handleResetData = async () => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，无权重置系统示范数据！');
    }

    try {
      const res = await fetch('/api/reset-data', { 
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        await loadState(false);
        setNewCheckinAlert('已恢复为伯特利教会主日学与团契官方示范数据！');
        setTimeout(() => setNewCheckinAlert(null), 3000);
        return;
      }
    } catch {
      // Fallback to local
    }

    const reset = resetLocalData();
    if (reset) {
      setClasses(reset.classes);
      setStudents(reset.students);
      setConfig(reset.config);
      setRecords(reset.records);
      setActiveSunday(reset.activeSunday);
      if (reset.accounts) setAccounts(reset.accounts);
    }
    notifyCrossTabSync();
    setNewCheckinAlert('已恢复为伯特利教会主日学与团契官方示范数据！');
    setTimeout(() => setNewCheckinAlert(null), 3000);
  };

  // Handle save/create admin account (总管理员新建/保存账号)
  const handleSaveAccount = async (accountData: Partial<AdminAccount> & { username: string }) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：仅总管理员可新建或修改管理账号！');
    }

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(accountData),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        saveLocalAccount(accountData);
        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          setAccounts(data.accounts);
          saveLocalAccounts(data.accounts);
          notifyCrossTabSync();
        }
        showSyncNotification(`✅ 管理账号【${accountData.displayName || accountData.username}】已成功保存并同步！`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `保存账号失败 (${res.status})`);
      }
    } catch (err: any) {
      // Optimistic local update as offline fallback
      const updated = saveLocalAccount(accountData);
      setAccounts(updated);
      notifyCrossTabSync();
      if (err.message && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  };

  // Handle delete admin account (总管理员删除账号)
  const handleDeleteAccount = async (username: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：仅总管理员可删除管理账号！');
    }

    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        deleteLocalAccount(username);
        if (Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          saveLocalAccounts(data.accounts);
          notifyCrossTabSync();
        }
        showSyncNotification('✅ 管理账号已成功删除！');
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || '删除账号失败');
      }
    } catch (err: any) {
      const updated = deleteLocalAccount(username);
      setAccounts(updated);
      notifyCrossTabSync();
      if (err.message && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  };

  // Handle modify admin account password (总管理员修改密码)
  const handleChangeAccountPassword = async (username: string, newPassword: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：仅总管理员可修改管理账号密码！');
    }

    try {
      const res = await fetch('/api/accounts/password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, newPassword }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          saveLocalAccounts(data.accounts);
          notifyCrossTabSync();
        }
        showSyncNotification('✅ 账号密码已成功更新！');
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || '修改密码失败');
      }
    } catch (err: any) {
      const updated = updateLocalAccountPassword(username, newPassword);
      setAccounts(updated);
      notifyCrossTabSync();
      if (err.message && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  };

  // Export local JSON backup file (一键导出备份文件)
  const handleExportData = () => {
    try {
      const backupJson = exportLocalBackup();
      const blob = new Blob([backupJson], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `伯特利教会主日学系统_数据备份_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNewCheckinAlert('📥 数据备份文件已成功导出并保存到本地！');
      setTimeout(() => setNewCheckinAlert(null), 3500);
    } catch (err: any) {
      alert('导出备份失败: ' + (err.message || '未知错误'));
    }
  };

  // Import JSON backup file or raw JSON string (一键导入数据恢复，适配 Vercel 云端)
  const handleImportData = async (fileOrJson: File | string) => {
    try {
      let text = '';
      if (typeof fileOrJson === 'string') {
        text = fileOrJson.trim();
      } else {
        text = await fileOrJson.text();
      }
      const restored = importLocalBackup(text);
      setClasses(restored.classes);
      setStudents(restored.students);
      setConfig(restored.config);
      setRecords(restored.records);
      setAccounts(restored.accounts);
      setActiveSunday(restored.activeSunday);
      if (restored.teachers && restored.teachers.length > 0) {
        setTeachers(restored.teachers);
      }

      // Sync restored state directly with Supabase PostgreSQL cloud database
      try {
        await fetch('/api/cloud-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classes: restored.classes,
            students: restored.students,
            records: restored.records,
            config: restored.config,
            teachers: restored.teachers || [],
            accounts: restored.accounts
          })
        });
      } catch (err) {
        console.warn('Vercel cloud sync error on import:', err);
      }

      notifyCrossTabSync();
      setNewCheckinAlert(`📦 数据恢复成功：已恢复 ${restored.classes.length} 个班级与 ${restored.students.length} 名在册学员，已强同步至 Vercel 云端！`);
      setTimeout(() => setNewCheckinAlert(null), 4000);
    } catch (err: any) {
      throw new Error('导入恢复失败: ' + (err.message || '文件或数据格式无效'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-700 text-white flex items-center justify-center shadow-md mb-4">
          <Church className="w-8 h-8 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
          <span>正在连接伯特利教会主日学签到系统...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/30 text-slate-800 flex flex-col font-sans">
      
      {/* Real-time Notification Toast */}
      {newCheckinAlert && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-md ${
          newCheckinAlert.includes('⚠️') || newCheckinAlert.includes('失败') || newCheckinAlert.includes('错误')
            ? 'bg-amber-950 text-amber-100 border-amber-600'
            : newCheckinAlert.includes('✅')
            ? 'bg-slate-900 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {newCheckinAlert.includes('⚠️') ? (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : newCheckinAlert.includes('✅') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="text-xs font-medium leading-relaxed">{newCheckinAlert}</span>
        </div>
      )}

      {/* Main Header & Navigation */}
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onManualSync={handleManualSync}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        isServerAvailable={isServerAvailable}
        serverRuntime={serverRuntime}
        upcomingBirthdayCount={getAllStudentsBirthdayInfo(students, classes, new Date()).filter(i => i.isWithinOneWeek).length}
      />

      {/* Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4.5">
        {activeTab === 'today' && (
          <TodayDashboard
            config={config}
            classes={classes}
            students={students}
            records={records}
            activeSunday={activeSunday}
            currentUser={currentUser}
            isSyncing={isSyncing}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onManualUpdate={handleManualUpdate}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceStatsView
            config={config}
            classes={classes}
            students={students}
            records={records}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'birthday' && (
          <BirthdayReminderView
            config={config}
            classes={classes}
            students={students}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-12 text-amber-700 bg-white/80 rounded-2xl border border-amber-200/60 shadow-sm my-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2.5 text-amber-600" />
              <span className="font-medium text-slate-700">正在加载后台设置模块...</span>
            </div>
          }>
            <SettingsModal
              config={config}
              classes={classes}
              students={students}
              accounts={accounts}
              teachers={teachers}
              currentUser={currentUser}
              onSaveConfig={handleSaveConfig}
              onSaveClass={handleSaveClass}
              onToggleClassVisibility={handleToggleClassVisibility}
              onDeleteClass={handleDeleteClass}
              onAddStudent={handleAddStudent}
              onBatchAddStudents={handleBatchAddStudents}
              onDeleteStudent={handleDeleteStudent}
              onSaveTeacher={handleSaveTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onResetData={handleResetData}
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onSaveAccount={handleSaveAccount}
              onDeleteAccount={handleDeleteAccount}
              onChangeAccountPassword={handleChangeAccountPassword}
              onManualSync={handleManualSync}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
              onExportData={handleExportData}
              onImportData={handleImportData}
            />
          </React.Suspense>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-amber-200/60 bg-white/70 py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <p className="flex items-center gap-1.5 font-serif">
            <Church className="w-4 h-4 text-amber-700" />
            <span className="font-semibold text-slate-800">{config.churchName}</span>
            <span>•</span>
            <span>版权所有2026</span>
          </p>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Multi-Device Cloud Sync Modal */}
      <MultiDeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={config}
        classes={classes}
        students={students}
        records={records}
        isServerAvailable={isServerAvailable}
        serverRuntime={serverRuntime}
        lastSyncTime={lastSyncTime}
        onManualSync={syncWithCloud}
        isSyncing={isSyncing}
      />

    </div>
  );
}
