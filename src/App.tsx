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
import { MonthlyReportView } from './components/MonthlyReportView';
import { AnnualReportView } from './components/AnnualReportView';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { MultiDeviceSyncModal } from './components/MultiDeviceSyncModal';
import { 
  getLocalData, 
  saveLocalData, 
  resetLocalData, 
  getLocalAccounts, 
  saveLocalAccount, 
  deleteLocalAccount, 
  updateLocalAccountPassword,
  exportLocalBackup,
  importLocalBackup
} from './utils/localStore';
import { getCurrentRomeTimeStr, getCurrentRomeFullTimeStr, getRomeTimeParts, checkIsWithinSundayWindow } from './utils/dateUtils';

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
  const [activeTab, setActiveTab] = useState<'today' | 'monthly' | 'annual' | 'settings'>('today');
  const [loading, setLoading] = useState(true);
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

  // App Data (Initialized for Bethel Church)
  const [config, setConfig] = useState<SystemConfig>({
    churchName: '伯特利教会',
    schoolTitle: '主日学与团契',
    allowedDayOfWeek: 0,
    checkinStartTime: '08:30',
    checkinEndTime: '12:30',
    testMode: true,
    currentYear: 2026,
    currentSemester: '2026年秋季学期',
    weeklyMemoryVerse: '雅各就给那地方起名叫伯特利。他说：这地方何等可畏！这不是别的，乃是神的殿，也是天的门。',
    memoryVerseReference: '创世记 28:17,19',
    qrSecretToken: 'BETHEL_SUNDAY_2026_TOKEN',

    enableMemoryVerseOption: true,
    defaultMemoryVerseChecked: true,
    enableOfferingOption: false,
    defaultOfferingChecked: false,
    enableLateRule: true,
    lateThresholdTime: '09:30',
    enableExcusedNote: true,
    enableCheckinPopup: true,
    adminPassword: 'bethel2026',
  });

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>(() => getLocalAccounts());
  const [activeSunday, setActiveSunday] = useState<string>('2026-09-13');

  const previousRecordsCountRef = useRef<number>(0);
  const syncVersionRef = useRef<number>(0);
  const pendingMutationsRef = useRef<Set<string>>(new Set());
  const pendingClassMutationsRef = useRef<Map<string, Partial<ClassGroup>>>(new Map());
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [serverRuntime, setServerRuntime] = useState<string | null>(null);

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

  // Authoritative state application from any sync channel (WebSocket, SSE, Long-poll, HTTP)
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

    // Smart diffing updates to prevent unnecessary re-renders & page flickering
    setConfig(prev => isDataEqual(prev, data.config) ? prev : data.config);

    let mergedClassesForCache: ClassGroup[] | undefined;
    if (Array.isArray(data.classes)) {
      const local = getLocalData();
      const localClassesMap = new Map(local.classes.map(c => [c.id, c]));
      const mergedClasses = data.classes.map((c: any) => {
        // 1. If this class has a local mutation in flight, preserve the pending state
        if (pendingClassMutationsRef.current.has(c.id)) {
          const pending = pendingClassMutationsRef.current.get(c.id)!;
          return {
            ...c,
            ...pending,
            isHiddenFromHome: pending.isHiddenFromHome !== undefined 
              ? !!pending.isHiddenFromHome 
              : (c.isHiddenFromHome !== undefined ? !!c.isHiddenFromHome : false)
          };
        }

        // 2. Otherwise safely merge server data and local fallback
        const localClass = localClassesMap.get(c.id);
        return {
          ...c,
          isHiddenFromHome: c.isHiddenFromHome !== undefined 
            ? !!c.isHiddenFromHome 
            : (localClass ? !!localClass.isHiddenFromHome : false)
        };
      });
      mergedClassesForCache = mergedClasses;
      setClasses(prev => isDataEqual(prev, mergedClasses) ? prev : mergedClasses);
    }

    if (Array.isArray(data.students)) {
      setStudents(prev => isDataEqual(prev, data.students) ? prev : data.students);
    }

    if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
      setAccounts(prev => isDataEqual(prev, data.accounts) ? prev : data.accounts);
    } else if (!data.accounts) {
      setAccounts(getLocalAccounts());
    }

    if (data.activeSunday) {
      setActiveSunday(prev => prev === data.activeSunday ? prev : data.activeSunday);
    }

    if (Array.isArray(data.records)) {
      setRecords(prev => {
        let incomingRecords: AttendanceRecord[] = data.records;

        // Preserve optimistic local updates if mutations are currently in flight
        if (pendingMutationsRef.current.size > 0) {
          const preservedMap = new Map<string, AttendanceRecord | null>();
          pendingMutationsRef.current.forEach(key => {
            const [sId, dStr] = key.split('_KEY_SPLIT_');
            const optRec = prev.find(r => r.studentId === sId && r.date === dStr);
            preservedMap.set(key, optRec || null);
          });

          const merged = [...incomingRecords];
          preservedMap.forEach((optRec, key) => {
            const [sId, dStr] = key.split('_KEY_SPLIT_');
            const idx = merged.findIndex(r => r.studentId === sId && r.date === dStr);
            if (optRec) {
              if (idx !== -1) merged[idx] = optRec;
              else merged.push(optRec);
            } else {
              if (idx !== -1) merged.splice(idx, 1);
            }
          });
          incomingRecords = merged;
        }

        if (isDataEqual(prev, incomingRecords)) {
          return prev;
        }
        return incomingRecords;
      });
    }

    setLastSyncTime(getCurrentRomeFullTimeStr());

    // Keep local cache synced as authoritative backup
    saveLocalData({
      classes: mergedClassesForCache || data.classes || classes,
      students: data.students || students,
      config: data.config || config,
      records: data.records || records,
      activeSunday: data.activeSunday || activeSunday,
      accounts: data.accounts || accounts
    });

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
          config
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const result = await res.json();
        applyServerState(result, false);
        notifyCrossTabSync();
        return;
      }
      await loadState(false);
      notifyCrossTabSync();
    } catch {
      await loadState(false);
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  const handleManualSync = async () => {
    await syncWithCloud();
  };

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
          wsReconnectTimer = setTimeout(setupWebSocket, 2500);
        };

        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = setTimeout(setupWebSocket, 3000);
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
          esReconnectTimer = setTimeout(setupSSE, 3000);
        };
      } catch {
        clearTimeout(esReconnectTimer);
        esReconnectTimer = setTimeout(setupSSE, 4000);
      }
    };

    // 4. Layer 3: High-Frequency Long-Polling Worker (<1s fallback guaranteed)
    const runLongPoll = async () => {
      while (isMounted) {
        try {
          pollAbortController = new AbortController();
          const res = await fetch(
            `/api/realtime-poll?version=${syncVersionRef.current}&timeout=20000&t=${Date.now()}`,
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
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    };

    // Initialize all layers in parallel for maximum resilience
    setupWebSocket();
    setupSSE();
    runLongPoll();

    // 5. Safety Heartbeat Poll (every 5 seconds)
    const fallbackInterval = setInterval(() => {
      if (isMounted) loadState(false);
    }, 5000);

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

    // 8. Focus & Visibility Change triggers
    const onFocus = () => { if (isMounted) loadState(false); };
    const onVisibilityChange = () => {
      if (!document.hidden && isMounted) loadState(false);
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
    setRecords(prev => {
      const existing = prev.findIndex(r => r.id === newRecord.id);
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
      const msg = '非主日签到开放时段，请等待下一个主日！（可联系管理员开启｛测试模式｝）';
      setNewCheckinAlert(`⚠️ ${msg}`);
      setTimeout(() => setNewCheckinAlert(null), 4000);
      throw new Error(msg);
    }

    const updateLocally = () => {
      setRecords(prev => {
        const existingIdx = prev.findIndex(r => r.studentId === data.studentId && r.date === data.date);

        // If absent, cleanly remove existing record from list
        if (data.status === 'absent') {
          const updated = existingIdx !== -1 ? prev.filter((_, i) => i !== existingIdx) : prev;
          saveLocalData({ records: updated });
          return updated;
        }

        const student = students.find(s => s.id === data.studentId);
        const studentName = student ? student.name : '';
        const studentClassId = student ? student.classId : '';
        const nowTimeParts = getRomeTimeParts();
        const nowTimeStr = nowTimeParts.timeStr;

        let finalStatus = data.status;
        if (finalStatus === 'present') {
          let isLate = false;
          // 1. Check if late rule is enabled and exceeds late threshold (e.g. 09:30)
          if (config.enableLateRule) {
            const [lateH, lateM] = (config.lateThresholdTime || '09:30').split(':').map(Number);
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
          notes: data.notes
        };

        const updated = existingIdx !== -1 
          ? prev.map((r, i) => i === existingIdx ? newRecord : r)
          : [...prev, newRecord];
        
        saveLocalData({ records: updated });
        return updated;
      });
    };

    const mutationKey = `${data.studentId}_KEY_SPLIT_${data.date}`;
    pendingMutationsRef.current.add(mutationKey);

    // 1. Optimistically update local state for instantaneous UI response
    updateLocally();

    // 2. Always persist to serverless / cloud backend
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
    syncVersionRef.current = (syncVersionRef.current || 0) + 1;

    const saveLocally = () => {
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
        if (data.class && data.class.id) {
          setClasses(prev => {
            const idx = prev.findIndex(c => c.id === data.class.id);
            if (idx !== -1) {
              const updated = prev.map((c, i) => i === idx ? data.class : c);
              saveLocalData({ classes: updated });
              return isDataEqual(prev, updated) ? prev : updated;
            }
            const updated = [...prev, data.class];
            saveLocalData({ classes: updated });
            return updated;
          });
        }
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

    pendingClassMutationsRef.current.set(classId, { ...currentClass, isHiddenFromHome });
    syncVersionRef.current = (syncVersionRef.current || 0) + 1;

    setClasses(prev => {
      const updated = prev.map(c => c.id === classId ? { ...c, isHiddenFromHome } : c);
      saveLocalData({ classes: updated });
      return updated;
    });

    try {
      const res = await fetch(`/api/classes/${classId}/visibility`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isHiddenFromHome }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setIsServerAvailable(true);
        if (data.class) {
          setClasses(prev => {
            const updated = prev.map(c => c.id === classId ? data.class : c);
            saveLocalData({ classes: updated });
            return updated;
          });
        }
      } else {
        // Fallback to /api/classes
        await fetch('/api/classes', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...currentClass, isHiddenFromHome }),
        });
      }
    } catch {
      // Offline fallback
    } finally {
      pendingClassMutationsRef.current.delete(classId);
      notifyCrossTabSync();
    }
  };

  // Handle delete class (删除班级)
  const handleDeleteClass = async (classId: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：除了总管理员之外，其他账号只有管理签到权限，没有删除班级的权限！');
    }

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
        await loadState(false);
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

    const saveLocally = () => {
      setStudents(prev => {
        let updated: Student[];
        if (studentData.id) {
          updated = prev.map(s => s.id === studentData.id ? { ...s, ...studentData } : s);
        } else {
          const newStudent: Student = {
            ...studentData,
            id: `s-${Date.now()}`
          };
          updated = [...prev, newStudent];
        }
        saveLocalData({ students: updated });
        return updated;
      });

      // If updating student, also sync attendance record names
      if (studentData.id && studentData.name) {
        setRecords(prev => {
          const updated = prev.map(r => r.studentId === studentData.id ? { 
            ...r, 
            studentName: studentData.name, 
            classId: studentData.classId || r.classId 
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
        body: JSON.stringify(studentData),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        await loadState(false);
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
      const newItems: Student[] = lines.map((name, i) => ({
        id: `s-${Date.now()}-${i}`,
        name,
        gender: i % 2 === 0 ? 'boy' : 'girl',
        age: defaultAge || 7,
        birthDate: defaultBirthDate || '2019-06-01',
        classId,
        parentName: '家长/本人',
        parentPhone: '未填写',
        memberCode: `BTL-${Math.floor(100 + Math.random() * 900)}`,
        joinDate: new Date().toISOString().split('T')[0]
      }));
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
        setIsServerAvailable(true);
        await loadState(false);
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
        setIsServerAvailable(true);
        await loadState(false);
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

    const saveLocally = () => {
      const updated = saveLocalAccount(accountData);
      setAccounts(updated);
      notifyCrossTabSync();
    };

    saveLocally();

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(accountData),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        await loadState(false);
      }
    } catch {
      // Offline fallback
    }
  };

  // Handle delete admin account (总管理员删除账号)
  const handleDeleteAccount = async (username: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：仅总管理员可删除管理账号！');
    }

    const deleteLocally = () => {
      const updated = deleteLocalAccount(username);
      setAccounts(updated);
      notifyCrossTabSync();
    };

    deleteLocally();

    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        await loadState(false);
      }
    } catch {
      // Offline fallback
    }
  };

  // Handle modify admin account password (总管理员修改密码)
  const handleChangeAccountPassword = async (username: string, newPassword: string) => {
    if (currentUser?.role !== 'superadmin') {
      throw new Error('权限不足：仅总管理员可修改管理账号密码！');
    }

    const changeLocally = () => {
      const updated = updateLocalAccountPassword(username, newPassword);
      setAccounts(updated);
      notifyCrossTabSync();
    };

    changeLocally();

    try {
      const res = await fetch('/api/accounts/password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, newPassword }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setIsServerAvailable(true);
        await loadState(false);
      }
    } catch {
      // Offline fallback
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

  // Import JSON backup file (一键导入数据恢复)
  const handleImportData = async (file: File) => {
    try {
      const text = await file.text();
      const restored = importLocalBackup(text);
      setClasses(restored.classes);
      setStudents(restored.students);
      setConfig(restored.config);
      setRecords(restored.records);
      setAccounts(restored.accounts);
      setActiveSunday(restored.activeSunday);
      notifyCrossTabSync();
      setNewCheckinAlert(`📦 数据恢复成功：已恢复 ${restored.classes.length} 个班级与 ${restored.students.length} 名在册学员！`);
      setTimeout(() => setNewCheckinAlert(null), 4000);
    } catch (err: any) {
      throw new Error('导入恢复失败: ' + (err.message || '文件格式无效'));
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
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium">{newCheckinAlert}</span>
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
      />

      {/* Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'today' && (
          <TodayDashboard
            config={config}
            classes={classes}
            students={students}
            records={records}
            activeSunday={activeSunday}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onManualUpdate={handleManualUpdate}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReportView
            config={config}
            classes={classes}
            students={students}
            records={records}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'annual' && (
          <AnnualReportView
            config={config}
            classes={classes}
            students={students}
            records={records}
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
            currentUser={currentUser}
            onSaveConfig={handleSaveConfig}
            onSaveClass={handleSaveClass}
            onToggleClassVisibility={handleToggleClassVisibility}
            onDeleteClass={handleDeleteClass}
            onAddStudent={handleAddStudent}
            onBatchAddStudents={handleBatchAddStudents}
            onDeleteStudent={handleDeleteStudent}
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
            <span>{config.schoolTitle}</span>
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
