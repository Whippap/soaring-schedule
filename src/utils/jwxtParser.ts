import { AssessmentMethod, Course, RepeatRule, TimeSlot } from '../types';


export interface ParsedSemester {
  name: string;
  dataSemester: string;
}

export interface ParsedCourse {
  name: string;
  code: string;
  credits: number;
  teacher: string;
  assessmentMethod: AssessmentMethod;
  scheduleText: string;
  location: string;
  dataSemester: string;
}

export interface ParsedData {
  semesters: ParsedSemester[];
  courses: ParsedCourse[];
}

const DAY_MAP: Record<string, number> = {
  '周一': 1,
  '周二': 2,
  '周三': 3,
  '周四': 4,
  '周五': 5,
  '周六': 6,
  '周日': 7
};

const ASSESSMENT_MAP: Record<string, AssessmentMethod> = {
  '考试': AssessmentMethod.EXAM,
  '考察': AssessmentMethod.INSPECTION
};

// 从 scheduleText 中提取地点信息的辅助函数
const extractLocationFromScheduleText = (text: string): string => {
  // 清理文本
  const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  
  // 常见的地点格式匹配
  const patterns = [
    // 校区+教室格式，如"长安校区 教东B1-104"
    /(长安校区|翠华校区|雁塔校区|未央校区|沣东校区|草堂校区|友谊校区|太白校区|曲江校区)\s*([^\s,;]+)/,
    // 仅校区名后紧跟内容
    /(长安|翠华|雁塔|未央|沣东|草堂|友谊|太白|曲江)\s*校区\s*([^\s,;]+)/,
    // 教学楼/实验楼/科研楼等格式
    /(\S+楼)\s*([^\s,;]+)/,
    /(\S+教学楼)\s*([^\s,;]+)/,
    /(\S+实验楼)\s*([^\s,;]+)/,
    // 字母+数字格式，如"A101"、"B2-304"、"教4-301"
    /([ABCEFGSTU教]\s*\d+[-\d]*)/,
    /([一二三四五六七八九十\d]+号?教学楼)\s*([^\s,;]+)/,
    // 教室号格式，如"101室"、"203教室"
    /(\d+室)/,
    /(\d+教室)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        return `${match[1]} ${match[2]}`.trim();
      } else if (match[1]) {
        return match[1].trim();
      }
    }
  }
  
  return '';
};

// 检查课程是否为网课的辅助函数
const isOnlineCourse = (name: string, teacher: string, scheduleText: string): boolean => {
  const onlineKeywords = ['网课', '在线开放课程', '在线', '网络课程', '网络', 'mooc', 'MOOC'];
  const textToCheck = `${name} ${teacher} ${scheduleText}`.toLowerCase();
  return onlineKeywords.some(keyword => textToCheck.includes(keyword));
};

