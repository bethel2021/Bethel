import { Router, Request, Response } from 'express';
import type { AttendanceRecord } from '../../src/types.js';
import {
  students,
  records,
  systemConfig,
  getActiveSundayDate,
  getRomeTimeParts,
  dataStore,
  removeDeletedRecordKey,
  notifyDataChange,
  scheduleSupabaseSnapshotSave,
  getSyncVersion
} from '../dataStore.js';
import { getAuthContext } from '../authHelper.js';

export const attendanceRouter = Router();

export function isServerCheckinAllowed(now: Date = new Date()): { isAllowed: boolean; message?: string } {
  if (systemConfig.testMode) {
    return { isAllowed: true };
  }

  const romeTime = getRomeTimeParts(now);
  const isSunday = romeTime.dayOfWeek === 0;

  if (!isSunday) {
    return {
      isAllowed: false,
      message: '非主日签到开放时段，请等待下一个主日！（可联系管理员开启｛测试模式｝）'
    };
  }

  let startMinutes = 8 * 60 + 30; // 08:30
  let endMinutes = 12 * 60 + 30; // 12:30

  if (systemConfig.checkinStartTime) {
    const [sh, sm] = systemConfig.checkinStartTime.split(':').map(Number);
    if (!isNaN(sh) && !isNaN(sm)) {
      startMinutes = sh * 60 + sm;
    }
  }

  if (systemConfig.checkinEndTime) {
    const [eh, em] = systemConfig.checkinEndTime.split(':').map(Number);
    if (!isNaN(eh) && !isNaN(em)) {
      endMinutes = eh * 60 + em;
    }
  }

  const currentMinutes = romeTime.hour * 60 + romeTime.minute;

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return {
      isAllowed: false,
      message: '非主日签到开放时段，请等待下一个主日！（可联系管理员开启｛测试模式｝）'
    };
  }

  return { isAllowed: true };
}

