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
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { MultiDeviceSyncModal } from './components/MultiDeviceSyncModal';
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
              : (typeof c.isHiddenFromHome === 'boolean' ? c.isHiddenFromHome : serverHiddenIds.has(c.id))
          };
        }

        // 2. Class hidden status:
        // When connected, the explicit boolean property on the class is authoritative
        const isHidden = typeof c.isHiddenFromHome === 'boolean' 
          ? c.isHiddenFromHome 
          : serverHiddenIds.has(c.id);

        return {
          ...c,
          isHiddenFromHome: isHidden
        };
      });

      // Synchronize persistent hidden class IDs with authoritative merged result
      const newHiddenSet = new Set<string>(mergedClasses.filter((c: any) => c.isHiddenFromHome === true).map((c: any) => c.id as string));
      saveLocalHiddenClassIds(newHiddenSet);

      mergedClassesForCache = mergedClasses;
      setClasses(prev => isDataEqual(prev, mergedClasses) ? prev : mergedClasses);
    }

    if (Array.isArray(data.students)) {
      setStudents(prev => isDataEqual(prev, data.students) ? prev : data.students);
    }

    if (Array.isArray(data.teachers)) {
      setTeachers(prev => isDataEqual(prev, data.teachers) ? prev : data.teachers);
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

    // Build active deletedSet reconciled against incoming server data
    let activeDeletedSet = getLocalDeletedRecordKeys();
    if (Array.isArray(data.deletedRecordKeys)) {
      activeDeletedSet = new Set(data.deletedRecordKeys.filter((k: any) => typeof k === 'string' && k));
    }

    if (Array.isArray(data.records)) {
      data.records.forEach((r: any) => {
        if (r) {
          if (r.id) {
            activeDeletedSet.delete(r.id);
            removeLocalDeletedRecordKey(r.id);
          }
          if (r.studentId && r.date) {
            activeDeletedSet.delete(`${r.studentId}_${r.date}`);
            removeLocalDeletedRecordKey(`${r.studentId}_${r.date}`);
          }
        }
      });
      try {
        localStorage.setItem('bethel_deleted_record_keys', JSON.stringify(Array.from(activeDeletedSet)));
      } catch {}
    }

    let mergedRecordsForCache: AttendanceRecord[] | undefined;
    if (Array.isArray(data.records)) {
      const now = Date.now();
      // Clean up mutations older than 3s or that have already settled in incoming server data
      for (const [key, meta] of recentRecordMutationsRef.current.entries()) {
        const [sId, dStr] = key.split('_KEY_SPLIT_');
        const serverRec = data.records.find((r: any) => r.studentId === sId && r.date === dStr);
        if (meta.record) {
          if (serverRec && serverRec.status === meta.record.status) {
            recentRecordMutationsRef.current.delete(key);
          } else if (now - meta.timestamp > 3000) {
            recentRecordMutationsRef.current.delete(key);
          }
        } else {
          if (!serverRec) {
            recentRecordMutationsRef.current.delete(key);
          } else if (now - meta.timestamp > 3000) {
            recentRecordMutationsRef.current.delete(key);
          }
        }
      }

      setRecords(prev => {
        let incomingRecords: AttendanceRecord[] = data.records.filter((r: any) => 
          !activeDeletedSet.has(r.id) && !activeDeletedSet.has(`${r.studentId}_${r.date}`)
        );

        // Anti-Rollback & Anti-Bounce Protection for active in-flight local mutations
        if (recentRecordMutationsRef.current.size > 0 || pendingMutationsRef.current.size > 0) {
          const merged = [...incomingRecords];

          // 1. Apply recent local mutations
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

          incomingRecords = merged;
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
    if (local.teachers && Array.isArray(local.teachers) && local.teachers.length > 0) {
      setTeachers(local.teachers);
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

  // Multi-Engine Real-Time Sync Loop (WebSocket + SSE + Instant Long-Polling)
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let wsPingInterval: any = null;
    let wsReconnectTimer: any = null;
    let es: EventSource | null = null;
    let esReconnectTimer: any = null;
    let pollAbortController: AbortController | null = null;

    // 1. Initial State Load
    loadState(true);

    // 2. Layer 1: WebSocket Real-Time Channel (<50ms)
    const setupWebSocket = () => {
      if (!isMounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          setIsServerAvailable(true);
          clearInterval(wsPingInterval);
          wsPingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
            }
          }, 20000);
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
          if (!isMounted) return;
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = setTimeout(setupWebSocket, 800);
        };

        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = setTimeout(setupWebSocket, 1000);
      }
    };

    // 3. Layer 2: Server-Sent Events (SSE) Channel (<50ms)
    const setupSSE = () => {
      if (!isMounted || typeof window === 'undefined' || !('EventSource' in window)) return;
      try {
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
          clearTimeout(esReconnectTimer);
          esReconnectTimer = setTimeout(setupSSE, 1000);
        };
      } catch {
        clearTimeout(esReconnectTimer);
        esReconnectTimer = setTimeout(setupSSE, 1500);
      }
    };

    // 4. Layer 3: High-Frequency Long-Polling Worker (<1s fallback guaranteed)
    const runLongPoll = async () => {
      while (isMounted) {
        try {
          pollAbortController = new AbortController();
          const res = await fetch(
            `/api/realtime-poll?version=${syncVersionRef.current}&timeout=10000&t=${Date.now()}`,
            {
              signal: pollAbortController.signal,
              headers: { 'Cache-Control': 'no-cache' }
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.changed && data.config) {
              applyServerState(data, false);
            } else if (data && typeof data.syncVersion === 'number') {
              syncVersionRef.current = data.syncVersion;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || !isMounted) break;
          // Short pause before retrying long poll on network hiccups
          await new Promise(r => setTimeout(r, 400));
        }
      }
    };

    // Initialize all layers in parallel for maximum resilience
    setupWebSocket();
    setupSSE();
    runLongPoll();

    // 5. Safety Heartbeat Poll
    const fallbackInterval = setInterval(() => {
      if (!isMounted) return;
      const isWsConnected = ws && ws.readyState === WebSocket.OPEN;
      const isEsConnected = es && es.readyState === EventSource.OPEN;
      // If real-time stream is healthy, poll less frequently (10s); if disconnected, poll every 3s
      if (!isWsConnected && !isEsConnected) {
        loadState(false);
      }
    }, 3000);

    // 6. Cross-tab BroadcastChannel listener (0ms intra-browser sync)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('bethel_sync_channel');
        bc.onmessage = (e) => {
          if (e.data?.tabId === TAB_ID) return; // Ignore self-triggered sync messages
          if (isMounted) loadState(false);
        };
      }
    } catch {}

    // 7. Storage event for multi-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bethel_sync_ping' && isMounted) {
        try {
          const parsed = JSON.parse(e.newValue || '{}');
          if (parsed.tabId === TAB_ID) return; // Ignore self
        } catch {}
        loadState(false);
      }
    };
    window.addEventListener('storage', onStorage);

    // 8. Focus & Visibility Change triggers (auto-reconnects websockets if dropped during sleep)
    const onFocus = () => {
      if (isMounted) {
        loadState(false);
        if (!ws || ws.readyState > 1) setupWebSocket();
        if (!es || es.readyState === 2) setupSSE();
      }
    };
    const onVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        loadState(false);
        if (!ws || ws.readyState > 1) setupWebSocket();
        if (!es || es.readyState === 2) setupSSE();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(fallbackInterval);
      clearInterval(wsPingInterval);
      clearTimeout(wsReconnectTimer);
      clearTimeout(esReconnectTimer);
      if (ws) {
        try { ws.close(); } catch {}
      }
      if (es) {
        try { es.close(); } catch {}
      }
      if (pollAbortController) {
        pollAbortController.abort();
      }
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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

  // Handle manual update from teacher (签到 / 迟到 / 请假 / 缺席清除)
  const handleManualUpdate = async (data: {
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

    // 防重复误触锁：仅对同一学员的完全相同状态在 300ms 内做防抖，允许老师即时切换不同状态（如从到校切换为迟到或请假）
    const now = Date.now();
    const actionKey = `${data.studentId}_${data.status}`;
    const lastTrigger = checkinLockRef.current.get(actionKey) || 0;
    if (now - lastTrigger < 300) {
      return;
    }
    checkinLockRef.current.set(actionKey, now);

    // 清理较旧的锁记录，防止内存堆积
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

    const updateLocally = () => {
      setRecords(prev => {
        const existingIdx = prev.findIndex(r => r.studentId === data.studentId && r.date === data.date);

        // If absent, cleanly remove existing record from list
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
          // 1. Check if late rule is enabled and exceeds late threshold (e.g. 15:00)
          if (config.enableLateRule) {
            const [lateH, lateM] = (config.lateThresholdTime || '15:00').split(':').map(Number);
            if (nowTimeParts.hour > lateH || (nowTimeParts.hour === lateH && nowTimeParts.minute > lateM)) {
              isLate = true;
            }
          }
          // 2. Check if checkin time exceeds the background check-in end deadline (e.g. 12:30), still mark as late
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
          notes: data.notes,
          isTestMode: config.testMode ? true : undefined
        };

        optRecordCreated = newRecord;
        const updated = existingIdx !== -1 
          ? prev.map((r, i) => i === existingIdx ? newRecord : r)
          : [...prev, newRecord];
        
        saveLocalData({ records: updated });
        return updated;
      });
    };

    // 1. Optimistically update local state for instantaneous UI response
    updateLocally();

    recentRecordMutationsRef.current.set(mutationKey, {
      record: data.status === 'absent' ? null : optRecordCreated,
      timestamp: Date.now()
    });

    notifyCrossTabSync();

    // 2. Persist to serverless / cloud backend
    try {
      const res = await fetch('/api/manual-checkin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        const result = await res.json();
        if (result && result.record) {
          removeLocalDeletedRecordKey(result.record.id);
          removeLocalDeletedRecordKey(`${result.record.studentId}_${result.record.date}`);
          setRecords(prev => {
            const existingIdx = prev.findIndex(r => r.studentId === result.record.studentId && r.date === result.record.date);
            let updated: AttendanceRecord[];
            if (existingIdx !== -1) {
              updated = prev.map((r, i) => i === existingIdx ? result.record : r);
            } else {
              updated = [...prev, result.record];
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
      }
    } catch {
      // Offline fallback: already updated locally in step 1
    } finally {
      pendingMutationsRef.current.delete(mutationKey);
      notifyCrossTabSync();
    }
  };

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
      if (updated.testMode === false) {
        setRecords(prev => {
          const kept = prev.filter(r => !r.isTestMode);
          saveLocalData({ records: kept });
          return kept;
        });
      }
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
        if (Array.isArray(data.records)) {
          setRecords(data.records);
          saveLocalData({ records: data.records });
        }
        if (data.message) {
          showSyncNotification(`✅ ${data.message}`);
        } else {
          showSyncNotification('✅ 系统设置已通过双向状态校验并成功保存！');
        }
      }
    } catch {
      // Offline fallback: already preserved locally in step 1
    }
  };

  // Handle save class (添加或编辑班级)
  const handleSaveClass = async (classData: Partial<ClassGroup>) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有添加或修改班级的权限！');
    }

    const classId = classData.id || `class-${Date.now()}`;
    const mutationPayload: Partial<ClassGroup> = { ...classData, id: classId };
    pendingClassMutationsRef.current.set(classId, mutationPayload);
    expectedEntitiesRef.current.set(classId, { type: 'class', timestamp: Date.now(), name: classData.name });
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
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mutationPayload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (data.class && data.class.id) {
          const authoritativeClasses: ClassGroup[] = Array.isArray(data.classes) ? data.classes : [];
          setClasses(prev => {
            const updated = authoritativeClasses.length > 0
              ? authoritativeClasses
              : (prev.some(c => c.id === data.class.id)
                  ? prev.map(c => c.id === data.class.id ? data.class : c)
                  : [...prev, data.class]);
            saveLocalData({ classes: updated });
            return updated;
          });
        }
        pendingClassMutationsRef.current.delete(classId);
        showSyncNotification(`✅ 班级【${classData.name || '信息'}】已保存并同步！`);
      }
    } catch {
      // Offline fallback
    } finally {
      pendingClassMutationsRef.current.delete(classId);
      notifyCrossTabSync();
    }
  };

  // Handle quick toggle class home visibility
  const handleToggleClassVisibility = async (classId: string, isHiddenFromHome: boolean) => {
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

    // 2. Protect with in-flight mutation ref with timestamp to prevent trailing race-condition poll overwrites
    const mutationTimestamp = Date.now();
    pendingClassMutationsRef.current.set(classId, { 
      ...currentClass, 
      isHiddenFromHome,
      _ts: mutationTimestamp 
    } as any);
    syncVersionRef.current = (syncVersionRef.current || 0) + 1;

    // 3. Memory state consistency check for hiddenClassIds & classes to prevent cross-device state rollback
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

      // Recalculate validated hidden IDs array from memory state to guarantee consistency
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
      // Defer deleting the pending mutation by 3.5 seconds to fully absorb any trailing in-flight server updates
      setTimeout(() => {
        const currentPending = pendingClassMutationsRef.current.get(classId) as any;
        if (currentPending && currentPending._ts === mutationTimestamp) {
          pendingClassMutationsRef.current.delete(classId);
        }
      }, 3500);
    };

    try {
      const res = await fetch(`/api/classes/${classId}/visibility`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isHiddenFromHome, hiddenClassIds: nextHiddenArray }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (data.config) {
          setConfig(data.config);
        }
        const authoritativeClasses: ClassGroup[] = Array.isArray(data.classes) ? data.classes : [];
        if (authoritativeClasses.length > 0) {
          setClasses(authoritativeClasses);
          saveLocalData({ classes: authoritativeClasses, config: data.config });
        } else if (data.class) {
          setClasses(prev => {
            const updated = prev.map(c => c.id === classId ? { ...c, ...data.class, isHiddenFromHome } : c);
            saveLocalData({ classes: updated, config: data.config });
            return updated;
          });
        }
        showSyncNotification(isHiddenFromHome ? '✅ 班级已设置为不在首页展示' : '✅ 班级已恢复在首页正常展示');
      } else {
        // Fallback to /api/classes
        const fallbackRes = await fetch('/api/classes', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...currentClass, isHiddenFromHome }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (typeof fallbackData.syncVersion === 'number') {
            syncVersionRef.current = fallbackData.syncVersion;
          }
          showSyncNotification('✅ 班级展示状态已同步保存');
        }
      }
    } catch {
      // Offline fallback
    } finally {
      safeDeletePending();
      notifyCrossTabSync();
    }
  };

  // Handle delete class (删除班级)
  const handleDeleteClass = async (classId: string) => {
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

    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        showSyncNotification('✅ 班级及关联数据已成功删除并同步！');
      }
    } catch {
      // Offline fallback
    }
  };

  // Handle add or update student (录入或编辑学员)
  const handleAddStudent = async (studentData: any) => {
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

      // If updating student, also sync attendance record names
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

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (Array.isArray(data.students) && data.students.length > 0) {
          setStudents(data.students);
          saveLocalData({ students: data.students });
        } else if (data.student) {
          setStudents(prev => {
            const exists = prev.some(s => s.id === data.student.id);
            const updated = exists ? prev.map(s => s.id === data.student.id ? data.student : s) : [...prev, data.student];
            saveLocalData({ students: updated });
            return updated;
          });
        }
        expectedEntitiesRef.current.delete(assignedId);
        showSyncNotification(`✅ 学员【${payload.name}】档案已保存并同步！`);
      }
    } catch {
      // Offline fallback
    }
  };

  // Handle batch add students (批量录入学员)
  const handleBatchAddStudents = async (classId: string, namesText: string, defaultAge?: number, defaultBirthDate?: string) => {
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

    try {
      const res = await fetch('/api/students/batch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ classId, namesText, defaultAge, defaultBirthDate }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (Array.isArray(data.students) && data.students.length > 0) {
          setStudents(data.students);
          saveLocalData({ students: data.students });
        }
        showSyncNotification(`✅ 批量录入学员成功并同步！`);
      }
    } catch {
      // Offline fallback
    }
  };

  // Handle delete student (删除学员)
  const handleDeleteStudent = async (studentId: string) => {
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

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (typeof data.syncVersion === 'number') {
          syncVersionRef.current = data.syncVersion;
        }
        if (Array.isArray(data.students)) {
          setStudents(data.students);
          saveLocalData({ students: data.students });
        }
        showSyncNotification('✅ 学员档案已成功删除并同步！');
      }
    } catch {
      // Offline fallback
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