export function parseJwxtHtml(html: string): ParsedData {
  const semesters: ParsedSemester[] = [];
  const courses: ParsedCourse[] = [];

  const semesterRegex = /<tr class="semester_tr"[^>]*data-semester="([^"]+)"[^>]*>[\s\S]*?<td>([^<]+)<\/td>/g;
  let semesterMatch;
  while ((semesterMatch = semesterRegex.exec(html)) !== null) {
    semesters.push({
      name: semesterMatch[2].trim(),
      dataSemester: semesterMatch[1]
    });
  }

  const courseRegex = /<tr class="lessonInfo"[^>]*data-semester="([^"]+)"[^>]*>[\s\S]*?<td class="courseInfo"[^>]*data-course="([^"]+)"[^>]*>[\s\S]*?<p class="showSchedules">([^<]+)<\/p>[\s\S]*?<p>([^<]+)<i[\s\S]*?学分\(([\d.]+)\)[\s\S]*?授课教师：([^<]+)<\/p>[\s\S]*?<td>([^<]*)<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>/g;
  
  let courseMatch;
  let courseCount = 0;
  let coursesWithLocation = 0;
  let skippedOnlineCourses = 0;
  
  while ((courseMatch = courseRegex.exec(html)) !== null) {
    const dataSemester = courseMatch[1];
    const courseFullName = courseMatch[2];
    const courseName = courseMatch[3].trim();
    const courseCode = courseFullName.match(/\[([^\]]+)\]/)?.[1] || '';
    const credits = parseFloat(courseMatch[5]);
    let teacher = courseMatch[6].trim();
    // 截取老师数量到前15人
    const separators = ['、', '，', ','];
    let teachers: string[] = [];
    
    for (const sep of separators) {
      if (teacher.includes(sep)) {
        teachers = teacher.split(sep).map((t) => t.trim()).filter((t) => t);
        break;
      }
    }
    
    if (teachers.length > 15) {
      teacher = teachers.slice(0, 15).join('、') + ' 等';
    }
    
    // 先尝试从单独的 td 元素获取地点
    let location = courseMatch[7] ? courseMatch[7].trim() : '';
    const scheduleText = courseMatch[8];
    
    // 如果从 td 元素没找到地点，尝试从 scheduleText 中提取
    if (!location || location === '') {
      location = extractLocationFromScheduleText(scheduleText);
    }
    
    if (location && location.trim() !== '') {
      coursesWithLocation++;
    }
    courseCount++;
    
    // 检查是否为网课，如果是则跳过
    if (isOnlineCourse(courseName, teacher, scheduleText)) {
      console.log('跳过在线课程:', courseName);
      skippedOnlineCourses++;
      continue;
    }

    const assessmentMatch = html.slice(courseMatch.index, courseMatch.index + 1000).match(/(考试|考察)/);
    const assessmentMethod = assessmentMatch ? (ASSESSMENT_MAP[assessmentMatch[1]] || AssessmentMethod.EXAM) : AssessmentMethod.EXAM;

    courses.push({
      name: courseName,
      code: courseCode,
      credits,
      teacher,
      assessmentMethod,
      scheduleText,
      location,
      dataSemester
    });
  }

  // 输出有用的调试信息
  console.log(`=== 课程解析完成 ===`);
  console.log(`- 找到课程总数: ${courseCount}`);
  console.log(`- 跳过在线课程数: ${skippedOnlineCourses}`);
  console.log(`- 包含地点的课程数: ${coursesWithLocation}`);
  console.log(`- 提取到的学期数: ${semesters.length}`);
  
  // 输出前3门课程的详细信息作为示例
  if (courses.length > 0) {
    console.log(`- 前3门课程示例:`);
    courses.slice(0, 3).forEach((course, index) => {
      console.log(`  [${index + 1}] ${course.name}`);
      console.log(`    - 地点: ${course.location || '(无)'}`);
      console.log(`    - scheduleText: ${course.scheduleText.substring(0, 50)}...`);
    });
  }

  return { semesters, courses };
}

// 新增函数：用于处理从JwxtWebView传来的原始数据，补充从scheduleText提取地点的逻辑
export function enhanceExtractedData(rawData: any): ParsedData {
  const { semesters, courses } = rawData;
  const enhancedCourses: ParsedCourse[] = [];
  let coursesWithLocation = 0;
  let skippedOnlineCourses = 0;
  
  for (const course of courses) {
    let location = course.location || '';
    let teacher = course.teacher || '';
    const courseName = course.name || '';
    const scheduleText = course.scheduleText || '';
    
    // 检查是否为网课，如果是则跳过
    if (isOnlineCourse(courseName, teacher, scheduleText)) {
      console.log('跳过在线课程:', courseName);
      skippedOnlineCourses++;
      continue;
    }
    
    // 如果原始数据没有location，尝试从scheduleText中提取
    if (!location || location === '') {
      location = extractLocationFromScheduleText(scheduleText);
    }
    
    // 截取老师数量到前15人
    const separators = ['、', '，', ','];
    let teachers: string[] = [];
    
    for (const sep of separators) {
      if (teacher.includes(sep)) {
        teachers = teacher.split(sep).map((t) => t.trim()).filter((t) => t);
        break;
      }
    }
    
    if (teachers.length > 15) {
      teacher = teachers.slice(0, 15).join('、') + ' 等';
    }
    
    if (location && location.trim() !== '') {
      coursesWithLocation++;
    }
    
    enhancedCourses.push({
      ...course,
      location,
      teacher
    });
  }
  
  console.log(`=== 数据增强完成 ===`);
  console.log(`- 总课程数: ${courses.length}`);
  console.log(`- 跳过在线课程数: ${skippedOnlineCourses}`);
  console.log(`- 包含地点的课程数: ${coursesWithLocation}`);
  
  return {
    semesters,
    courses: enhancedCourses
  };
}