// 3. Student / Member check-in (WeChat scan / mobile QR / quick attendance)
attendanceRouter.post('/checkin', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const check = isServerCheckinAllowed(now);
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }

    const { studentId, memoryVerseCompleted, offeringCompleted, notes = '' } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: '请选择或输入打卡学员姓名' });
    }

    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: '未在伯特利教会名册中找到该学员，请联系老师登记' });
    }

    const auth = getAuthContext(req);
    if (!auth.isSuperAdmin && auth.assignedClassId) {
      if (student.classId !== auth.assignedClassId) {
        return res.status(403).json({ error: '权限受限：您只能为您负责的班级学员进行打卡签到' });
      }
    }

    const targetDate = getActiveSundayDate();
    const existing = records.find(r => r.studentId === studentId && r.date === targetDate);
    if (existing) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        record: existing,
        student,
        message: `${student.name} 今天已经完成打卡啦！签到时间：${existing.timeStr}。`
      });
    }

    const romeTime = getRomeTimeParts(now);
    const curTimeStr = romeTime.timeStr;
    
    let isLate = false;
    if (systemConfig.enableLateRule) {
      const [lateH, lateM] = (systemConfig.lateThresholdTime || '09:30').split(':').map(Number);
      if (romeTime.hour > lateH || (romeTime.hour === lateH && romeTime.minute > lateM)) {
        isLate = true;
      }
    }
    if (systemConfig.checkinEndTime) {
      const [endH, endM] = systemConfig.checkinEndTime.split(':').map(Number);
      if (!isNaN(endH) && !isNaN(endM)) {
        if (romeTime.hour > endH || (romeTime.hour === endH && romeTime.minute > endM)) {
          isLate = true;
        }
      }
    }
    const status: 'present' | 'late' = isLate ? 'late' : 'present';

    const verseCheck = memoryVerseCompleted !== undefined 
      ? Boolean(memoryVerseCompleted) 
      : systemConfig.defaultMemoryVerseChecked;
    const offCheck = offeringCompleted !== undefined 
      ? Boolean(offeringCompleted) 
      : systemConfig.defaultOfferingChecked;

    const newRecord: AttendanceRecord = {
      id: `rec-${targetDate}-${student.id}-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      date: targetDate,
      timestamp: now.toISOString(),
      timeStr: curTimeStr,
      status,
      method: 'wechat_scan',
      memoryVerseCompleted: systemConfig.enableMemoryVerseOption ? verseCheck : false,
      offeringCompleted: systemConfig.enableOfferingOption ? offCheck : false,
      notes: notes ? String(notes).trim() : undefined
    };

    await dataStore.saveAttendanceRecord(newRecord);

    res.json({
      success: true,
      record: newRecord,
      student,
      message: `🎉 签到成功！愿主赐福 ${student.name}，主日蒙恩！`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '打卡失败，请重试' });
  }
});

// 4. Manual checkin / excuse / absent
attendanceRouter.post('/manual-checkin', async (req: Request, res: Response) => {
  try {
    const check = isServerCheckinAllowed();
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }

    const { 
      studentId, 
      date, 
      status, 
      memoryVerseCompleted, 
      offeringCompleted, 
      notes
    } = req.body || {};

    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: '学员不存在' });
    }

    const auth = getAuthContext(req);
    if (!auth.isSuperAdmin && auth.assignedClassId) {
      if (student.classId !== auth.assignedClassId) {
        return res.status(403).json({ error: '权限受限：您只能记录或修改您负责班级的考勤信息' });
      }
    }

    const targetDate = date || getActiveSundayDate();
    const studentDateKey = `${studentId}_${targetDate}`;
    const existingIdx = records.findIndex(r => r.studentId === studentId && r.date === targetDate);

    if (status === 'absent') {
      let removedRecId: string | undefined;
      if (existingIdx !== -1) {
        removedRecId = records[existingIdx]?.id;
      }
      await dataStore.deleteAttendanceRecord(studentId, targetDate, removedRecId);
      return res.json({ success: true, deletedKey: studentDateKey, message: '已标记为缺席/未签到' });
    }

    const now = getRomeTimeParts();
    let finalStatus = status;
    if (finalStatus === 'present') {
      let isLate = false;
      if (systemConfig.enableLateRule) {
        const [lateH, lateM] = (systemConfig.lateThresholdTime || '15:00').split(':').map(Number);
        if (now.hour > lateH || (now.hour === lateH && now.minute > lateM)) {
          isLate = true;
        }
      }
      if (systemConfig.checkinEndTime) {
        const [endH, endM] = systemConfig.checkinEndTime.split(':').map(Number);
        if (!isNaN(endH) && !isNaN(endM)) {
          if (now.hour > endH || (now.hour === endH && now.minute > endM)) {
            isLate = true;
          }
        }
      }
      if (isLate) {
        finalStatus = 'late';
      }
    }

    let recordToSave: AttendanceRecord;

    if (existingIdx !== -1) {
      recordToSave = {
        ...records[existingIdx],
        status: finalStatus,
        timestamp: `${targetDate}T${now.fullTimeStr}.000Z`,
        timeStr: now.timeStr,
        method: 'manual_teacher',
        memoryVerseCompleted: memoryVerseCompleted !== undefined ? memoryVerseCompleted : records[existingIdx].memoryVerseCompleted,
        offeringCompleted: offeringCompleted !== undefined ? offeringCompleted : records[existingIdx].offeringCompleted,
        notes: notes !== undefined ? notes : records[existingIdx].notes
      };
    } else {
      recordToSave = {
        id: `rec-${targetDate}-${studentId}-${Date.now()}`,
        studentId,
        studentName: student.name,
        classId: student.classId,
        date: targetDate,
        timestamp: `${targetDate}T${now.fullTimeStr}.000Z`,
        timeStr: now.timeStr,
        status: finalStatus,
        method: 'manual_teacher',
        memoryVerseCompleted: !!memoryVerseCompleted,
        offeringCompleted: offeringCompleted || false,
        notes
      };
    }

    await dataStore.saveAttendanceRecord(recordToSave);

    res.json({
      success: true,
      record: recordToSave,
      student,
      message: `已成功记录 ${student.name} 的考勤状态`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '更新签到记录失败' });
  }
});

// 5. Batch Check-in
attendanceRouter.post('/batch-checkin', async (req: Request, res: Response) => {
  try {
    const check = isServerCheckinAllowed();
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }

    const { classId, date, status = 'present' } = req.body;
    const auth = getAuthContext(req);
    if (!auth.isSuperAdmin && auth.assignedClassId) {
      if (classId && classId !== 'all' && classId !== auth.assignedClassId) {
        return res.status(403).json({ error: '权限受限：您只能为您负责的班级进行批量打卡' });
      }
    }

    const targetDate = date || getActiveSundayDate();
    const now = new Date();
    const romeTime = getRomeTimeParts(now);
    const timeStr = romeTime.timeStr;

    let finalStatus = status;
    if (finalStatus === 'present') {
      let isLate = false;
      if (systemConfig.enableLateRule) {
        const [lateH, lateM] = (systemConfig.lateThresholdTime || '09:30').split(':').map(Number);
        if (romeTime.hour > lateH || (romeTime.hour === lateH && romeTime.minute > lateM)) {
          isLate = true;
        }
      }
      if (systemConfig.checkinEndTime) {
        const [endH, endM] = systemConfig.checkinEndTime.split(':').map(Number);
        if (!isNaN(endH) && !isNaN(endM)) {
          if (romeTime.hour > endH || (romeTime.hour === endH && romeTime.minute > endM)) {
            isLate = true;
          }
        }
      }
      if (isLate) {
        finalStatus = 'late';
      }
    }

    const effectiveClassId = (!auth.isSuperAdmin && auth.assignedClassId) ? auth.assignedClassId : classId;
    const targetStudents = effectiveClassId && effectiveClassId !== 'all'
      ? students.filter(s => s.classId === effectiveClassId)
      : students;

    let updatedCount = 0;
    targetStudents.forEach(stu => {
      removeDeletedRecordKey(`${stu.id}_${targetDate}`);
      const existingIdx = records.findIndex(r => r.studentId === stu.id && r.date === targetDate);
      if (existingIdx !== -1) {
        records[existingIdx].status = finalStatus;
      } else {
        records.push({
          id: `rec-${targetDate}-${stu.id}-${Date.now()}`,
          studentId: stu.id,
          studentName: stu.name,
          classId: stu.classId,
          date: targetDate,
          timestamp: now.toISOString(),
          timeStr,
          status: finalStatus,
          method: 'manual_teacher',
          memoryVerseCompleted: systemConfig.defaultMemoryVerseChecked,
          offeringCompleted: systemConfig.defaultOfferingChecked
        });
      }
      updatedCount++;
    });

    notifyDataChange();
    saveDataToFile();
    scheduleSupabaseSnapshotSave(500);

    res.json({
      success: true,
      count: updatedCount,
      syncVersion: getSyncVersion(),
      records,
      message: `已成功为 ${updatedCount} 位学员登记到校！`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance Record Queries
const getRecordsHandler = async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;
  const date = (req.query.date as string) || undefined;
  const studentId = (req.query.studentId as string) || undefined;
  const classId = (req.query.classId as string) || undefined;
  const filtered = await dataStore.getAttendanceRecords({ date, studentId, classId }, assignedClassId);
  res.json({
    success: true,
    records: filtered,
    data: filtered,
    count: filtered.length,
    activeSunday: getActiveSundayDate()
  });
};

attendanceRouter.get('/records', getRecordsHandler);
attendanceRouter.get('/attendance', getRecordsHandler);
attendanceRouter.get('/attendance-records', getRecordsHandler);
attendanceRouter.get('/attendance_records', getRecordsHandler);
