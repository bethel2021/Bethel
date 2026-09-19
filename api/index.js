// server/app.ts
import express from "express";

// server/initialData.ts
var initialClasses = [
  {
    id: "class-1",
    name: "\u5C0F\u5C0F\u73ED",
    ageRange: "1-6\u5C81",
    teacher: "\u6625\u6765 \u8001\u5E08",
    subjectTeacher: "\u6D01\u5982\u3001\u5F69\u971E \u8001\u5E08",
    classroom: "7\u53F7\u6559\u5BA4",
    color: "bg-emerald-500",
    groupType: "sunday_school",
    description: "\u300C\u64AD\u6492\u771F\u5149\u5E7C\u82D7\uFF0C\u611F\u53D7\u57FA\u7763\u5927\u7231\u300D\u85C9\u7740\u8BD7\u6B4C\u5F8B\u52A8\u4E0E\u751F\u52A8\u5723\u7ECF\u6545\u4E8B\uFF0C\u5728\u6E29\u99A8\u966A\u4F34\u4E2D\u5EFA\u7ACB\u5B89\u5168\u611F\u4E0E\u656C\u62DC\u521D\u4F53\u9A8C\uFF0C\u8BA9\u4E3B\u7231\u4ECE\u5C0F\u624E\u6839\u4E8E\u5E7C\u5C0F\u5FC3\u7530\u3002",
    isHiddenFromHome: false
  },
  {
    id: "class-2",
    name: "\u5C0F\u73ED",
    ageRange: "7-8\u5C81",
    teacher: "\u79CB\u5A1F \u8001\u5E08",
    subjectTeacher: "\u96EA\u5CF0\u3001\u52E4\u6D01\u3001\u8D34\u67D4 \u8001\u5E08",
    classroom: "5\u53F7\u6559\u5BA4",
    color: "bg-teal-500",
    groupType: "sunday_school",
    description: "\u300C\u5B66\u4E60\u5723\u7ECF\u54C1\u683C\uFF0C\u57F9\u517B\u656C\u754F\u987A\u670D\u300D\u5F15\u5BFC\u5B69\u7AE5\u6717\u8BFB\u5723\u7ECF\u8BDD\u8BED\u3001\u8BA4\u8BC6\u9020\u7269\u4E3B\u4F5C\u4E3A\uFF0C\u5728\u56E2\u5951\u751F\u6D3B\u4E2D\u5EFA\u7ACB\u8BDA\u5B9E\u3001\u53CB\u7231\u4E0E\u987A\u670D\u7684\u57FA\u7763\u5F92\u597D\u54C1\u884C\u3002",
    isHiddenFromHome: false
  },
  {
    id: "class-3",
    name: "\u4E2D\u73ED",
    ageRange: "9-10\u5C81",
    teacher: "\u82E5\u96EA \u8001\u5E08",
    subjectTeacher: "\u7EA6\u65AF\u3001\u6021\u6B23\u3001\u4F69\u5E06 \u8001\u5E08",
    classroom: "6\u53F7\u6559\u5BA4",
    color: "bg-amber-500",
    groupType: "sunday_school",
    description: "\u300C\u624E\u6839\u5723\u7ECF\u771F\u7406\uFF0C\u5E38\u5B58\u611F\u6069\u76F8\u7231\u300D\u7814\u8BFB\u5723\u7ECF\u6551\u8D4E\u6545\u4E8B\u4E0E\u4FE1\u5FC3\u699C\u6837\uFF0C\u5B66\u4E60\u51E1\u4E8B\u8C22\u6069\u3001\u5F7C\u6B64\u76F8\u987E\uFF0C\u5728\u5BB6\u5EAD\u4E0E\u5B66\u6821\u65E5\u5E38\u4E2D\u6D3B\u51FA\u795E\u559C\u60A6\u7684\u6837\u5F0F\u3002",
    isHiddenFromHome: false
  },
  {
    id: "class-4",
    name: "\u5927\u73ED",
    ageRange: "11-12\u5C81",
    teacher: "\u4E0A\u597D \u8001\u5E08",
    subjectTeacher: "\u7434\u73B2\u3001\u4F9D\u857E\u3001\u6069\u6EA2 \u8001\u5E08",
    classroom: "3\u53F7\u6559\u5BA4",
    color: "bg-orange-500",
    groupType: "sunday_school",
    description: "\u300C\u5EFA\u7ACB\u4E2A\u4EBA\u4FE1\u4EF0\uFF0C\u7ED3\u51FA\u54C1\u884C\u679C\u5B50\u300D\u5E2E\u52A9\u5B66\u751F\u517B\u6210\u81EA\u4E3B\u7075\u4FEE\u4E0E\u7977\u544A\u4E60\u60EF\uFF0C\u660E\u8FA8\u662F\u975E\u771F\u7406\uFF0C\u9884\u5907\u8EAB\u5FC3\u7075\u6B65\u5165\u5C11\u5E74\u671F\uFF0C\u52C7\u4E8E\u5728\u6821\u56ED\u4E2D\u4E3A\u4E3B\u53D1\u5149\u3002",
    isHiddenFromHome: false
  },
  {
    id: "class-5",
    name: "\u521D\u4E2D\u73ED",
    ageRange: "13-14\u5C81",
    teacher: "\u96EA\u6210 \u8001\u5E08",
    subjectTeacher: "\u91D1\u82E5\u3001\u6D0B\u6D0B\u3001\u7763\u519B \u8001\u5E08",
    classroom: "1\u53F7\u6559\u5BA4",
    color: "bg-blue-500",
    groupType: "sunday_school",
    description: "\u300C\u7B51\u7262\u771F\u7406\u6839\u57FA\uFF0C\u4F5C\u4E3B\u65E0\u754F\u95E8\u5F92\u300D\u5F15\u5BFC\u9752\u5C11\u5E74\u5728\u6210\u957F\u56F0\u60D1\u4E0E\u601D\u6F6E\u4E2D\u575A\u7ACB\u4FE1\u4EF0\u4E16\u754C\u89C2\uFF0C\u64CD\u7EC3\u56E2\u5951\u6276\u6301\uFF0C\u4E0D\u4ECE\u4E16\u4FD7\uFF0C\u603B\u5728\u8A00\u8BED\u884C\u4E3A\u4E0A\u4F5C\u699C\u6837\u3002",
    isHiddenFromHome: false
  },
  {
    id: "class-6",
    name: "\u9AD8\u4E2D\u73ED",
    ageRange: "15-16\u5C81",
    teacher: "\u5FD7\u5B89 \u8001\u5E08",
    subjectTeacher: "\u9648\u5E08\u6BCD\u3001\u663E\u7F8E\u3001\u5468\u59B9 \u8001\u5E08",
    classroom: "2\u53F7\u6559\u5BA4",
    color: "bg-indigo-500",
    groupType: "sunday_school",
    description: "\u300C\u6DF1\u5316\u4FE1\u4EF0\u601D\u8FA8\uFF0C\u64CD\u7EC3\u4F8D\u5949\u89C1\u8BC1\u300D\u5F15\u5BFC\u9AD8\u4E2D\u95E8\u5F92\u5C06\u771F\u7406\u878D\u5165\u5B66\u4E1A\u4E0E\u672A\u6765\u5F02\u8C61\uFF0C\u79EF\u6781\u53C2\u4E0E\u6559\u4F1A\u670D\u4F8D\u4E0E\u798F\u97F3\u89C1\u8BC1\uFF0C\u6210\u957F\u4E3A\u6709\u57FA\u7763\u751F\u547D\u62C5\u5F53\u7684\u9752\u5E74\u3002",
    isHiddenFromHome: false
  },
  {
    id: "class-7",
    name: "\u4EE5\u65AF\u62C9\u56E2\u5951",
    ageRange: "16-20\u5C81",
    teacher: "\u4E1C\u4E3D \u8001\u5E08",
    subjectTeacher: "\u9648\u6D77\u4F1F\u7267\u5E08\uFF0C\u6765\u4FCA\u3001\u5F20\u56FD \u8001\u5E08",
    classroom: "\u5927\u5802",
    color: "bg-purple-500",
    groupType: "fellowship",
    description: "\u300C\u5B9A\u5FD7\u8003\u7A76\u795E\u9053\uFF0C\u7ACB\u5FD7\u884C\u9053\u6559\u5BFC\u300D\u6548\u6CD5\u4EE5\u65AF\u62C9\u4E13\u5FC3\u8003\u7A76\u9075\u884C\u795E\u5F8B\u6CD5\u7684\u5FC3\u5FD7\uFF0C\u5728\u6821\u56ED\u4E0E\u804C\u573A\u4E2D\u4F5C\u5F97\u80DC\u89C1\u8BC1\uFF0C\u540C\u5FC3\u670D\u4F8D\u6559\u4F1A\u3001\u4F20\u627F\u4FE1\u4EF0\u4F7F\u547D\u3002",
    isHiddenFromHome: false
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
  // 高中班 (15-16岁)
  { id: "s-601", name: "\u6797\u54F2\u701A", gender: "boy", birthDate: "2009-11-01", age: 16, classId: "class-6", parentName: "\u663E\u7F8E", parentPhone: "3778364620", memberCode: "BTL-14", joinDate: "2023-09-01" },
  { id: "s-602", name: "\u738B\u51CC\u9E4F (David)", gender: "boy", birthDate: "2010-02-16", age: 16, classId: "class-6", parentName: "\u9648\u84D3\u601D", parentPhone: "3332659108", memberCode: "BTL-15", joinDate: "2023-09-01" },
  { id: "s-603", name: "\u90B5\u7199\u8FB0 (Oscar)", gender: "boy", birthDate: "2010-02-27", age: 16, classId: "class-6", parentName: "\u4E9A\u975E", parentPhone: "3939393922", memberCode: "BTL-16", joinDate: "2023-03-01" },
  { id: "s-604", name: "\u4EFB\u54C1\u745E (Giovanna)", gender: "girl", birthDate: "2010-01-03", age: 16, classId: "class-6", parentName: "\u6797\u4F1F\u73CD", parentPhone: "3501945801", memberCode: "BTL-17", joinDate: "2024-09-01" },
  { id: "s-605", name: "\u9648\u745E\u6DB5 (Sadero)", gender: "boy", birthDate: "2010-04-27", age: 16, classId: "class-6", parentName: "\u5BB6\u957F", parentPhone: "3756763723", memberCode: "BTL-18", joinDate: "2024-09-01" },
  { id: "s-606", name: "\u5F20\u91D1\u777F (Diana)", gender: "girl", birthDate: "2010-06-17", age: 16, classId: "class-6", parentName: "\u5BB6\u957F", parentPhone: "3242887180", memberCode: "BTL-19", joinDate: "2024-09-01" },
  { id: "s-607", name: "\u6D82\u610F\u8C6A", gender: "boy", birthDate: "2010-07-08", age: 16, classId: "class-6", parentName: "\u6234\u5C11\u840D", parentPhone: "3312696885", memberCode: "BTL-20", joinDate: "2024-09-01" },
  { id: "s-608", name: "\u9AD8\u96C5\u8BD7", gender: "girl", birthDate: "2010-09-15", age: 16, classId: "class-6", parentName: "\u90D1\u5411\u7F8E", parentPhone: "3500082336", memberCode: "BTL-21", joinDate: "2024-09-01" },
  { id: "s-609", name: "\u848B\u667A\u8BDA (Daniele)", gender: "boy", birthDate: "2010-12-04", age: 15, classId: "class-6", parentName: "\u59DC\u52E4\u6D01", parentPhone: "3284269787", memberCode: "BTL-24", joinDate: "2026-09-01" },
  { id: "s-610", name: "\u9648\u6B23\u6021 (Luisa)", gender: "girl", birthDate: "2011-05-06", age: 15, classId: "class-6", parentName: "\u6625\u71D5", parentPhone: "3760070543", memberCode: "BTL-25", joinDate: "2026-09-01" },
  { id: "s-612", name: "\u4F59\u8212\u6DB5 (Sara)", gender: "girl", birthDate: "2011-07-12", age: 15, classId: "class-6", parentName: "\u5BB6\u957F", parentPhone: "3881792808", memberCode: "BTL-27", joinDate: "2026-09-01" },
  { id: "s-613", name: "\u53F6\u5B87\u660A (Isacco)", gender: "boy", birthDate: "2011-07-27", age: 15, classId: "class-6", parentName: "\u91D1\u82E5", parentPhone: "3807763535", memberCode: "BTL-28", joinDate: "2026-09-01" },
  { id: "s-614", name: "\u6728\u8FE6\u71A0 (Jonny)", gender: "boy", birthDate: "2011-08-29", age: 15, classId: "class-6", parentName: "\u8096\u4F36\u4FD0", parentPhone: "3778349376", memberCode: "BTL-29", joinDate: "2026-09-01" },
  { id: "s-615", name: "\u7FC1\u8BD7\u96C5 (Gionna)", gender: "girl", birthDate: "2011-01-20", age: 15, classId: "class-6", parentName: "\u5F20\u82E5\u6167", parentPhone: "3289497239", memberCode: "BTL-30", joinDate: "2026-09-01" },
  { id: "s-616", name: "\u738B\u82E5\u8431 (Jessy)", gender: "girl", birthDate: "2011-06-21", age: 15, classId: "class-6", parentName: "\u9EC4\u6DD1\u73CD", parentPhone: "3881852616", memberCode: "BTL-31", joinDate: "2026-09-01" },
  { id: "s-617", name: "\u5F90\u51CC\u970F (Fiona)", gender: "girl", birthDate: "2011-07-15", age: 15, classId: "class-6", parentName: "\u9EC4\u5E86\u4F1F", parentPhone: "3501329726", memberCode: "BTL-32", joinDate: "2026-09-01" },
  { id: "s-618", name: "\u5F20\u91D1\u65ED (Davide)", gender: "boy", birthDate: "2011-10-05", age: 15, classId: "class-6", parentName: "\u5F20\u82E5\u6167", parentPhone: "3242898504", memberCode: "BTL-33", joinDate: "2026-09-01" },
  { id: "s-619", name: "\u6797\u6155\u598D (Monica)", gender: "girl", birthDate: "2011-11-11", age: 15, classId: "class-6", parentName: "\u5F90\u79C0", parentPhone: "3279131933", memberCode: "BTL-34", joinDate: "2026-09-01" },
  { id: "s-620", name: "\u848B\u5FC3\u8BED (Chiara)", gender: "girl", birthDate: "2011-11-25", age: 15, classId: "class-6", parentName: "\u5BB6\u957F", parentPhone: "3331671680", memberCode: "BTL-35", joinDate: "2026-09-01" },
  { id: "s-621", name: "\u674E\u6069\u60DC (Rebecca)", gender: "girl", birthDate: "2011-11-28", age: 15, classId: "class-6", parentName: "\u7389\u71D5", parentPhone: "3295678897", memberCode: "BTL-36", joinDate: "2026-09-01" },
  { id: "s-622", name: "\u9648\u701A\u6E90 (Giovanni)", gender: "boy", birthDate: "2011-12-16", age: 15, classId: "class-6", parentName: "\u9648\u5E16", parentPhone: "3500180705", memberCode: "BTL-37", joinDate: "2026-09-01" },
  { id: "s-623", name: "\u6731\u666F\u6CFD (Alex)", gender: "boy", birthDate: "2011-12-28", age: 15, classId: "class-6", parentName: "\u68A6\u601D", parentPhone: "3801014182", memberCode: "BTL-38", joinDate: "2026-09-01" },
  { id: "s-624", name: "\u5B63\u6069\u97F5", gender: "girl", birthDate: "2012-01-28", age: 14, classId: "class-6", parentName: "\u91D1\u4E39", parentPhone: "3399060662", memberCode: "BTL-39", joinDate: "2026-09-01" },
  { id: "s-625", name: "\u6F58\u6069\u8A00 (Lucia)", gender: "girl", birthDate: "2012-03-04", age: 14, classId: "class-6", parentName: "\u67EF\u732E\u5229", parentPhone: "3778364808", memberCode: "BTL-40", joinDate: "2026-09-01" },
  { id: "s-626", name: "\u8521\u714A (Lucas)", gender: "boy", birthDate: "2012-05-17", age: 14, classId: "class-6", parentName: "\u829D\u6167", parentPhone: "3343551587", memberCode: "BTL-41", joinDate: "2026-09-01" },
  { id: "s-627", name: "\u65BD\u6B23\u5A9B (Angele)", gender: "girl", birthDate: "2012-07-29", age: 14, classId: "class-6", parentName: "\u90D1\u6676\u6676", parentPhone: "", memberCode: "BTL-42", joinDate: "2026-09-01" },
  { id: "s-628", name: "\u90B5\u7199\u4F51 (Lucas)", gender: "boy", birthDate: "2012-11-23", age: 14, classId: "class-6", parentName: "\u4E9A\u975E", parentPhone: "3348369286", memberCode: "BTL-43", joinDate: "2026-09-01" },
  { id: "s-629", name: "\u9648\u4E50\u7476 (Cristina)", gender: "girl", birthDate: "2012-12-01", age: 14, classId: "class-6", parentName: "\u6625\u71D5", parentPhone: "3778410034", memberCode: "BTL-44", joinDate: "2026-09-01" },
  { id: "s-630", name: "\u5468\u94ED\u54F2 (Andy)", gender: "boy", birthDate: "2012-09-07", age: 14, classId: "class-6", parentName: "\u5BB6\u957F", parentPhone: "3274786535", memberCode: "BTL-45", joinDate: "2026-09-01" },
  { id: "s-631", name: "\u7FC1\u54F2\u6DB5 (Johnny)", gender: "boy", birthDate: "2012-12-07", age: 14, classId: "class-6", parentName: "\u5F20\u82E5\u6167", parentPhone: "3289497239", memberCode: "BTL-46", joinDate: "2026-09-01" }
];
var initialSystemConfig = {
  churchName: "\u4F2F\u7279\u5229\u6559\u4F1A",
  schoolTitle: "\u4E3B\u65E5\u5B66\u4E0E\u56E2\u5951IMS",
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
  { id: "acc-admin", username: "admin", displayName: "\u603B\u7BA1\u7406\u5458", role: "superadmin", password: "bethel2026", createdAt: "2026-01-01" },
  { id: "acc-teacher", username: "teacher", displayName: "\u4E3B\u65E5\u5B66\u4E0A\u8BFE\u8001\u5E08", role: "teacher", password: "bethel123", createdAt: "2026-01-01" },
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
function getRomeTimeParts(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const fullTimeStr = `${timeStr}:${String(second).padStart(2, "0")}`;
  const dayOfWeek = (/* @__PURE__ */ new Date(`${dateStr}T12:00:00Z`)).getUTCDay();
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    timeStr,
    fullTimeStr,
    dayOfWeek
  };
}
function getActiveSundayDate() {
  const rome = getRomeTimeParts();
  if (rome.dayOfWeek === 0) {
    return rome.dateStr;
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
function getHiddenClassStoragePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "bethel-hidden-classes.json");
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, "hidden-classes.json");
  } catch {
    return path.join(os.tmpdir(), "bethel-hidden-classes.json");
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
var changeListeners = /* @__PURE__ */ new Set();
function onDataChange(listener) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}
function saveDataToFile() {
  syncVersion++;
  lastModifiedTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const hiddenIds = classes.filter((c) => !!c.isHiddenFromHome).map((c) => c.id);
  systemConfig = {
    ...systemConfig,
    hiddenClassIds: hiddenIds
  };
  const payload = {
    systemConfig,
    classes,
    students,
    records,
    adminAccounts,
    activeSunday,
    syncVersion,
    hiddenClassIds: hiddenIds,
    updatedAt: lastModifiedTimestamp
  };
  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    const hiddenPath = getHiddenClassStoragePath();
    fs.writeFileSync(hiddenPath, JSON.stringify(hiddenIds, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Storage Notice] Could not write to disk cache (normal in read-only serverless environment):", err);
  }
  for (const listener of changeListeners) {
    try {
      listener({
        classes,
        students,
        records,
        config: systemConfig,
        adminAccounts,
        activeSunday,
        syncVersion,
        lastModifiedTimestamp
      });
    } catch (err) {
      console.warn("[Realtime Sync Error] Listener callback failed:", err);
    }
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
}
var isInitialized = false;
function sanitizeYageData() {
  classes = classes.filter((c) => c.id !== "class-8" && c.name !== "\u96C5\u6B4C\u56E2\u5951");
  students = students.filter((s) => s.classId !== "class-8" && s.id !== "s-801" && s.id !== "s-802");
  records = records.filter((r) => r.classId !== "class-8" && r.studentId !== "s-801" && r.studentId !== "s-802");
}
function loadFromDisk() {
  try {
    const hiddenPath = getHiddenClassStoragePath();
    const hiddenSet = /* @__PURE__ */ new Set();
    if (fs.existsSync(hiddenPath)) {
      try {
        const rawHidden = JSON.parse(fs.readFileSync(hiddenPath, "utf-8"));
        if (Array.isArray(rawHidden)) {
          rawHidden.forEach((id) => hiddenSet.add(id));
        }
      } catch {
      }
    }
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.hiddenClassIds)) {
        data.hiddenClassIds.forEach((id) => hiddenSet.add(id));
      }
      if (Array.isArray(data.classes) && data.classes.length > 0) {
        classes = data.classes.map((c) => ({
          ...c,
          isHiddenFromHome: typeof c.isHiddenFromHome === "boolean" ? c.isHiddenFromHome : hiddenSet.has(c.id)
        }));
      } else {
        classes = classes.map((c) => ({
          ...c,
          isHiddenFromHome: typeof c.isHiddenFromHome === "boolean" ? c.isHiddenFromHome : hiddenSet.has(c.id)
        }));
      }
      if (Array.isArray(data.students) && data.students.length > 0) students = data.students;
      if (Array.isArray(data.records)) records = data.records;
      if (Array.isArray(data.adminAccounts) && data.adminAccounts.length > 0) adminAccounts = data.adminAccounts;
      if (data.systemConfig) {
        systemConfig = { ...initialSystemConfig, ...data.systemConfig, hiddenClassIds: Array.from(hiddenSet) };
      }
      if (data.activeSunday) activeSunday = data.activeSunday;
      if (typeof data.syncVersion === "number") syncVersion = data.syncVersion;
      if (data.updatedAt) lastModifiedTimestamp = data.updatedAt;
      sanitizeYageData();
      return true;
    } else if (hiddenSet.size > 0) {
      classes = classes.map((c) => ({
        ...c,
        isHiddenFromHome: hiddenSet.has(c.id)
      }));
    }
  } catch (err) {
    console.warn("[Storage Notice] Could not read disk cache:", err);
  }
  sanitizeYageData();
  return false;
}
function initOrLoadData() {
  if (isInitialized) {
    return;
  }
  isInitialized = true;
  const loaded = loadFromDisk();
  if (loaded) {
    sanitizeYageData();
    saveDataToFile();
    initOrLoadDataAsync().catch(() => {
    });
    return;
  }
  sanitizeYageData();
  generateHistoricalRecords();
  saveDataToFile();
  initOrLoadDataAsync().catch(() => {
  });
}
async function initOrLoadDataAsync() {
  if (!isInitialized) {
    loadFromDisk();
    isInitialized = true;
  }
  const cloudData = await loadFromCloudKV();
  if (cloudData && typeof cloudData.syncVersion === "number") {
    if (cloudData.syncVersion > syncVersion) {
      const currentHiddenSet = new Set(classes.filter((c) => !!c.isHiddenFromHome).map((c) => c.id));
      if (Array.isArray(cloudData.hiddenClassIds)) {
        cloudData.hiddenClassIds.forEach((id) => currentHiddenSet.add(id));
      }
      if (Array.isArray(cloudData.classes) && cloudData.classes.length > 0) {
        classes = cloudData.classes.map((c) => ({
          ...c,
          isHiddenFromHome: typeof c.isHiddenFromHome === "boolean" ? c.isHiddenFromHome : currentHiddenSet.has(c.id)
        }));
      }
      if (Array.isArray(cloudData.students) && cloudData.students.length > 0) students = cloudData.students;
      if (Array.isArray(cloudData.records)) records = cloudData.records;
      if (Array.isArray(cloudData.adminAccounts) && cloudData.adminAccounts.length > 0) adminAccounts = cloudData.adminAccounts;
      if (cloudData.systemConfig) systemConfig = { ...initialSystemConfig, ...cloudData.systemConfig, hiddenClassIds: Array.from(currentHiddenSet) };
      if (cloudData.activeSunday) activeSunday = cloudData.activeSunday;
      syncVersion = cloudData.syncVersion;
      if (cloudData.updatedAt) lastModifiedTimestamp = cloudData.updatedAt;
      sanitizeYageData();
      saveDataToFile();
    }
  }
}
function verifySuperAdminPermission(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : req.headers["x-admin-token"];
  const userRoleHeader = req.headers["x-user-role"];
  const usernameHeader = req.headers["x-username"];
  if ((userRoleHeader === "teacher" || userRoleHeader === "fellowship_leader") && (!usernameHeader || usernameHeader.toLowerCase() !== "admin")) {
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
  if (token && token.startsWith("btl_session_") && (userRoleHeader === "superadmin" || !userRoleHeader)) {
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
    const hiddenPath = getHiddenClassStoragePath();
    const diskHiddenSet = /* @__PURE__ */ new Set();
    try {
      if (fs.existsSync(hiddenPath)) {
        const raw = JSON.parse(fs.readFileSync(hiddenPath, "utf-8"));
        if (Array.isArray(raw)) raw.forEach((id) => diskHiddenSet.add(id));
      }
    } catch {
    }
    const classMap = new Map(classes.map((c) => [c.id, c]));
    for (const c of payload.classes) {
      if (!classMap.has(c.id)) {
        const isHidden = typeof c.isHiddenFromHome === "boolean" ? c.isHiddenFromHome : diskHiddenSet.has(c.id);
        classMap.set(c.id, {
          ...c,
          isHiddenFromHome: isHidden
        });
        changed = true;
      } else {
        const existing = classMap.get(c.id);
        const authoritativeHidden = typeof existing.isHiddenFromHome === "boolean" ? existing.isHiddenFromHome : diskHiddenSet.has(c.id);
        const mergedClass = {
          ...existing,
          isHiddenFromHome: authoritativeHidden
        };
        if (JSON.stringify(existing) !== JSON.stringify(mergedClass)) {
          classMap.set(c.id, mergedClass);
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
var sseClients = /* @__PURE__ */ new Set();
var wsClients = /* @__PURE__ */ new Set();
var pollWaiters = /* @__PURE__ */ new Set();
function getCurrentStatePayload(eventType = "state_update", extraData) {
  const currentSunday = getActiveSundayDate();
  const hiddenIds = classes.filter((c) => !!c.isHiddenFromHome).map((c) => c.id);
  return {
    type: eventType,
    syncVersion,
    lastModified: lastModifiedTimestamp,
    config: {
      ...systemConfig,
      hiddenClassIds: hiddenIds
    },
    hiddenClassIds: hiddenIds,
    classes: classes.map((c) => ({
      ...c,
      isHiddenFromHome: !!c.isHiddenFromHome
    })),
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
    serverTime: (/* @__PURE__ */ new Date()).toISOString(),
    extra: extraData
  };
}
function broadcastRealtimeState(eventType = "state_update", extraData) {
  const payload = getCurrentStatePayload(eventType, extraData);
  const jsonString = JSON.stringify(payload);
  for (const ws of Array.from(wsClients)) {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(jsonString);
      } catch (err) {
        wsClients.delete(ws);
      }
    } else if (ws && ws.readyState > 1) {
      wsClients.delete(ws);
    }
  }
  for (const res of Array.from(sseClients)) {
    try {
      res.write(`event: update
data: ${jsonString}

`);
    } catch (err) {
      sseClients.delete(res);
    }
  }
  for (const waiter of Array.from(pollWaiters)) {
    clearTimeout(waiter.timer);
    try {
      waiter.res.json({
        changed: true,
        ...payload
      });
    } catch (err) {
    }
  }
  pollWaiters.clear();
}
onDataChange(() => {
  broadcastRealtimeState("data_change");
});
function registerWebSocketClient(ws) {
  wsClients.add(ws);
  try {
    const initialPayload = getCurrentStatePayload("ws_init");
    ws.send(JSON.stringify(initialPayload));
  } catch (err) {
  }
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data && data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", time: Date.now() }));
      } else if (data && data.type === "request_state") {
        ws.send(JSON.stringify(getCurrentStatePayload("state_response")));
      }
    } catch (err) {
    }
  });
  ws.on("close", () => {
    wsClients.delete(ws);
  });
  ws.on("error", () => {
    wsClients.delete(ws);
  });
}
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
  const hiddenIds = classes.filter((c) => !!c.isHiddenFromHome).map((c) => c.id);
  res.json({
    config: {
      ...systemConfig,
      hiddenClassIds: hiddenIds
    },
    hiddenClassIds: hiddenIds,
    classes: classes.map((c) => ({
      ...c,
      isHiddenFromHome: !!c.isHiddenFromHome
    })),
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
  res.json({
    status: "ok",
    syncVersion,
    lastModified: lastModifiedTimestamp,
    kvConnected: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    classes: classes.map((c) => ({
      ...c,
      isHiddenFromHome: !!c.isHiddenFromHome
    })),
    students,
    records,
    config: systemConfig,
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
apiRouter.get("/realtime-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
  sseClients.add(res);
  const initialData = JSON.stringify(getCurrentStatePayload("sse_init"));
  res.write(`event: initial
data: ${initialData}

`);
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 15e3);
  req.on("close", () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});
apiRouter.get("/realtime-poll", async (req, res) => {
  const clientVersion = parseInt(req.query.version, 10) || 0;
  const timeoutMs = Math.min(Math.max(parseInt(req.query.timeout, 10) || 2e4, 1e3), 3e4);
  if (clientVersion !== syncVersion && syncVersion > 0) {
    return res.json({
      changed: true,
      ...getCurrentStatePayload("poll_immediate")
    });
  }
  let waiter = null;
  const timer = setTimeout(() => {
    if (waiter) pollWaiters.delete(waiter);
    try {
      res.json({
        changed: false,
        syncVersion,
        lastModified: lastModifiedTimestamp,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
    }
  }, timeoutMs);
  waiter = { res, timer, clientVersion };
  pollWaiters.add(waiter);
  req.on("close", () => {
    clearTimeout(timer);
    if (waiter) pollWaiters.delete(waiter);
  });
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
function isServerCheckinAllowed(now = /* @__PURE__ */ new Date()) {
  if (systemConfig.testMode) {
    return { isAllowed: true };
  }
  const romeTime = getRomeTimeParts(now);
  const isSunday = romeTime.dayOfWeek === 0;
  if (!isSunday) {
    return {
      isAllowed: false,
      message: "\u975E\u4E3B\u65E5\u7B7E\u5230\u5F00\u653E\u65F6\u6BB5\uFF0C\u8BF7\u7B49\u5F85\u4E0B\u4E00\u4E2A\u4E3B\u65E5\uFF01\uFF08\u53EF\u8054\u7CFB\u7BA1\u7406\u5458\u5F00\u542F\uFF5B\u6D4B\u8BD5\u6A21\u5F0F\uFF5D\uFF09"
    };
  }
  let startMinutes = 8 * 60 + 30;
  let endMinutes = 12 * 60 + 30;
  if (systemConfig.checkinStartTime) {
    const [sh, sm] = systemConfig.checkinStartTime.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(sm)) {
      startMinutes = sh * 60 + sm;
    }
  }
  if (systemConfig.checkinEndTime) {
    const [eh, em] = systemConfig.checkinEndTime.split(":").map(Number);
    if (!isNaN(eh) && !isNaN(em)) {
      endMinutes = eh * 60 + em;
    }
  }
  const currentMinutes = romeTime.hour * 60 + romeTime.minute;
  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return {
      isAllowed: false,
      message: "\u975E\u4E3B\u65E5\u7B7E\u5230\u5F00\u653E\u65F6\u6BB5\uFF0C\u8BF7\u7B49\u5F85\u4E0B\u4E00\u4E2A\u4E3B\u65E5\uFF01\uFF08\u53EF\u8054\u7CFB\u7BA1\u7406\u5458\u5F00\u542F\uFF5B\u6D4B\u8BD5\u6A21\u5F0F\uFF5D\uFF09"
    };
  }
  return { isAllowed: true };
}
apiRouter.post("/checkin", (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const check = isServerCheckinAllowed(now);
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }
    const { studentId, memoryVerseCompleted, offeringCompleted, notes = "" } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "\u8BF7\u9009\u62E9\u6216\u8F93\u5165\u6253\u5361\u5B66\u5458\u59D3\u540D" });
    }
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "\u672A\u5728\u4F2F\u7279\u5229\u6559\u4F1A\u540D\u518C\u4E2D\u627E\u5230\u8BE5\u5B66\u5458\uFF0C\u8BF7\u8054\u7CFB\u8001\u5E08\u767B\u8BB0" });
    }
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
    const romeTime = getRomeTimeParts(now);
    const curTimeStr = romeTime.timeStr;
    let isLate = false;
    if (systemConfig.enableLateRule) {
      const [lateH, lateM] = (systemConfig.lateThresholdTime || "09:30").split(":").map(Number);
      if (romeTime.hour > lateH || romeTime.hour === lateH && romeTime.minute > lateM) {
        isLate = true;
      }
    }
    if (systemConfig.checkinEndTime) {
      const [endH, endM] = systemConfig.checkinEndTime.split(":").map(Number);
      if (!isNaN(endH) && !isNaN(endM)) {
        if (romeTime.hour > endH || romeTime.hour === endH && romeTime.minute > endM) {
          isLate = true;
        }
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
    const check = isServerCheckinAllowed();
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }
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
    const romeTime = getRomeTimeParts(now);
    const timeStr = romeTime.timeStr;
    let finalStatus = status || "present";
    if (finalStatus === "present") {
      let isLate = false;
      if (systemConfig.enableLateRule) {
        const [lateH, lateM] = (systemConfig.lateThresholdTime || "09:30").split(":").map(Number);
        if (romeTime.hour > lateH || romeTime.hour === lateH && romeTime.minute > lateM) {
          isLate = true;
        }
      }
      if (systemConfig.checkinEndTime) {
        const [endH, endM] = systemConfig.checkinEndTime.split(":").map(Number);
        if (!isNaN(endH) && !isNaN(endM)) {
          if (romeTime.hour > endH || romeTime.hour === endH && romeTime.minute > endM) {
            isLate = true;
          }
        }
      }
      if (isLate) {
        finalStatus = "late";
      }
    }
    if (existingIdx !== -1) {
      records[existingIdx] = {
        ...records[existingIdx],
        status: finalStatus,
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
      status: finalStatus,
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
    const check = isServerCheckinAllowed();
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }
    const { classId, date, status = "present" } = req.body;
    const targetDate = date || getActiveSundayDate();
    const now = /* @__PURE__ */ new Date();
    const romeTime = getRomeTimeParts(now);
    const timeStr = romeTime.timeStr;
    let finalStatus = status;
    if (finalStatus === "present") {
      let isLate = false;
      if (systemConfig.enableLateRule) {
        const [lateH, lateM] = (systemConfig.lateThresholdTime || "09:30").split(":").map(Number);
        if (romeTime.hour > lateH || romeTime.hour === lateH && romeTime.minute > lateM) {
          isLate = true;
        }
      }
      if (systemConfig.checkinEndTime) {
        const [endH, endM] = systemConfig.checkinEndTime.split(":").map(Number);
        if (!isNaN(endH) && !isNaN(endM)) {
          if (romeTime.hour > endH || romeTime.hour === endH && romeTime.minute > endM) {
            isLate = true;
          }
        }
      }
      if (isLate) {
        finalStatus = "late";
      }
    }
    const targetStudents = classId && classId !== "all" ? students.filter((s) => s.classId === classId) : students;
    let updatedCount = 0;
    targetStudents.forEach((stu) => {
      const existingIdx = records.findIndex((r) => r.studentId === stu.id && r.date === targetDate);
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
        ageRange: ageRange !== void 0 ? ageRange : classes[idx].ageRange,
        teacher: teacher !== void 0 ? teacher : classes[idx].teacher,
        subjectTeacher: subjectTeacher !== void 0 ? subjectTeacher : classes[idx].subjectTeacher,
        classroom: classroom !== void 0 ? classroom : classes[idx].classroom,
        color: color !== void 0 ? color : classes[idx].color,
        groupType: groupType !== void 0 ? groupType : classes[idx].groupType || "sunday_school",
        description: description !== void 0 ? description : classes[idx].description,
        isHiddenFromHome: isHiddenFromHome !== void 0 ? !!isHiddenFromHome : classes[idx].isHiddenFromHome || false
      };
      saveDataToFile();
      return res.json({ success: true, class: classes[idx], classes, syncVersion, message: "\u73ED\u7EA7\u4FE1\u606F\u4FEE\u6539\u6210\u529F" });
    }
    const newClass = {
      id: `class-${Date.now().toString().slice(-6)}`,
      name,
      ageRange: ageRange || "\u81EA\u9009\u5E74\u9F84\u6BB5",
      teacher: teacher || "\u73ED\u7EA7\u8D1F\u8D23\u4EBA",
      subjectTeacher: subjectTeacher || "\u4E0A\u8BFE\u8001\u5E08",
      classroom: classroom || "\u4E3B\u5802\u6559\u5BA4",
      color: color || "bg-amber-500",
      groupType: groupType || "sunday_school",
      description: description || "",
      isHiddenFromHome: !!isHiddenFromHome
    };
    classes.push(newClass);
    saveDataToFile();
    res.json({ success: true, class: newClass, classes, syncVersion, message: "\u6210\u529F\u65B0\u589E\u73ED\u7EA7/\u56E2\u5951" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/classes/:id/visibility", (req, res) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }
    const { id } = req.params;
    const { isHiddenFromHome } = req.body;
    const idx = classes.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "\u672A\u627E\u5230\u6307\u5B9A\u73ED\u7EA7" });
    }
    classes[idx] = {
      ...classes[idx],
      isHiddenFromHome: !!isHiddenFromHome
    };
    saveDataToFile();
    res.json({
      success: true,
      class: classes[idx],
      classes,
      syncVersion,
      message: `\u73ED\u7EA7\u3010${classes[idx].name}\u3011\u5DF2\u6210\u529F\u8BBE\u7F6E\u4E3A\u9996\u9875${isHiddenFromHome ? "\u9690\u85CF" : "\u663E\u793A"}`
    });
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
      schoolTitle: "\u4E3B\u65E5\u5B66\u4E0E\u56E2\u5951IMS"
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
  broadcastRealtimeState,
  app_default as default,
  getCurrentStatePayload,
  registerWebSocketClient
};