const chineseNumToArabic = (chineseNum: string): number => {
  const chineseNums: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
    '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
  };
  return chineseNums[chineseNum] || 0;
};

// 分割包含多个周数范围的字符串，如 "1~2,5~8周 周二 7-8节"
const splitByWeekRanges = (text: string): string[] => {
  // 简单的策略：用逗号分割，然后确保每个分段都包含完整的时间信息
  // 首先找到所有星期几的位置
  const dayPattern = /(周一|周二|周三|周四|周五|周六|周日)/g;
  const dayMatches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = dayPattern.exec(text)) !== null) {
    dayMatches.push(match);
  }
  
  if (dayMatches.length === 0) {
    return [text];
  }
  
  // 如果只有一个星期几，但有多个逗号，说明是同一个时间有多个周数范围
  if (dayMatches.length === 1) {
    const dayPos = dayMatches[0].index;
    const beforeDay = text.slice(0, dayPos).trim();
    const afterDay = text.slice(dayPos).trim();
    
    // 把前面的部分按逗号分割
    const weekParts = beforeDay.split(/[,，]/).map(s => s.trim()).filter(s => s);
    
    // 为每个周数部分加上后面的时间信息
    return weekParts.map(part => `${part} ${afterDay}`.trim());
  }
  
  // 如果有多个星期几，正常分割
  const result: string[] = [];
  for (let i = 0; i < dayMatches.length; i++) {
    const start = i === 0 ? 0 : dayMatches[i - 1].index + dayMatches[i - 1][0].length;
    const end = i === dayMatches.length - 1 ? text.length : dayMatches[i + 1].index;
    
    let segment = text.slice(start, end).trim().replace(/^[,，]\s*/, '');
    if (segment) {
      result.push(segment);
    }
  }
  
  return result.length > 0 ? result : [text];
};

