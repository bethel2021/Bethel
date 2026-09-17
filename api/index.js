// server/app.ts
import express from "express";

// server/initialData.ts
var initialClasses = [
  {
    id: "class-1",
    name: "\u5C0F\u5C0F\u73ED",
    ageRange: "2-3\u5C81",
    teacher: "\u674E\u8DEF\u5F97 \u8001\u5E08",
    subjectTeacher: "\u9648\u7EA6\u745F \u8001\u5E08",
    classroom: "\u526F\u5802101\u8BFE\u5BA4",
    color: "bg-emerald-500",
    groupType: "sunday_school",
    description: "\u5C0F\u5C0F\u73ED\u542F\u8499\uFF0C\u5723\u7ECF\u6545\u4E8B\u4E0E\u8D5E\u7F8E\u8BD7\u5F8B\u52A8"
  },
  {
    id: "class-2",
    name: "\u5C0F\u73ED",
    ageRange: "3-4\u5C81",
    teacher: "\u5F20\u7231\u534E \u8001\u5E08",
    subjectTeacher: "\u738B\u4FE1\u5B9E \u8001\u5E08",
    classroom: "\u526F\u5802102\u8BFE\u5BA4",
    color: "bg-teal-500",
    groupType: "sunday_school",
    description: "\u5E7C\u513F\u8BD7\u6B4C\u3001\u5723\u7ECF\u5C0F\u54C1\u683C\u4E0E\u5E38\u89C4\u6A21\u8303"
  },
  {
    id: "class-3",
    name: "\u4E2D\u73ED",
    ageRange: "4-5\u5C81",
    teacher: "\u738B\u6069\u5178 \u8001\u5E08",
    subjectTeacher: "\u5218\u559C\u4E50 \u8001\u5E08",
    classroom: "\u526F\u5802201\u8BFE\u5BA4",
    color: "bg-amber-500",
    groupType: "sunday_school",
    description: "\u4E3B\u65E5\u5B66\u4E2D\u73ED\uFF0C\u7814\u8BFB\u795E\u9020\u4E07\u7269\u4E0E\u611F\u6069\u987A\u670D"
  },
  {
    id: "class-4",
    name: "\u5927\u73ED",
    ageRange: "5-6\u5C81",
    teacher: "\u5F20\u5927\u536B \u8001\u5E08",
    subjectTeacher: "\u5468\u548C\u5E73 \u8001\u5E08",
    classroom: "\u526F\u5802202\u8BFE\u5BA4",
    color: "bg-orange-500",
    groupType: "sunday_school",
    description: "\u5E7C\u5C0F\u8854\u63A5\u73ED\uFF0C\u7814\u8BFB\u5723\u7ECF\u54C1\u683C\u4E0E\u656C\u62DC\u5B66\u4E60"
  },
  {
    id: "class-5",
    name: "\u521D\u4E2D\u73ED",
    ageRange: "12-14\u5C81",
    teacher: "\u738B\u63D0\u6469\u592A \u4F20\u9053",
    subjectTeacher: "\u8D75\u5FCD\u8010 \u8001\u5E08",
    classroom: "\u5BA3\u6559\u697C301\u5BA4",
    color: "bg-blue-500",
    groupType: "sunday_school",
    description: "\u521D\u4E2D\u5B66\u751F\u73ED\uFF0C\u5723\u7ECF\u771F\u7406\u6839\u57FA\u3001\u95E8\u5F92\u8BAD\u7EC3\u4E0E\u5C11\u5E74\u56E2\u5951"
  },
  {
    id: "class-6",
    name: "\u9AD8\u4E2D\u73ED",
    ageRange: "15-17\u5C81",
    teacher: "\u9648\u4FDD\u7F57 \u540C\u5DE5",
    subjectTeacher: "\u5B59\u6069\u6148 \u8001\u5E08",
    classroom: "\u5BA3\u6559\u697C302\u5BA4",
    color: "bg-indigo-500",
    groupType: "sunday_school",
    description: "\u9AD8\u4E2D\u95E8\u5F92\uFF0C\u5723\u7ECF\u4E16\u754C\u89C2\u3001\u4FE1\u4EF0\u601D\u8FA8\u4E0E\u57FA\u7763\u5F92\u4F8D\u5949\u5B9E\u8DF5"
  },
  {
    id: "class-7",
    name: "\u4EE5\u65AF\u62C9\u56E2\u5951",
    ageRange: "18-35\u5C81",
    teacher: "\u6797\u8153\u5229 \u540C\u5DE5",
    subjectTeacher: "\u94B1\u826F\u5584 \u8001\u5E08",
    classroom: "\u591A\u529F\u80FD\u9752\u5E74\u6D3B\u52A8\u5385",
    color: "bg-purple-500",
    groupType: "fellowship",
    description: "\u9752\u5E74\u56E2\u5951\uFF0C\u804C\u573A\u5F97\u80DC\u89C1\u8BC1\u3001\u8BD7\u6B4C\u656C\u62DC\u4E0E\u4E13\u6848\u670D\u4F8D"
  },
  {
    id: "class-8",
    name: "\u96C5\u6B4C\u56E2\u5951",
    ageRange: "\u5BB6\u5EAD\u4E0E\u6210\u5E74",
    teacher: "\u8D75\u5F7C\u5F97 \u957F\u8001",
    subjectTeacher: "\u5434\u5FE0\u4FE1 \u8001\u5E08",
    classroom: "\u4F2F\u7279\u5229\u526F\u5802\u6069\u6148\u5385",
    color: "bg-rose-500",
    groupType: "fellowship",
    description: "\u6210\u5E74\u4E0E\u5BB6\u5EAD\u56E2\u5951\uFF0C\u592B\u59BB\u5EFA\u9020\u3001\u5F7C\u6B64\u4EE3\u7977\u4E0E\u4E92\u52A9\u56E2\u5951"
  }
];
function calculateAge(birthDate, fallbackAge) {
  if (!birthDate) return fallbackAge ?? 0;
  const parts = birthDate.split("-");
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return fallbackAge ?? 0;
  const birthMonth = parts[1] ? parseInt(parts[1], 10) : 1;
  const birthDay = parts[2] ? parseInt(parts[2], 10) : 1;
  const now = /* @__PURE__ */ new Date();
  let age = now.getFullYear() - birthYear;
  const monthDiff = now.getMonth() + 1 - birthMonth;
  if (monthDiff < 0 || monthDiff === 0 && now.getDate() < birthDay) {
    age--;
  }
  return Math.max(0, age);
}
var initialStudents = [
  // 小小班 (2-3岁)
  { id: "s-101", name: "\u9648\u6069\u8BFA (Enoch)", gender: "boy", birthDate: "2023-04-12", age: 3, classId: "class-1", parentName: "\u9648\u5EFA\u56FD", parentPhone: "13800111201", memberCode: "BTL-01", joinDate: "2025-09-01" },
  { id: "s-102", name: "\u5468\u8FE6\u5357 (Canaan)", gender: "girl", birthDate: "2023-08-15", age: 3, classId: "class-1", parentName: "\u5468\u5C0F\u82B3", parentPhone: "13600448811", memberCode: "BTL-02", joinDate: "2025-09-01" },
  { id: "s-103", name: "\u9EC4\u4E50\u5929 (Joy)", gender: "boy", birthDate: "2024-02-18", age: 2, classId: "class-1", parentName: "\u9EC4\u660E\u8F89", parentPhone: "13700335621", memberCode: "BTL-03", joinDate: "2026-03-01" },
  // 小班 (3-4岁)
  { id: "s-201", name: "\u6797\u6069\u96C5 (Grace)", gender: "girl", birthDate: "2022-07-20", age: 4, classId: "class-2", parentName: "\u6797\u6D77\u71D5", parentPhone: "13900223342", memberCode: "BTL-04", joinDate: "2025-09-01" },
  { id: "s-202", name: "\u8D75\u4FBF\u96C5\u60AF (Benjamin)", gender: "boy", birthDate: "2022-11-10", age: 4, classId: "class-2", parentName: "\u8D75\u5FD7\u5F3A", parentPhone: "13100998844", memberCode: "BTL-05", joinDate: "2026-02-15" },
  // 中班 (4-5岁)
  { id: "s-301", name: "\u5434\u4E3B\u6069 (Charis)", gender: "girl", birthDate: "2021-05-18", age: 5, classId: "class-3", parentName: "\u5434\u632F\u534E", parentPhone: "15900772311", memberCode: "BTL-06", joinDate: "2025-09-01" },
  { id: "s-302", name: "\u5B59\u6240\u7F57\u95E8 (Solomon)", gender: "boy", birthDate: "2021-09-08", age: 5, classId: "class-3", parentName: "\u5B59\u56FD\u5E73", parentPhone: "18800236633", memberCode: "BTL-07", joinDate: "2025-03-01" },
  // 大班 (5-6岁)
  { id: "s-401", name: "\u5F20\u4EE5\u8BFA (Samuel)", gender: "boy", birthDate: "2020-03-22", age: 6, classId: "class-4", parentName: "\u5F20\u5EFA\u519B", parentPhone: "13800559922", memberCode: "BTL-08", joinDate: "2025-03-01" },
  { id: "s-402", name: "\u674E\u54C8\u62FF (Hannah)", gender: "girl", birthDate: "2020-06-25", age: 6, classId: "class-4", parentName: "\u674E\u7F8E\u534E", parentPhone: "13500664477", memberCode: "BTL-09", joinDate: "2024-09-01" },
  { id: "s-403", name: "\u5218\u63D0\u6469\u592A (Timothy)", gender: "boy", birthDate: "2020-10-05", age: 6, classId: "class-4", parentName: "\u5218\u6653\u7434", parentPhone: "18600887765", memberCode: "BTL-10", joinDate: "2025-09-01" },
  // 初中班 (12-14岁)
  { id: "s-501", name: "\u6768\u591A\u52A0 (Dorcas)", gender: "girl", birthDate: "2013-04-14", age: 13, classId: "class-5", parentName: "\u6768\u7ACB\u65B0", parentPhone: "13300121122", memberCode: "BTL-11", joinDate: "2024-09-01" },
  { id: "s-502", name: "\u51AF\u53F8\u63D0\u53CD (Stephen)", gender: "boy", birthDate: "2012-11-06", age: 14, classId: "class-5", parentName: "\u51AF\u4F1F\u6C11", parentPhone: "15800459090", memberCode: "BTL-12", joinDate: "2025-09-01" },
  { id: "s-503", name: "\u90D1\u8DEF\u5F97 (Ruth)", gender: "girl", birthDate: "2014-02-19", age: 12, classId: "class-5", parentName: "\u90D1\u6653\u6625", parentPhone: "13400347788", memberCode: "BTL-13", joinDate: "2024-09-01" },
  // 高中班 (15-17岁)
  { id: "s-601", name: "\u6731\u4EE5\u8D5B\u4E9A (Isaiah)", gender: "boy", birthDate: "2010-07-17", age: 16, classId: "class-6", parentName: "\u6731\u660E\u793C", parentPhone: "13900562233", memberCode: "BTL-14", joinDate: "2023-09-01" },
  { id: "s-602", name: "\u94B1\u4EE5\u65AF\u5E16 (Esther)", gender: "girl", birthDate: "2009-09-28", age: 17, classId: "class-6", parentName: "\u94B1\u6842\u82F1", parentPhone: "13800676611", memberCode: "BTL-15", joinDate: "2023-09-01" },
  { id: "s-603", name: "\u8BB8\u7EA6\u745F (Joseph)", gender: "boy", birthDate: "2011-03-03", age: 15, classId: "class-6", parentName: "\u8BB8\u5FB7\u76DB", parentPhone: "13600785522", memberCode: "BTL-16", joinDate: "2023-03-01" },
  // 以斯拉团契 (18-35岁青年)
  { id: "s-701", name: "\u4F55\u4FDD\u7F57 (Paul)", gender: "boy", birthDate: "2001-08-21", age: 25, classId: "class-7", parentName: "\u672C\u4EBA", parentPhone: "18900891100", memberCode: "BTL-17", joinDate: "2024-03-01" },
  { id: "s-702", name: "\u6881\u8FE6\u52D2 (Caleb Jr)", gender: "boy", birthDate: "1998-05-12", age: 28, classId: "class-7", parentName: "\u672C\u4EBA", parentPhone: "13700902233", memberCode: "BTL-18", joinDate: "2022-09-01" },
  // 雅歌团契 (成年与家庭)
  { id: "s-801", name: "\u5434\u6492\u62C9 (Sarah)", gender: "girl", birthDate: "1975-11-06", age: 51, classId: "class-8", parentName: "\u672C\u4EBA", parentPhone: "13500913344", memberCode: "BTL-19", joinDate: "2022-09-01" },
  { id: "s-802", name: "\u6C88\u4E9A\u4F2F\u62C9\u7F55 (Abraham)", gender: "boy", birthDate: "1970-03-29", age: 56, classId: "class-8", parentName: "\u672C\u4EBA", parentPhone: "13800924455", memberCode: "BTL-20", joinDate: "2021-09-01" }
];
var initialSystemConfig = {
  churchName: "\u4F2F\u7279\u5229\u6559\u4F1A",
  schoolTitle: "\u4E3B\u65E5\u5B66\u4E0E\u56E2\u5951",
  allowedDayOfWeek: 0,
  // 0 is Sunday
  checkinStartTime: "08:30",
  checkinEndTime: "12:30",
  testMode: false,
  currentYear: 2026,
  currentSemester: "2026\u5E74\u79CB\u5B63\u5B66\u671F",
  weeklyMemoryVerse: "\u96C5\u5404\u5C31\u7ED9\u90A3\u5730\u65B9\u8D77\u540D\u53EB\u4F2F\u7279\u5229\u3002\u4ED6\u8BF4\uFF1A\u8FD9\u5730\u65B9\u4F55\u7B49\u53EF\u754F\uFF01\u8FD9\u4E0D\u662F\u522B\u7684\uFF0C\u4E43\u662F\u795E\u7684\u6BBF\uFF0C\u4E5F\u662F\u5929\u7684\u95E8\u3002",
  memoryVerseReference: "\u521B\u4E16\u8BB0 28:17,19",
  qrSecretToken: "BETHEL_SUNDAY_2026_TOKEN",
  // Customizable Default Options
  enableMemoryVerseOption: true,
  defaultMemoryVerseChecked: true,
  enableOfferingOption: false,
  defaultOfferingChecked: false,
  enableLateRule: true,
  lateThresholdTime: "09:30",
  enableExcusedNote: true,
  enableCheckinPopup: true,
  adminPassword: "bethel2026"
};
var initialAdminAccounts = [
  { id: "acc-admin", username: "admin", displayName: "\u4F2F\u7279\u5229\u6559\u4F1A \u2022 \u603B\u7BA1\u7406\u5458", role: "superadmin", password: "bethel2026", createdAt: "2026-01-01" },
  { id: "acc-teacher", username: "teacher", displayName: "\u4E3B\u65E5\u5B66\u4E3B\u73ED\u6559\u52A1\u8001\u5E08", role: "teacher", password: "bethel123", createdAt: "2026-01-01" },
  { id: "acc-fellowship", username: "fellowship", displayName: "\u56E2\u5951\u5E26\u9886\u540C\u5DE5", role: "fellowship_leader", password: "fellowship123", createdAt: "2026-01-01" }
];

