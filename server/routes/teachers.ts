import { Router, Request, Response } from 'express';
import {
  teachers,
  syncVersion,
  dataStore,
  verifySuperAdminPermission
} from '../dataStore.js';
import { broadcastRealtimeState } from './realtime.js';

export const teachersRouter = Router();

// GET /teachers
teachersRouter.get('/teachers', async (req: Request, res: Response) => {
  const classId = req.query.classId as string | undefined;
  const filtered = await dataStore.getTeachers(classId);
  res.json({
    success: true,
    teachers: filtered,
    data: filtered,
    count: filtered.length
  });
});

// GET /teachers/:id
teachersRouter.get('/teachers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const tch = await dataStore.getTeacherById(id);
  if (!tch) return res.status(404).json({ error: '教师不存在' });
  res.json({ success: true, teacher: tch, data: tch });
});

// POST /teachers - Add or edit teacher (Superadmin only)
teachersRouter.post('/teachers', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id, name, gender, phone, wechat, classId, roleTitle, joinDate, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: '教师姓名均为必填项' });
    }

    const cleanName = String(name).trim().replace(/\s*老师$/, '');
    const teacherId = (id && String(id).trim()) || `t-${Date.now().toString().slice(-6)}`;

    const savedTeacher = await dataStore.saveTeacher({
      id: teacherId,
      name: cleanName,
      gender: gender || 'boy',
      phone: phone || '',
      wechat: wechat || '',
      classId: classId || '',
      roleTitle: roleTitle || '班主任',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      notes: notes || ''
    });

    broadcastRealtimeState('teachers_updated');
    return res.json({ success: true, teacher: savedTeacher, teachers, syncVersion, message: '教师资料已成功保存' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /teachers/:id - Delete teacher (Superadmin only)
teachersRouter.delete('/teachers/:id', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id } = req.params;
    const removed = await dataStore.deleteTeacher(id);
    if (!removed) {
      return res.status(404).json({ error: '未找到该教师资料' });
    }

    broadcastRealtimeState('teachers_updated');
    return res.json({ success: true, teachers, syncVersion, message: `教师【${removed.name}】已成功从名册中彻底删除！` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