export function parseScheduleText(scheduleText: string): TimeSlot[] {
  const timeSlots: TimeSlot[] = [];
  
  const cleanedText = scheduleText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  
  const scheduleParts: string[] = [];
  
  // 改进分割逻辑：先按分号分割，因为从截图看是用分号分隔不同时段
  const semicolonParts = cleanedText.split(/[;；]/).map(s => s.trim()).filter(s => s);
  
  for (const semicolonPart of semicolonParts) {
    // 处理逗号分隔的多个周数范围，如 "1~2,5~8周"
    const commaParts = splitByWeekRanges(semicolonPart);
    for (const part of commaParts) {
      if (part.trim()) {
        scheduleParts.push(part.trim());
      }
    }
  }
  
  // 如果没有用分号分隔，再尝试用周数范围分割
  if (scheduleParts.length === 0) {
    const commaParts = splitByWeekRanges(cleanedText);
    for (const part of commaParts) {
      if (part.trim()) {
        scheduleParts.push(part.trim());
      }
    }
  }
  
  for (const part of scheduleParts) {
    if (part.includes('网课')) {
      continue;
    }

    let startWeek: number;
    let endWeek: number;

    // 首先尝试匹配范围周数（支持后面跟着括号标记的情况，"周" 字可选）
    // 只匹配1-3位数字，避免匹配到工号等长数字
    let weekRangeMatch = part.match(/(\d{1,3})[~至\-—](\d{1,3})(?:周|\([^)]*\))?/);
    if (weekRangeMatch) {
      startWeek = parseInt(weekRangeMatch[1]);
      endWeek = parseInt(weekRangeMatch[2]);
      // 确保周数在合理范围内
      if (startWeek > 53 || endWeek > 53 || startWeek < 1 || endWeek < 1) {
        continue;
      }
    } else {
      // 如果没有范围周数，尝试匹配单个周数（支持后面跟着括号标记的情况，"周" 字可选）
      const singleWeekMatch = part.match(/(\d{1,3})(?:周|\([^)]*\))?/);
      if (singleWeekMatch) {
        startWeek = parseInt(singleWeekMatch[1]);
        endWeek = parseInt(singleWeekMatch[1]);
        // 确保周数在合理范围内
        if (startWeek > 53 || endWeek > 53 || startWeek < 1 || endWeek < 1) {
          continue;
        }
      } else {
        continue;
      }
    }

    const dayMatch = part.match(/(周一|周二|周三|周四|周五|周六|周日)/);
    if (!dayMatch) {
      continue;
    }

    const dayOfWeek = DAY_MAP[dayMatch[1]];

    let classSections: number[] = [];
    
    let sectionMatch: RegExpMatchArray | null = null;
    
    // 1. 带"第"字的中文数字范围，如"第十一节~第十二节"、"第七节~第八节"
    sectionMatch = part.match(/第(二十|十九|十八|十七|十六|十五|十四|十三|十二|十一|一|二|三|四|五|六|七|八|九|十)[节~至\-—至到]*(?:第)?(二十|十九|十八|十七|十六|十五|十四|十三|十二|十一|一|二|三|四|五|六|七|八|九|十)节/);
    if (sectionMatch) {
      const start = chineseNumToArabic(sectionMatch[1]);
      const end = chineseNumToArabic(sectionMatch[2]);
      classSections = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    
    // 2. 带"第"字的范围格式，如"第11-12节"、"第1~2节"、"第1至2节"
    if (!sectionMatch) {
      sectionMatch = part.match(/第(\d+)[节~至\-—至到](?:第)?(\d+)节/);
      if (sectionMatch) {
        const start = parseInt(sectionMatch[1]);
        const end = parseInt(sectionMatch[2]);
        classSections = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
    }
    
    // 3. 不带"第"字的范围格式，如"11-12节"、"1~2节"
    if (!sectionMatch) {
      sectionMatch = part.match(/(\d+)[节~至\-—至到](\d+)节/);
      if (sectionMatch) {
        const start = parseInt(sectionMatch[1]);
        const end = parseInt(sectionMatch[2]);
        classSections = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
    }
    
    // 4. 带"第"字的逗号分隔格式，如"第11,12节"
    if (!sectionMatch) {
      sectionMatch = part.match(/第((?:\d+,)*\d+)节/);
      if (sectionMatch) {
        classSections = sectionMatch[1].split(',').map(s => parseInt(s));
      }
    }
    
    // 5. 不带"第"字的逗号分隔格式，如"11,12节"
    if (!sectionMatch) {
      sectionMatch = part.match(/((?:\d+,)*\d+)节/);
      if (sectionMatch) {
        classSections = sectionMatch[1].split(',').map(s => parseInt(s));
      }
    }
    
    // 6. 带"第"字的中文数字单节，如"第十一节"、"第一节"
    if (!sectionMatch) {
      sectionMatch = part.match(/第(二十|十九|十八|十七|十六|十五|十四|十三|十二|十一|一|二|三|四|五|六|七|八|九|十)节/);
      if (sectionMatch) {
        classSections = [chineseNumToArabic(sectionMatch[1])];
      }
    }
    
    // 7. 带"第"字的单节格式，如"第11节"
    if (!sectionMatch) {
      sectionMatch = part.match(/第(\d+)节/);
      if (sectionMatch) {
        classSections = [parseInt(sectionMatch[1])];
      }
    }
    
    // 8. 不带"第"字的单节格式，如"11节"
    if (!sectionMatch) {
      sectionMatch = part.match(/(\d+)节/);
      if (sectionMatch) {
        classSections = [parseInt(sectionMatch[1])];
      }
    }
    
    if (!sectionMatch || classSections.length === 0) {
      continue;
    }
    
    const startSection = Math.min(...classSections);
    const endSection = Math.max(...classSections);

    if (startSection === 0 || endSection === 0) {
      continue;
    }

    let repeatRule = RepeatRule.ALL;
    if (part.includes('单周') || part.includes('(单)')) {
      repeatRule = RepeatRule.ODD;
    } else if (part.includes('双周') || part.includes('(双)')) {
      repeatRule = RepeatRule.EVEN;
    }

    timeSlots.push({
      weekRange: `${startWeek}-${endWeek}`,
      repeatRule,
      dayOfWeek,
      classSections
    });
  }

  // 智能合并时间段：合并连续或重叠的，不合并不连续的
  console.log('开始合并前的时间段:', timeSlots);
  
  // 按 dayOfWeek 和 classSections 分组
  const groupedSlots = new Map<string, TimeSlot[]>();
  
  for (const slot of timeSlots) {
    const sectionsKey = [...slot.classSections].sort((a, b) => a - b).join(',');
    const groupKey = `${slot.dayOfWeek}-${sectionsKey}`;
    
    if (!groupedSlots.has(groupKey)) {
      groupedSlots.set(groupKey, []);
    }
    groupedSlots.get(groupKey)!.push(slot);
  }
  
  const finalTimeSlots: TimeSlot[] = [];
  
  // 对每个组进行智能合并
  for (const [, slots] of groupedSlots) {
    // 解析所有周数范围
    const ranges: { start: number; end: number; slot: TimeSlot }[] = slots.map(slot => {
      const [start, end] = slot.weekRange.split('-').map(Number);
      return { start, end, slot };
    });
    
    // 按开始周数排序
    ranges.sort((a, b) => a.start - b.start);
    
    // 合并重叠或连续的范围
    const mergedRanges: typeof ranges = [];
    for (const range of ranges) {
      if (mergedRanges.length === 0) {
        mergedRanges.push(range);
      } else {
        const last = mergedRanges[mergedRanges.length - 1];
        // 检查是否重叠或连续（新的开始 <= 上一个的结束 + 1）
        if (range.start <= last.end + 1) {
          // 合并
          const mergedStart = Math.min(last.start, range.start);
          const mergedEnd = Math.max(last.end, range.end);
          mergedRanges[mergedRanges.length - 1] = {
            start: mergedStart,
            end: mergedEnd,
            slot: {
              ...last.slot,
              weekRange: `${mergedStart}-${mergedEnd}`
            }
          };
          console.log('合并时间段:', last.slot.weekRange, '和', range.slot.weekRange, '->', `${mergedStart}-${mergedEnd}`);
        } else {
          // 不连续，添加为新的
          mergedRanges.push(range);
        }
      }
    }
    
    // 添加合并后的时间段
    for (const merged of mergedRanges) {
      finalTimeSlots.push(merged.slot);
    }
  }
  
  console.log('合并后的时间段:', finalTimeSlots);
  
  if (finalTimeSlots.length === 0) {
    finalTimeSlots.push({
      weekRange: '1-16',
      repeatRule: RepeatRule.ALL,
      dayOfWeek: 1,
      classSections: [1]
    });
  }

  return finalTimeSlots;
}

export function calculateMaxWeekFromCourses(courses: ParsedCourse[]): number {
  let maxWeek = 0;
  
  for (const course of courses) {
    const timeSlots = parseScheduleText(course.scheduleText);
    for (const slot of timeSlots) {
      const weekEndMatch = slot.weekRange.match(/-([0-9]+)/);
      if (weekEndMatch) {
        const endWeek = parseInt(weekEndMatch[1]);
        if (endWeek > maxWeek) {
          maxWeek = endWeek;
        }
      }
    }
  }
  
  return maxWeek > 0 ? maxWeek : 20;
}

export function calculateMaxSectionFromCourses(courses: ParsedCourse[]): number {
  let maxSection = 0;
  
  for (const course of courses) {
    const timeSlots = parseScheduleText(course.scheduleText);
    for (const slot of timeSlots) {
      if (slot.classSections && slot.classSections.length > 0) {
        const sectionMax = Math.max(...slot.classSections);
        if (sectionMax > maxSection) {
          maxSection = sectionMax;
        }
      }
    }
  }
  
  return maxSection > 0 ? maxSection : 10;
}

export function convertToCourses(
  parsedCourses: ParsedCourse[], 
  semesterId: string,
  targetDataSemester?: string
): Course[] {
  const courses: Course[] = [];
  
  const filteredCourses = targetDataSemester 
    ? parsedCourses.filter(c => c.dataSemester === targetDataSemester)
    : parsedCourses;

  const colors = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#16a085', '#27ae60'
  ];

  let colorIndex = 0;

  for (const parsed of filteredCourses) {
    const timeSlots = parseScheduleText(parsed.scheduleText);
    
    if (timeSlots.length === 0) {
      continue;
    }

    courses.push({
      name: parsed.name,
      semesterId,
      timeSlots,
      code: parsed.code,
      location: parsed.location,
      credits: parsed.credits,
      teacher: parsed.teacher,
      assessmentMethod: parsed.assessmentMethod,
      color: colors[colorIndex % colors.length]
    });

    colorIndex++;
  }

  return courses;
}
