import { Router, Request, Response } from 'express';
import type { ClassGroup } from '../../src/types.js';
import {
  classes,
  students,
  systemConfig,
  syncVersion,
  dataStore,
  initOrLoadDataAsync,
  verifySuperAdminPermission
} from '../dataStore.js';
import { getAuthContext } from '../authHelper.js';

export const classesRouter = Router();

// GET /classes
classesRouter.get('/classes', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;
  const mapped = await dataStore.getClasses(assignedClassId);
  res.json({
    success: true,
    classes: mapped,
    data: mapped,
    count: mapped.length
  });
});

// GET /classes/:id
classesRouter.get('/classes/:id', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const { id } = req.params;
  if (!auth.isSuperAdmin && auth.assignedClassId && id !== auth.assignedClassId) {
    return res.status(403).json({ error: '权限不足：无法访问非负责班级信息' });
  }
  const cls = await dataStore.getClassById(id);
  if (!cls) return res.status(404).json({ error: '班级不存在' });
  res.json({ success: true, class: cls, data: cls });
});

// POST /classes - Add or edit class (Superadmin only)
classesRouter.post('/classes', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    const { id, name, ageRange, teacher, subjectTeacher, classroom, color, groupType, description, isHiddenFromHome } = req.body;
    if (!name) {
      return res.status(400).json({ error: '班级/团契名称为必填项' });
    }

    const idx = classes.findIndex(c => (id && c.id === id) || (name && c.name === name));
    if (idx !== -1) {
      const updatedClass: ClassGroup = {
        ...classes[idx],
        name,
        ageRange: ageRange !== undefined ? ageRange : classes[idx].ageRange,
        teacher: teacher !== undefined ? teacher : classes[idx].teacher,
        subjectTeacher: subjectTeacher !== undefined ? subjectTeacher : classes[idx].subjectTeacher,
        classroom: classroom !== undefined ? classroom : classes[idx].classroom,
        color: color !== undefined ? color : classes[idx].color,
        groupType: groupType !== undefined ? groupType : (classes[idx].groupType || 'sunday_school'),
        description: description !== undefined ? description : classes[idx].description,
        isHiddenFromHome: isHiddenFromHome !== undefined ? !!isHiddenFromHome : (classes[idx].isHiddenFromHome || false),
      };
      const saved = await dataStore.saveClass(updatedClass);
      systemConfig.hiddenClassIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
      await dataStore.saveSystemConfig(systemConfig);
      return res.json({ success: true, class: saved, classes, syncVersion, message: '班级信息修改成功' });
    }

    const newClass: ClassGroup = {
      id: (id && String(id).trim()) || `class-${Date.now().toString().slice(-6)}`,
      name,
      ageRange: ageRange || '自选年龄段',
      teacher: teacher || '班级负责人',
      subjectTeacher: subjectTeacher || '上课老师',
      classroom: classroom || '主堂教室',
      color: color || 'bg-amber-500',
      groupType: groupType || 'sunday_school',
      description: description || '',
      isHiddenFromHome: !!isHiddenFromHome,
    };
    const saved = await dataStore.saveClass(newClass);
    systemConfig.hiddenClassIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
    await dataStore.saveSystemConfig(systemConfig);
    res.json({ success: true, class: saved, classes, syncVersion, message: '成功新增班级/团契' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /classes/:id/visibility - Update Class Home Visibility (Superadmin only)
classesRouter.post('/classes/:id/visibility', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id } = req.params;
    const { isHiddenFromHome, hiddenClassIds: clientHiddenIds } = req.body;

    // Use the atomic save in dataStore
    await dataStore.saveClassVisibility(id, !!isHiddenFromHome, clientHiddenIds);

    const updatedClass = classes.find(c => c.id === id);
    if (!updatedClass) {
      return res.status(404).json({ error: '未找到指定班级' });
    }

    const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
    res.json({
      success: true,
      class: updatedClass,
      classes: classes.map(c => ({
        ...c,
        isHiddenFromHome: hiddenIds.includes(c.id)
      })),
      hiddenClassIds: hiddenIds,
      config: {
        ...systemConfig,
        hiddenClassIds: hiddenIds
      },
      syncVersion,
      message: `班级【${updatedClass.name}】已成功设置为首页${isHiddenFromHome ? '隐藏' : '显示'}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /classes/:id - Delete Class (Superadmin only)
classesRouter.delete('/classes/:id', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id } = req.params;
    let idx = classes.findIndex(c => c.id === id);
    if (idx === -1) {
      idx = classes.findIndex(c => c.name === id);
    }

    if (idx !== -1) {
      const targetClass = classes[idx];
      const clsId = targetClass.id;
      const clsName = targetClass.name;
      const enrolledStudents = students.filter(s => s.classId === clsId);
      await dataStore.deleteClass(clsId);
      return res.json({ 
        success: true, 
        message: `班级【${clsName}】已成功删除${enrolledStudents.length > 0 ? `（同时清除了 ${enrolledStudents.length} 名在册学员档案）` : ''}` 
      });
    }
    res.status(404).json({ error: '班级不存在或已被删除' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
