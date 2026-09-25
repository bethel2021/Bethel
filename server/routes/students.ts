import { Router, Request, Response } from 'express';
import type { Student } from '../../src/types.js';
import { calculateAge } from '../initialData.js';
import {
  students,
  records,
  syncVersion,
  setRecords,
  dataStore,
  initOrLoadDataAsync,
  verifySuperAdminPermission
} from '../dataStore.js';
import { getAuthContext } from '../authHelper.js';

export const studentsRouter = Router();

// GET /students
studentsRouter.get('/students', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;
  const classId = req.query.classId as string | undefined;
  const filtered = await dataStore.getStudents(classId, assignedClassId);
  res.json({
    success: true,
    students: filtered,
    data: filtered,
    count: filtered.length
  });
});

// GET /students/:id
studentsRouter.get('/students/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const stu = await dataStore.getStudentById(id);
  if (!stu) return res.status(404).json({ error: '学员不存在' });
  res.json({ success: true, student: stu, data: stu });
});

// POST /students - Add or edit student (Superadmin only)
studentsRouter.post('/students', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    let { id, name, gender, birthDate, age, classId, parentName, parentPhone, memberCode } = req.body;
    if (!name || !classId) {
      return res.status(400).json({ error: '姓名与所属班级/团契为必填项' });
    }

    if (!birthDate && age) {
      const year = new Date().getFullYear() - Number(age);
      birthDate = `${year}-06-01`;
    } else if (!birthDate) {
      birthDate = '2019-06-01';
    }

    const computedAge = calculateAge(birthDate, Number(age) || 7);

    const idx = students.findIndex(s => 
      (id && s.id === id) || 
      (memberCode && s.memberCode === memberCode) ||
      (name && s.name === name && (classId ? s.classId === classId : true))
    );
    if (idx !== -1) {
      const targetId = students[idx].id;
      const updatedStudent: Student = { 
        ...students[idx], 
        name, 
        gender: gender || students[idx].gender || 'boy', 
        birthDate,
        age: computedAge, 
        classId, 
        parentName: parentName || '', 
        parentPhone: parentPhone || '',
        memberCode: memberCode || students[idx].memberCode
      };
      // Also update studentName in historical records
      setRecords(records.map(r => r.studentId === targetId ? { ...r, studentName: name, classId } : r));
      const saved = await dataStore.saveStudent(updatedStudent);
      return res.json({ success: true, student: saved, students, syncVersion, message: '学员信息已更新' });
    }

    const nextCodeNum = students.length + 1;
    const studentId = (id && String(id).trim()) || `s-${Date.now().toString().slice(-6)}`;
    const newStudent: Student = {
      id: studentId,
      name,
      gender: gender || 'boy',
      birthDate,
      age: computedAge,
      classId,
      parentName: parentName || '',
      parentPhone: parentPhone || '',
      memberCode: memberCode || `BTL-${String(nextCodeNum).padStart(2, '0')}`,
      joinDate: new Date().toISOString().split('T')[0]
    };
    const saved = await dataStore.saveStudent(newStudent);
    res.json({ success: true, student: saved, students, syncVersion, message: '学员档案建立成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /students/batch - Batch import students (Superadmin only)
studentsRouter.post('/students/batch', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    const { classId, namesText, defaultGender = 'boy', defaultBirthDate, defaultAge } = req.body;
    if (!classId || !namesText) {
      return res.status(400).json({ error: '请选择班级并输入学员姓名列表' });
    }

    let birthDate = defaultBirthDate;
    if (!birthDate) {
      const ageNum = Number(defaultAge) || 7;
      birthDate = `${new Date().getFullYear() - ageNum}-06-01`;
    }
    const computedAge = calculateAge(birthDate, Number(defaultAge) || 7);

    const rawNames = String(namesText)
      .split(/[\n,，\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (rawNames.length === 0) {
      return res.status(400).json({ error: '未识别到有效姓名' });
    }

    const added: Student[] = [];
    rawNames.forEach((name, i) => {
      const nextCodeNum = students.length + 1;
      const stu: Student = {
        id: `s-${Date.now().toString().slice(-5)}${i}`,
        name,
        gender: defaultGender,
        birthDate,
        age: computedAge,
        classId,
        parentName: '家长/联系人',
        parentPhone: '138****0000',
        memberCode: `BTL-${String(nextCodeNum).padStart(2, '0')}`,
        joinDate: new Date().toISOString().split('T')[0]
      };
      added.push(stu);
    });

    await dataStore.saveStudentsBatch(added);

    res.json({ success: true, count: added.length, students, syncVersion, message: `成功批量录入 ${added.length} 名学员，已自动推算年龄为 ${computedAge} 岁！` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /students/:id - Delete student (Superadmin only)
studentsRouter.delete('/students/:id', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    const { id } = req.params;
    let idx = students.findIndex(s => s.id === id);
    if (idx === -1) {
      idx = students.findIndex(s => s.memberCode === id || s.name === id);
    }
    if (idx !== -1) {
      const removed = students[idx];
      await dataStore.deleteStudent(removed.id);
      return res.json({ success: true, students, syncVersion, message: `学员【${removed.name}】已成功从名册中彻底删除！` });
    }
    res.status(404).json({ error: '学员不存在或已被删除' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