// server/dataStore.ts
import fs from "fs";
import path from "path";
import os from "os";
var classes = [...initialClasses];
var students = [...initialStudents];
var records = [];
var systemConfig = { ...initialSystemConfig };
var adminAccounts = [...initialAdminAccounts];
var activeSessions = /* @__PURE__ */ new Map();
var syncVersion = 1;
var lastModifiedTimestamp = (/* @__PURE__ */ new Date()).toISOString();
function getActiveSundayDate() {
  const now = /* @__PURE__ */ new Date();
  const day = now.getDay();
  if (day === 0) {
    return now.toISOString().split("T")[0];
  }
  return "2026-09-13";
}
var activeSunday = getActiveSundayDate();
function getStoragePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "church-data.json");
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, "church-data.json");
  } catch {
    return path.join(os.tmpdir(), "church-data.json");
  }
}
async function saveToCloudKV(payload) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    const rawUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    await fetch(`${rawUrl}/set/bethel_church_data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(JSON.stringify(payload)),
      signal: AbortSignal.timeout(2e3)
    });
  } catch (err) {
    console.warn("[Cloud KV Warning] Could not persist to Upstash/Vercel KV:", err);
  }
}
async function loadFromCloudKV() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const rawUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const res = await fetch(`${rawUrl}/get/bethel_church_data`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2e3)
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.result) {
        return typeof json.result === "string" ? JSON.parse(json.result) : json.result;
      }
    }
  } catch (err) {
    console.warn("[Cloud KV Warning] Could not load from Upstash/Vercel KV:", err);
  }
  return null;
}
function saveDataToFile() {
  syncVersion++;
  lastModifiedTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const payload = {
    systemConfig,
    classes,
    students,
    records,
    adminAccounts,
    activeSunday,
    syncVersion,
    updatedAt: lastModifiedTimestamp
  };
  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Storage Notice] Could not write to disk cache (normal in read-only serverless environment):", err);
  }
  saveToCloudKV(payload).catch(() => {
  });
}
function generateHistoricalRecords() {
  records = [];
  const pastSundays = [
    "2026-06-07",
    "2026-06-14",
    "2026-06-21",
    "2026-06-28",
    "2026-07-05",
    "2026-07-12",
    "2026-07-19",
    "2026-07-26",
    "2026-08-02",
    "2026-08-09",
    "2026-08-16",
    "2026-08-23",
    "2026-08-30",
    "2026-09-06"
  ];
  pastSundays.forEach((sundayDate, sIdx) => {
    students.forEach((student, stuIdx) => {
      const seed = (sIdx * 19 + stuIdx * 13) % 100;
      let status = "present";
      let memoryVerse = true;
      if (seed < 4) {
        status = "absent";
        memoryVerse = false;
      } else if (seed < 10) {
        status = "excused";
        memoryVerse = false;
      } else if (seed < 18) {
        status = "late";
        memoryVerse = seed % 2 === 0;
      } else {
        status = "present";
        memoryVerse = seed > 20;
      }
      if (status !== "absent") {
        const hour = status === "late" ? 9 : 8;
        const minute = status === "late" ? 35 + seed % 20 : 45 + seed % 14;
        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        records.push({
          id: `rec-${sundayDate}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          classId: student.classId,
          date: sundayDate,
          timestamp: `${sundayDate}T${timeStr}:00.000Z`,
          timeStr,
          status,
          method: "attendance",
          memoryVerseCompleted: memoryVerse,
          offeringCompleted: false,
          notes: status === "excused" ? "\u5916\u51FA\u4E8B\u7531\u8BF7\u5047" : void 0
        });
      }
    });
  });
  const todaySunday = "2026-09-13";
  const initialTodayCheckedIn = ["s-101", "s-102", "s-201", "s-202", "s-301", "s-401", "s-501"];
  initialTodayCheckedIn.forEach((stuId, idx) => {
    const student = students.find((s) => s.id === stuId);
    if (student) {
      records.push({
        id: `rec-${todaySunday}-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        date: todaySunday,
        timestamp: `${todaySunday}T08:${50 + idx * 2}:15.000Z`,
        timeStr: `08:${50 + idx * 2}`,
        status: "present",
        method: "attendance",
        memoryVerseCompleted: true,
        offeringCompleted: false,
        notes: "\u4E3B\u65E5\u5B66\u51C6\u65F6\u5230\u5802"
      });
    }
  });
}
var isInitialized = false;
function initOrLoadData() {
  if (isInitialized) return;
  isInitialized = true;
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.classes)) classes = data.classes;
      if (Array.isArray(data.students)) students = data.students;
      if (Array.isArray(data.records)) records = data.records;
      if (Array.isArray(data.adminAccounts) && data.adminAccounts.length > 0) adminAccounts = data.adminAccounts;
      if (data.systemConfig) {
        systemConfig = { ...initialSystemConfig, ...data.systemConfig };
      }
      if (data.activeSunday) activeSunday = data.activeSunday;
      return;
    }
  } catch (err) {
    console.warn("[Storage Notice] Could not read disk cache:", err);
  }
  generateHistoricalRecords();
  saveDataToFile();
  initOrLoadDataAsync().catch(() => {
  });
}
async function initOrLoadDataAsync() {
  const cloudData = await loadFromCloudKV();
  if (cloudData) {
    if (Array.isArray(cloudData.classes)) classes = cloudData.classes;
    if (Array.isArray(cloudData.students)) students = cloudData.students;
    if (Array.isArray(cloudData.records)) records = cloudData.records;
    if (Array.isArray(cloudData.adminAccounts) && cloudData.adminAccounts.length > 0) adminAccounts = cloudData.adminAccounts;
    if (cloudData.systemConfig) systemConfig = { ...initialSystemConfig, ...cloudData.systemConfig };
    if (cloudData.activeSunday) activeSunday = cloudData.activeSunday;
    if (typeof cloudData.syncVersion === "number") syncVersion = cloudData.syncVersion;
    if (cloudData.updatedAt) lastModifiedTimestamp = cloudData.updatedAt;
  }
}
function verifySuperAdminPermission(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : req.headers["x-admin-token"];
  const userRoleHeader = req.headers["x-user-role"];
  const usernameHeader = req.headers["x-username"];
  if (userRoleHeader === "teacher" || userRoleHeader === "fellowship_leader") {
    return {
      allowed: false,
      role: userRoleHeader,
      message: "\u6743\u9650\u4E0D\u8DB3\uFF1A\u9664\u4E86\u603B\u7BA1\u7406\u5458\u4E4B\u5916\uFF0C\u5176\u4ED6\u8D26\u53F7\u53EA\u6709\u7BA1\u7406\u7B7E\u5230\u6743\u9650\uFF0C\u6CA1\u6709\u6DFB\u52A0\u6216\u5220\u9664\u73ED\u7EA7\u4E0E\u5B66\u751F\u7684\u6743\u9650\uFF01"
    };
  }
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    if (session.role === "superadmin") {
      return { allowed: true, role: "superadmin" };
    }
    return {
      allowed: false,
      role: session.role,
      message: "\u6743\u9650\u4E0D\u8DB3\uFF1A\u9664\u4E86\u603B\u7BA1\u7406\u5458\u4E4B\u5916\uFF0C\u5176\u4ED6\u8D26\u53F7\u53EA\u6709\u7BA1\u7406\u7B7E\u5230\u6743\u9650\uFF0C\u6CA1\u6709\u6DFB\u52A0\u6216\u5220\u9664\u73ED\u7EA7\u4E0E\u5B66\u751F\u7684\u6743\u9650\uFF01"
    };
  }
  if (userRoleHeader === "superadmin" || usernameHeader && usernameHeader.toLowerCase() === "admin") {
    return { allowed: true, role: "superadmin" };
  }
  if (usernameHeader) {
    const acc = adminAccounts.find((a) => a.username.toLowerCase() === usernameHeader.toLowerCase());
    if (acc && acc.role === "superadmin") {
      return { allowed: true, role: "superadmin" };
    }
  }
  return {
    allowed: false,
    role: "guest",
    message: "\u6743\u9650\u4E0D\u8DB3\uFF1A\u9664\u4E86\u603B\u7BA1\u7406\u5458\u4E4B\u5916\uFF0C\u5176\u4ED6\u8D26\u53F7\u53EA\u6709\u7BA1\u7406\u7B7E\u5230\u6743\u9650\uFF0C\u6CA1\u6709\u6DFB\u52A0\u6216\u5220\u9664\u73ED\u7EA7\u4E0E\u5B66\u751F\u7684\u6743\u9650\uFF01"
  };
}
function setClasses(newClasses) {
  classes = newClasses;
}
function setStudents(newStudents) {
  students = newStudents;
}
function setRecords(newRecords) {
  records = newRecords;
}
function setSystemConfig(newConfig) {
  systemConfig = newConfig;
}
function mergeClientData(payload) {
  let changed = false;
  if (Array.isArray(payload.classes) && payload.classes.length > 0) {
    const classMap = new Map(classes.map((c) => [c.id, c]));
    for (const c of payload.classes) {
      if (!classMap.has(c.id)) {
        classMap.set(c.id, c);
        changed = true;
      } else {
        const existing = classMap.get(c.id);
        if (JSON.stringify(existing) !== JSON.stringify(c)) {
          classMap.set(c.id, { ...existing, ...c });
          changed = true;
        }
      }
    }
    classes = Array.from(classMap.values());
  }
  if (Array.isArray(payload.students) && payload.students.length > 0) {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    for (const s of payload.students) {
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, s);
        changed = true;
      } else {
        const existing = studentMap.get(s.id);
        if (JSON.stringify(existing) !== JSON.stringify(s)) {
          studentMap.set(s.id, { ...existing, ...s });
          changed = true;
        }
      }
    }
    students = Array.from(studentMap.values());
  }
  if (Array.isArray(payload.records) && payload.records.length > 0) {
    const recordMap = new Map(records.map((r) => [r.id, r]));
    for (const r of payload.records) {
      if (!recordMap.has(r.id)) {
        recordMap.set(r.id, r);
        changed = true;
      } else {
        const existing = recordMap.get(r.id);
        if (JSON.stringify(existing) !== JSON.stringify(r)) {
          recordMap.set(r.id, { ...existing, ...r });
          changed = true;
        }
      }
    }
    records = Array.from(recordMap.values());
  }
  if (payload.config && typeof payload.config === "object") {
    systemConfig = { ...systemConfig, ...payload.config };
    changed = true;
  }
  if (payload.activeSunday) {
    activeSunday = payload.activeSunday;
  }
  if (changed) {
    saveDataToFile();
  }
  return {
    classes,
    students,
    records,
    config: systemConfig,
    activeSunday,
    syncVersion,
    lastModifiedTimestamp
  };
}

// server/app.ts
var app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token, X-User-Role, X-Username");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use((req, res, next) => {
  let targetRoute = "";
  const qIndex = req.url.indexOf("?");
  if (qIndex !== -1) {
    const sp = new URLSearchParams(req.url.slice(qIndex + 1));
    targetRoute = sp.get("__route") || "";
  }
  if (!targetRoute && req.query?.__route) {
    targetRoute = String(req.query.__route);
  }
  if (!targetRoute) {
    const routeMatches = req.headers["x-now-route-matches"];
    if (routeMatches) {
      const match = routeMatches.match(/1=([^&]+)/);
      if (match && match[1]) targetRoute = decodeURIComponent(match[1]);
    }
  }
  if (!targetRoute) {
    const matched = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"] || req.headers["x-forwarded-uri"] || req.headers["x-original-url"];
    if (matched) {
      const clean = matched.split("?")[0];
      if (clean.startsWith("/api/")) {
        targetRoute = clean.replace(/^\/api\//, "");
      } else if (clean.startsWith("/api")) {
        targetRoute = clean.replace(/^\/api/, "");
      }
    }
  }
  if (targetRoute) {
    if (targetRoute.startsWith("/")) targetRoute = targetRoute.slice(1);
    let cleanQuery = "";
    if (qIndex !== -1) {
      const sp = new URLSearchParams(req.url.slice(qIndex + 1));
      sp.delete("__route");
      const qs = sp.toString();
      if (qs) cleanQuery = "?" + qs;
    }
    req.url = `/api/${targetRoute}${cleanQuery}`;
  } else {
    if (req.url === "/api/index" || req.url === "/api/index/" || req.url === "/index" || req.url === "/index/" || req.url === "/api" || req.url === "/api/") {
      const query = qIndex !== -1 ? req.url.slice(qIndex) : "";
      req.url = "/api/state" + query;
    } else if (req.url.startsWith("/api/index/")) {
      req.url = req.url.replace("/api/index/", "/api/");
    } else if (req.url.startsWith("/index/")) {
      req.url = req.url.replace("/index/", "/api/");
    }
  }
  next();
});
initOrLoadData();
var apiRouter = express.Router();
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    runtime: process.env.VERCEL ? "vercel-serverless" : "node-express",
    church: systemConfig.churchName,
    config: systemConfig,
    classesCount: classes.length,
    studentsCount: students.length,
    recordsCount: records.length,
    syncVersion,
    lastModified: lastModifiedTimestamp,
    kvConnected: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.get("/state", async (req, res) => {
  await initOrLoadDataAsync();
  const currentSunday = getActiveSundayDate();
  res.json({
    config: systemConfig,
    classes,
    students,
    records,
    accounts: adminAccounts.map((a) => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      role: a.role,
      createdAt: a.createdAt
    })),
    activeSunday: currentSunday,
    syncVersion,
    lastModified: lastModifiedTimestamp,
    kvConnected: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    serverTime: (/* @__PURE__ */ new Date()).toISOString(),
    runtime: process.env.VERCEL ? "vercel-serverless" : "node-express"
  });
});
apiRouter.get("/cloud-sync", async (req, res) => {
  await initOrLoadDataAsync();
  const clientVersion = parseInt(req.query.v, 10) || 0;
  res.json({
    status: "ok",
    syncVersion,
    lastModified: lastModifiedTimestamp,
    kvConnected: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    hasUpdates: clientVersion !== syncVersion,
    classes: clientVersion !== syncVersion ? classes : void 0,
    students: clientVersion !== syncVersion ? students : void 0,
    records: clientVersion !== syncVersion ? records : void 0,
    config: clientVersion !== syncVersion ? systemConfig : void 0,
    activeSunday,
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.post("/cloud-sync", (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "\u65E0\u6548\u7684\u540C\u6B65\u6570\u636E\u683C\u5F0F" });
    }
    const merged = mergeClientData(payload);
    res.json({
      success: true,
      message: "\u591A\u8BBE\u5907\u7EC8\u7AEF\u4E91\u7AEF\u6570\u636E\u5DF2\u6210\u529F\u53CC\u5411\u540C\u6B65\uFF01",
      ...merged,
      kvConnected: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
      serverTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "\u8BF7\u8F93\u5165\u7528\u6237\u540D\u548C\u767B\u5F55\u5BC6\u7801" });
    }
    const trimmedUser = String(username).trim();
    const cleanPassword = String(password).trim();
    const targetAccount = adminAccounts.find((a) => a.username.toLowerCase() === trimmedUser.toLowerCase());
    if (targetAccount) {
      const isMatch = targetAccount.password === cleanPassword || targetAccount.role === "superadmin" && cleanPassword === (systemConfig.adminPassword || "bethel2026");
      if (isMatch) {
        const userSession = {
          username: targetAccount.username,
          displayName: targetAccount.displayName,
          role: targetAccount.role,
          token: `btl_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        };
        activeSessions.set(userSession.token, userSession);
        return res.json({ success: true, user: userSession, message: `\u6B22\u8FCE\u767B\u5F55\uFF0C${userSession.displayName}\uFF01` });
      }
      return res.status(401).json({ error: "\u5BC6\u7801\u9519\u8BEF\uFF0C\u8BF7\u6838\u5BF9\u540E\u91CD\u8BD5" });
    }
    if (cleanPassword === (systemConfig.adminPassword || "bethel2026")) {
      const userSession = {
        username: trimmedUser,
        displayName: `\u4F2F\u7279\u5229\u6559\u4F1A\u7BA1\u7406\u5458 (${trimmedUser})`,
        role: "superadmin",
        token: `btl_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
      activeSessions.set(userSession.token, userSession);
      return res.json({ success: true, user: userSession, message: "\u767B\u5F55\u6210\u529F\uFF01" });
    }
    return res.status(401).json({ error: "\u8D26\u53F7\u4E0D\u5B58\u5728\u6216\u5BC6\u7801\u9519\u8BEF\uFF0C\u8BF7\u6838\u5BF9\u540E\u91CD\u8BD5" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/checkin", (req, res) => {
  try {
    const { studentId, memoryVerseCompleted, offeringCompleted, notes = "" } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "\u8BF7\u9009\u62E9\u6216\u8F93\u5165\u6253\u5361\u5B66\u5458\u59D3\u540D" });
    }
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "\u672A\u5728\u4F2F\u7279\u5229\u6559\u4F1A\u540D\u518C\u4E2D\u627E\u5230\u8BE5\u5B66\u5458\uFF0C\u8BF7\u8054\u7CFB\u8001\u5E08\u767B\u8BB0" });
    }
    const now = /* @__PURE__ */ new Date();
    const targetDate = getActiveSundayDate();
    const existing = records.find((r) => r.studentId === studentId && r.date === targetDate);
    if (existing) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        record: existing,
        student,
        message: `${student.name} \u4ECA\u5929\u5DF2\u7ECF\u5B8C\u6210\u6253\u5361\u5566\uFF01\u7B7E\u5230\u65F6\u95F4\uFF1A${existing.timeStr}\u3002`
      });
    }
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const curTimeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    let isLate = false;
    if (systemConfig.enableLateRule) {
      const [lateH, lateM] = (systemConfig.lateThresholdTime || "09:30").split(":").map(Number);
      if (hours > lateH || hours === lateH && minutes > lateM) {
        isLate = true;
      }
    }
    const status = isLate ? "late" : "present";
    const verseCheck = memoryVerseCompleted !== void 0 ? Boolean(memoryVerseCompleted) : systemConfig.defaultMemoryVerseChecked;
    const offCheck = offeringCompleted !== void 0 ? Boolean(offeringCompleted) : systemConfig.defaultOfferingChecked;
    const newRecord = {
      id: `rec-${targetDate}-${student.id}-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      date: targetDate,
      timestamp: now.toISOString(),
      timeStr: curTimeStr,
      status,
      method: "wechat_scan",
      memoryVerseCompleted: systemConfig.enableMemoryVerseOption ? verseCheck : false,
      offeringCompleted: systemConfig.enableOfferingOption ? offCheck : false,
      notes: notes ? String(notes).trim() : void 0
    };
    records.push(newRecord);
    saveDataToFile();
    res.json({
      success: true,
      record: newRecord,
      student,
      message: `\u{1F389} \u7B7E\u5230\u6210\u529F\uFF01\u613F\u4E3B\u8D50\u798F ${student.name}\uFF0C\u4E3B\u65E5\u8499\u6069\uFF01`
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "\u6253\u5361\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
  }
});
apiRouter.post("/manual-checkin", (req, res) => {
  try {
    const { studentId, date, status, memoryVerseCompleted, offeringCompleted, notes } = req.body;
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "\u5B66\u5458\u4E0D\u5B58\u5728" });
    }
    const targetDate = date || getActiveSundayDate();
    const existingIdx = records.findIndex((r) => r.studentId === studentId && r.date === targetDate);
    if (status === "absent") {
      if (existingIdx !== -1) {
        records.splice(existingIdx, 1);
        saveDataToFile();
      }
      return res.json({ success: true, message: "\u5DF2\u6807\u8BB0\u4E3A\u7F3A\u5E2D/\u672A\u7B7E\u5230" });
    }
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (existingIdx !== -1) {
      records[existingIdx] = {
        ...records[existingIdx],
        status: status || records[existingIdx].status,
        memoryVerseCompleted: memoryVerseCompleted !== void 0 ? memoryVerseCompleted : records[existingIdx].memoryVerseCompleted,
        offeringCompleted: offeringCompleted !== void 0 ? offeringCompleted : records[existingIdx].offeringCompleted,
        notes: notes !== void 0 ? notes : records[existingIdx].notes
      };
      saveDataToFile();
      return res.json({ success: true, record: records[existingIdx], message: "\u8003\u52E4\u8BB0\u5F55\u5DF2\u66F4\u65B0" });
    }
    const record = {
      id: `rec-${targetDate}-${student.id}-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      date: targetDate,
      timestamp: now.toISOString(),
      timeStr,
      status: status || "present",
      method: "manual_teacher",
      memoryVerseCompleted: memoryVerseCompleted !== void 0 ? Boolean(memoryVerseCompleted) : systemConfig.defaultMemoryVerseChecked,
      offeringCompleted: offeringCompleted !== void 0 ? Boolean(offeringCompleted) : systemConfig.defaultOfferingChecked,
      notes
    };
    records.push(record);
    saveDataToFile();
    res.json({ success: true, record, message: "\u8001\u5E08/\u540C\u5DE5\u767B\u8BB0\u6210\u529F" });
  } catch (err) {
    res.status(500).json({ error: err.message || "\u64CD\u4F5C\u5931\u8D25" });
  }
});
apiRouter.post("/batch-checkin", (req, res) => {
  try {
    const { classId, date, status = "present" } = req.body;
    const targetDate = date || getActiveSundayDate();
    const now = /* @__PURE__ */ new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const targetStudents = classId && classId !== "all" ? students.filter((s) => s.classId === classId) : students;
    let updatedCount = 0;
    targetStudents.forEach((stu) => {
      const existingIdx = records.findIndex((r) => r.studentId === stu.id && r.date === targetDate);
      if (existingIdx !== -1) {
        records[existingIdx].status = status;
      } else {
        records.push({
          id: `rec-${targetDate}-${stu.id}-${Date.now()}`,
          studentId: stu.id,
          studentName: stu.name,
          classId: stu.classId,
          date: targetDate,
          timestamp: now.toISOString(),
          timeStr,
          status,
          method: "manual_teacher",
          memoryVerseCompleted: systemConfig.defaultMemoryVerseChecked,
          offeringCompleted: systemConfig.defaultOfferingChecked
        });
      }
      updatedCount++;
    });
    saveDataToFile();
    res.json({ success: true, message: `\u5DF2\u6210\u529F\u4E3A ${updatedCount} \u4F4D\u5B66\u5458\u767B\u8BB0\u5230\u6821\uFF01` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/classes", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    const { id, name, ageRange, teacher, subjectTeacher, classroom, color, groupType, description, isHiddenFromHome } = req.body;
    if (!name) {
      return res.status(400).json({ error: "\u73ED\u7EA7/\u56E2\u5951\u540D\u79F0\u4E3A\u5FC5\u586B\u9879" });
    }
    const idx = classes.findIndex((c) => id && c.id === id || name && c.name === name);
    if (idx !== -1) {
      classes[idx] = {
        ...classes[idx],
        name,
        ageRange: ageRange || classes[idx].ageRange,
        teacher: teacher || classes[idx].teacher,
        subjectTeacher: subjectTeacher !== void 0 ? subjectTeacher : classes[idx].subjectTeacher,
        classroom: classroom || classes[idx].classroom,
        color: color || classes[idx].color,
        groupType: groupType || classes[idx].groupType || "sunday_school",
        description: description !== void 0 ? description : classes[idx].description,
        isHiddenFromHome: isHiddenFromHome !== void 0 ? !!isHiddenFromHome : classes[idx].isHiddenFromHome || false
      };
      saveDataToFile();
      return res.json({ success: true, class: classes[idx], message: "\u73ED\u7EA7\u4FE1\u606F\u4FEE\u6539\u6210\u529F" });
    }
    const newClass = {
      id: `class-${Date.now().toString().slice(-6)}`,
      name,
      ageRange: ageRange || "\u81EA\u9009\u5E74\u9F84\u6BB5",
      teacher: teacher || "\u73ED\u7EA7\u8D1F\u8D23\u4EBA",
      subjectTeacher: subjectTeacher || "\u4EFB\u8BFE\u8001\u5E08",
      classroom: classroom || "\u4E3B\u5802\u6559\u5BA4",
      color: color || "bg-amber-500",
      groupType: groupType || "sunday_school",
      description: description || "",
      isHiddenFromHome: !!isHiddenFromHome
    };
    classes.push(newClass);
    saveDataToFile();
    res.json({ success: true, class: newClass, message: "\u6210\u529F\u65B0\u589E\u73ED\u7EA7/\u56E2\u5951" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/classes/:id", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    const { id } = req.params;
    let idx = classes.findIndex((c) => c.id === id);
    if (idx === -1) {
      idx = classes.findIndex((c) => c.name === id);
    }
    if (idx !== -1) {
      const targetClass = classes[idx];
      const clsId = targetClass.id;
      const clsName = targetClass.name;
      const enrolledStudents = students.filter((s) => s.classId === clsId);
      const studentIdsToDelete = new Set(enrolledStudents.map((s) => s.id));
      setStudents(students.filter((s) => s.classId !== clsId));
      setRecords(records.filter((r) => !studentIdsToDelete.has(r.studentId)));
      setClasses(classes.filter((c) => c.id !== clsId && c.name !== clsName));
      saveDataToFile();
      return res.json({
        success: true,
        message: `\u73ED\u7EA7\u3010${clsName}\u3011\u5DF2\u6210\u529F\u5220\u9664${enrolledStudents.length > 0 ? `\uFF08\u540C\u65F6\u6E05\u9664\u4E86 ${enrolledStudents.length} \u540D\u5728\u518C\u5B66\u5458\u6863\u6848\uFF09` : ""}`
      });
    }
    res.status(404).json({ error: "\u73ED\u7EA7\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/students", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    let { id, name, gender, birthDate, age, classId, parentName, parentPhone, memberCode } = req.body;
    if (!name || !classId) {
      return res.status(400).json({ error: "\u59D3\u540D\u4E0E\u6240\u5C5E\u73ED\u7EA7/\u56E2\u5951\u4E3A\u5FC5\u586B\u9879" });
    }
    if (!birthDate && age) {
      const year = (/* @__PURE__ */ new Date()).getFullYear() - Number(age);
      birthDate = `${year}-06-01`;
    } else if (!birthDate) {
      birthDate = "2019-06-01";
    }
    const computedAge = calculateAge(birthDate, Number(age) || 7);
    const idx = students.findIndex(
      (s) => id && s.id === id || memberCode && s.memberCode === memberCode || name && s.name === name && (classId ? s.classId === classId : true)
    );
    if (idx !== -1) {
      const targetId = students[idx].id;
      students[idx] = {
        ...students[idx],
        name,
        gender: gender || students[idx].gender || "boy",
        birthDate,
        age: computedAge,
        classId,
        parentName: parentName || "",
        parentPhone: parentPhone || "",
        memberCode: memberCode || students[idx].memberCode
      };
      setRecords(records.map((r) => r.studentId === targetId ? { ...r, studentName: name, classId } : r));
      saveDataToFile();
      return res.json({ success: true, student: students[idx], message: "\u5B66\u5458\u4FE1\u606F\u5DF2\u66F4\u65B0" });
    }
    const nextCodeNum = students.length + 1;
    const newStudent = {
      id: `s-${Date.now().toString().slice(-6)}`,
      name,
      gender: gender || "boy",
      birthDate,
      age: computedAge,
      classId,
      parentName: parentName || "",
      parentPhone: parentPhone || "",
      memberCode: memberCode || `BTL-${String(nextCodeNum).padStart(2, "0")}`,
      joinDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    };
    students.push(newStudent);
    saveDataToFile();
    res.json({ success: true, student: newStudent, message: "\u5B66\u5458\u6863\u6848\u5EFA\u7ACB\u6210\u529F" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/students/batch", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    const { classId, namesText, defaultGender = "boy", defaultBirthDate, defaultAge } = req.body;
    if (!classId || !namesText) {
      return res.status(400).json({ error: "\u8BF7\u9009\u62E9\u73ED\u7EA7\u5E76\u8F93\u5165\u5B66\u5458\u59D3\u540D\u5217\u8868" });
    }
    let birthDate = defaultBirthDate;
    if (!birthDate) {
      const ageNum = Number(defaultAge) || 7;
      birthDate = `${(/* @__PURE__ */ new Date()).getFullYear() - ageNum}-06-01`;
    }
    const computedAge = calculateAge(birthDate, Number(defaultAge) || 7);
    const rawNames = String(namesText).split(/[\n,，\s]+/).map((n) => n.trim()).filter((n) => n.length > 0);
    if (rawNames.length === 0) {
      return res.status(400).json({ error: "\u672A\u8BC6\u522B\u5230\u6709\u6548\u59D3\u540D" });
    }
    const added = [];
    rawNames.forEach((name, i) => {
      const nextCodeNum = students.length + 1;
      const stu = {
        id: `s-${Date.now().toString().slice(-5)}${i}`,
        name,
        gender: defaultGender,
        birthDate,
        age: computedAge,
        classId,
        parentName: "\u5BB6\u957F/\u8054\u7CFB\u4EBA",
        parentPhone: "138****0000",
        memberCode: `BTL-${String(nextCodeNum).padStart(2, "0")}`,
        joinDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      students.push(stu);
      added.push(stu);
    });
    saveDataToFile();
    res.json({ success: true, count: added.length, message: `\u6210\u529F\u6279\u91CF\u5F55\u5165 ${added.length} \u540D\u5B66\u5458\uFF0C\u5DF2\u81EA\u52A8\u63A8\u7B97\u5E74\u9F84\u4E3A ${computedAge} \u5C81\uFF01` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/students/:id", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    const { id } = req.params;
    let idx = students.findIndex((s) => s.id === id);
    if (idx === -1) {
      idx = students.findIndex((s) => s.memberCode === id || s.name === id);
    }
    if (idx !== -1) {
      const removed = students[idx];
      setStudents(students.filter((s) => s.id !== removed.id && s.memberCode !== removed.memberCode));
      setRecords(records.filter((r) => r.studentId !== removed.id && r.studentName !== removed.name));
      saveDataToFile();
      return res.json({ success: true, message: `\u5B66\u5458\u3010${removed.name}\u3011\u5DF2\u6210\u529F\u4ECE\u540D\u518C\u4E2D\u5F7B\u5E95\u5220\u9664\uFF01` });
    }
    res.status(404).json({ error: "\u5B66\u5458\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/config", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    const updates = req.body;
    setSystemConfig({ ...systemConfig, ...updates });
    saveDataToFile();
    res.json({ success: true, config: systemConfig, message: "\u7CFB\u7EDF\u8BBE\u7F6E\u4E0E\u9ED8\u8BA4\u9009\u9879\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/reset-data", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    setSystemConfig({
      ...initialSystemConfig,
      churchName: "\u4F2F\u7279\u5229\u6559\u4F1A",
      schoolTitle: "\u4E3B\u65E5\u5B66\u4E0E\u56E2\u5951"
    });
    generateHistoricalRecords();
    saveDataToFile();
    res.json({ success: true, message: "\u5DF2\u91CD\u7F6E\u4E3A\u4F2F\u7279\u5229\u6559\u4F1A\u4E3B\u65E5\u5B66\u4E0E\u56E2\u5951\u5B98\u65B9\u793A\u8303\u6570\u636E" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/accounts", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || "\u4EC5\u603B\u7BA1\u7406\u5458\u6709\u6743\u9650\u7BA1\u7406\u540E\u53F0\u8D26\u53F7" });
    }
    res.json({
      success: true,
      accounts: adminAccounts.map((a) => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        createdAt: a.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/accounts", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || "\u4EC5\u603B\u7BA1\u7406\u5458\u6709\u6743\u9650\u6DFB\u52A0\u6216\u4FEE\u6539\u8D26\u53F7" });
    }
    const { username, displayName, role, password } = req.body;
    if (!username || !displayName) {
      return res.status(400).json({ error: "\u7528\u6237\u540D\u548C\u663E\u793A\u79F0\u8C13\u4E0D\u80FD\u4E3A\u7A7A" });
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanDisplayName = String(displayName).trim();
    const cleanRole = role === "superadmin" || role === "teacher" || role === "fellowship_leader" ? role : "teacher";
    const existingIndex = adminAccounts.findIndex((a) => a.username.toLowerCase() === cleanUsername);
    if (existingIndex >= 0) {
      const existing = adminAccounts[existingIndex];
      const finalRole = cleanUsername === "admin" ? "superadmin" : cleanRole;
      adminAccounts[existingIndex] = {
        ...existing,
        displayName: cleanDisplayName,
        role: finalRole,
        password: password ? String(password).trim() : existing.password
      };
      if (cleanUsername === "admin" && password) {
        systemConfig.adminPassword = String(password).trim();
      }
      saveDataToFile();
      return res.json({
        success: true,
        message: `\u8D26\u53F7\u3010${cleanUsername}\u3011\u4FE1\u606F\u5DF2\u6210\u529F\u66F4\u65B0\uFF01`,
        accounts: adminAccounts.map((a) => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: a.role,
          createdAt: a.createdAt
        }))
      });
    } else {
      if (!password || String(password).trim().length < 4) {
        return res.status(400).json({ error: "\u65B0\u5EFA\u8D26\u53F7\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A\u4E14\u4E0D\u5C11\u4E8E4\u4F4D\u5B57\u7B26" });
      }
      const newAccount = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        displayName: cleanDisplayName,
        role: cleanRole,
        password: String(password).trim(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      adminAccounts.push(newAccount);
      saveDataToFile();
      return res.json({
        success: true,
        message: `\u65B0\u8D26\u53F7\u3010${cleanUsername}\u3011\u5DF2\u6210\u529F\u521B\u5EFA\uFF01`,
        accounts: adminAccounts.map((a) => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: a.role,
          createdAt: a.createdAt
        }))
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/accounts/password", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || "\u4EC5\u603B\u7BA1\u7406\u5458\u6709\u6743\u9650\u4FEE\u6539\u8D26\u53F7\u5BC6\u7801" });
    }
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ error: "\u8BF7\u63D0\u4F9B\u7528\u6237\u540D\u548C\u65B0\u5BC6\u7801" });
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(newPassword).trim();
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: "\u65B0\u5BC6\u7801\u957F\u5EA6\u81F3\u5C11\u9700\u89814\u4E2A\u5B57\u7B26" });
    }
    const target = adminAccounts.find((a) => a.username.toLowerCase() === cleanUsername);
    if (!target) {
      return res.status(404).json({ error: `\u672A\u627E\u5230\u8D26\u53F7\u3010${username}\u3011` });
    }
    target.password = cleanPassword;
    if (cleanUsername === "admin") {
      systemConfig.adminPassword = cleanPassword;
    }
    saveDataToFile();
    res.json({
      success: true,
      message: `\u8D26\u53F7\u3010${target.displayName}\u3011\u5BC6\u7801\u5DF2\u6210\u529F\u4FEE\u6539\uFF01`,
      accounts: adminAccounts.map((a) => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        createdAt: a.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/accounts/:username", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || "\u4EC5\u603B\u7BA1\u7406\u5458\u6709\u6743\u9650\u5220\u9664\u8D26\u53F7" });
    }
    const username = String(req.params.username).trim().toLowerCase();
    if (username === "admin") {
      return res.status(400).json({ error: "\u7981\u6B62\u5220\u9664\u7CFB\u7EDF\u6839\u603B\u7BA1\u7406\u5458\u8D26\u53F7\uFF08admin\uFF09" });
    }
    const index = adminAccounts.findIndex((a) => a.username.toLowerCase() === username);
    if (index === -1) {
      return res.status(404).json({ error: `\u672A\u627E\u5230\u8D26\u53F7\u3010${username}\u3011` });
    }
    const deleted = adminAccounts.splice(index, 1)[0];
    saveDataToFile();
    res.json({
      success: true,
      message: `\u8D26\u53F7\u3010${deleted.displayName} (${deleted.username})\u3011\u5DF2\u6210\u529F\u5220\u9664\uFF01`,
      accounts: adminAccounts.map((a) => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        createdAt: a.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/sync-data", (req, res) => {
  try {
    const { classes: clientClasses, students: clientStudents, records: clientRecords, config: clientConfig, accounts: clientAccounts } = req.body;
    if (Array.isArray(clientClasses) && clientClasses.length > 0) {
      setClasses(clientClasses);
    }
    if (Array.isArray(clientStudents) && clientStudents.length > 0) {
      setStudents(clientStudents);
    }
    if (Array.isArray(clientRecords)) {
      const recordMap = /* @__PURE__ */ new Map();
      records.forEach((r) => recordMap.set(r.id, r));
      clientRecords.forEach((r) => recordMap.set(r.id, r));
      setRecords(Array.from(recordMap.values()));
    }
    if (clientConfig) {
      setSystemConfig({ ...systemConfig, ...clientConfig });
    }
    saveDataToFile();
    res.json({
      success: true,
      message: "\u4E91\u7AEF\u52A8\u6001\u670D\u52A1\u6570\u636E\u5DF2\u540C\u6B65\u5B8C\u6210\uFF01",
      classes,
      students,
      records,
      config: systemConfig
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use("/api", apiRouter);
app.use(apiRouter);
app.use("/api", (req, res) => {
  res.status(404).json({
    error: `\u63A5\u53E3\u672A\u627E\u5230: ${req.method} ${req.url}`,
    status: 404,
    validEndpoints: ["/api/health", "/api/state", "/api/cloud-sync", "/api/sync-data", "/api/checkin", "/api/classes", "/api/students", "/api/config"]
  });
});
var app_default = app;
export {
  app_default as default
};
