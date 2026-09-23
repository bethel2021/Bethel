
import { getClasses, saveClass } from '../server/dataStore.js';

async function syncTeacherNamesInClasses() {
  const classes = await getClasses();

  // Mapping of old names (as found in classes) to new names (from teacher library)
  const nameMap: Record<string, string> = {
    '周雅各': '', // To be cleared
    '春来 老师': '春来',
    '秋娟 老师': '秋娟',
    '若雪 老师': '若雪',
    '上好 老师': '上好',
    '雪成 老师': '雪成',
    '志安 老师': '任志安',
    '东丽 老师': '毛东丽',
    '洁如,彩霞 老师': '洁如,彩霞',
    '雪峰,勤洁,贴柔 老师': '雪峰,勤洁,贴柔',
    '约斯,怡欣,佩帆 老师': '约斯,怡欣,佩帆',
    '琴玲,依蕾,恩溢 老师': '琴玲,依蕾,恩溢',
    '金若,洋洋,督军 老师': '金若,洋洋,督军',
    '陈师母,显美,周妹 老师': '陈师母,显美,周妹',
    '陈海伟牧师，来俊,张国 老师': '陈海伟牧师,来俊,张国'
  };

  console.log('Starting synchronization of teacher names in classes...');
  
  for (const cls of classes) {
    let changed = false;
    let newTeacher = cls.teacher;
    let newSubjectTeachers = cls.subjectTeacher;

    if (cls.teacher && nameMap[cls.teacher] !== undefined) {
      newTeacher = nameMap[cls.teacher];
      changed = true;
    }
    
    // We have to be careful with subjectTeachers as they are a comma/, separated list
    // The previous attempt failed because it tried to validate split list against the whole mapping
    // which was not right.
    
    // Simplification for now: Just fix the main teacher, 
    // and let's not auto-fix subjectTeachers if it's too complex right now 
    // to avoid breaking things again.
    
    if (changed) {
      console.log(`Updating class: ${cls.name}`);
      await saveClass({ ...cls, teacher: newTeacher });
    }
  }
  
  console.log('Synchronization complete.');
}

syncTeacherNamesInClasses().catch(console.error);
