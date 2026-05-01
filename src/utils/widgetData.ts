import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course, RepeatRule, SectionTime, Semester } from '../types';

const WIDGET_DATA_KEY = '@soaring_schedule:widget_data';
const COURSES_STORAGE_KEY = 'soaring-schedule-courses';
const SETTINGS_STORAGE_KEY = 'soaring-schedule-settings';

const defaultSectionTimes: SectionTime[] = [
  { start: '08:30', end: '09:15' },
  { start: '09:25', end: '10:10' },
  { start: '10:30', end: '11:15' },
  { start: '11:25', end: '12:10' },
  { start: '12:20', end: '13:05' },
  { start: '13:05', end: '13:50' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '15:55', end: '16:40' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:40', end: '21:25' },
];

export interface WidgetCourse extends Course {
  startTime?: string;
  endTime?: string;
  timeSlot?: {
    start: string;
    end: string;
  };
  classSections?: number[];
}

export interface WidgetDataSnapshot {
  courses: Course[];
  semesters: Semester[];
  currentSemesterId?: string | null;
  primaryColor: string;
}

export interface WidgetCourseData extends WidgetDataSnapshot {
  currentSemester: Semester;
  todayCourses: WidgetCourse[];
  date: string;
  allTodayCourses: WidgetCourse[];
  relevantCourses: WidgetCourse[];
}

interface CourseWithTime extends Course {
  startTime: Date;
  endTime: Date;
  timeSlot: {
    start: string;
    end: string;
  };
  classSections: number[];
}

interface StoredSettingsData {
  semesters?: Semester[];
  currentSemesterId?: string | null;
  primaryColor?: string;
}

function createDefaultSemester(date: Date): Semester {
  const currentYear = date.getFullYear();
  return {
    id: 'default',
    name: '假期',
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    weekCount: 52,
    sectionCount: 13,
    sectionTimes: defaultSectionTimes,
  };
}

function getCurrentSemester(
  semesters: Semester[],
  currentSemesterId: string | null | undefined,
  date: Date
): Semester {
  const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const semesterByDate = semesters.find((semester) => {
    const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const startDayOfWeek = startDate.getDay();

    const weekStart = new Date(startDate);
    if (startDayOfWeek === 0) {
      weekStart.setDate(startDate.getDate() - 6);
    } else if (startDayOfWeek !== 1) {
      weekStart.setDate(startDate.getDate() - (startDayOfWeek - 1));
    }

    const lastDay = new Date(weekStart);
    lastDay.setDate(weekStart.getDate() + semester.weekCount * 7 - 1);

    return currentDate >= weekStart && currentDate <= lastDay;
  });

  if (semesterByDate) {
    return semesterByDate;
  }

  if (currentSemesterId) {
    const manualSemester = semesters.find((semester) => semester.id === currentSemesterId);
    if (manualSemester) {
      return manualSemester;
    }
  }

  return createDefaultSemester(date);
}

function getWeekNumberForDate(date: Date, semester: Semester): number {
  if (semester.id === 'default') return 1;

  const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
  const startDate = new Date(startYear, startMonth - 1, startDay);
  const displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = displayDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);

  return Math.min(weekNum, semester.weekCount);
}

function isWeekInRange(weekNum: number, weekRange: string): boolean {
  const [start, end] = weekRange.split('-').map(Number);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }

  return weekNum >= start && weekNum <= end;
}

function matchesRepeatRule(weekNum: number, repeatRule: RepeatRule | string | undefined): boolean {
  if (!repeatRule || repeatRule === RepeatRule.ALL) {
    return true;
  }

  if (repeatRule === RepeatRule.ODD) {
    return weekNum % 2 === 1;
  }

  if (repeatRule === RepeatRule.EVEN) {
    return weekNum % 2 === 0;
  }

  return true;
}

function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function getTimeSlotForSection(
  classSections: number[],
  sectionTimes: SectionTime[]
): { start: string; end: string } {
  const sortedSections = [...classSections].sort((a, b) => a - b);
  const firstSection = sortedSections[0];
  const lastSection = sortedSections[sortedSections.length - 1];

  return {
    start: sectionTimes[firstSection - 1]?.start || '08:00',
    end: sectionTimes[lastSection - 1]?.end || '20:40',
  };
}

function getTodayCoursesWithTime(
  courses: Course[],
  currentSemester: Semester,
  date: Date
): CourseWithTime[] {
  const dayOfWeek = date.getDay() || 7;
  const weekNum = getWeekNumberForDate(date, currentSemester);
  const coursesWithTime: CourseWithTime[] = [];

  courses.forEach((course) => {
    if (course.semesterId !== currentSemester.id) return;

    course.timeSlots.forEach((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return;
      if (!isWeekInRange(weekNum, slot.weekRange)) return;
      if (!matchesRepeatRule(weekNum, slot.repeatRule)) return;

      const timeSlot = getTimeSlotForSection(slot.classSections, currentSemester.sectionTimes);
      const startTime = parseTime(timeSlot.start, date);
      const endTime = parseTime(timeSlot.end, date);

      coursesWithTime.push({
        ...course,
        startTime,
        endTime,
        timeSlot,
        classSections: slot.classSections,
      });
    });
  });

  return coursesWithTime.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

function serializeCourse(course: CourseWithTime): WidgetCourse {
  return {
    ...course,
    startTime: course.startTime.toISOString(),
    endTime: course.endTime.toISOString(),
  };
}

export function buildWidgetCourseData(
  snapshot: WidgetDataSnapshot,
  now: Date = new Date()
): WidgetCourseData {
  const currentSemester = getCurrentSemester(snapshot.semesters, snapshot.currentSemesterId, now);
  const allTodayCourses = getTodayCoursesWithTime(snapshot.courses, currentSemester, now);
  const relevantCourses = allTodayCourses.filter((course) => course.endTime > now);

  return {
    ...snapshot,
    currentSemester,
    todayCourses: relevantCourses.map(serializeCourse),
    date: now.toISOString(),
    allTodayCourses: allTodayCourses.map(serializeCourse),
    relevantCourses: relevantCourses.map(serializeCourse),
  };
}

function normalizeStoredWidgetData(stored: any): WidgetDataSnapshot | null {
  if (!stored || !Array.isArray(stored.courses)) {
    return null;
  }

  const semesters = Array.isArray(stored.semesters)
    ? stored.semesters
    : stored.currentSemester
      ? [stored.currentSemester]
      : [];

  return {
    courses: stored.courses,
    semesters,
    currentSemesterId: stored.currentSemesterId ?? stored.currentSemester?.id ?? null,
    primaryColor: typeof stored.primaryColor === 'string' ? stored.primaryColor : '#3498db',
  };
}

export async function saveWidgetData(snapshot: WidgetDataSnapshot) {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save widget data:', error);
  }
}

export async function loadWidgetSourceData(): Promise<WidgetDataSnapshot | null> {
  try {
    const [coursesValue, settingsValue] = await AsyncStorage.multiGet([
      COURSES_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
    ]);

    const courses = coursesValue[1] ? JSON.parse(coursesValue[1]) : [];
    const settings: StoredSettingsData = settingsValue[1] ? JSON.parse(settingsValue[1]) : {};

    return {
      courses: Array.isArray(courses) ? courses : [],
      semesters: Array.isArray(settings.semesters) ? settings.semesters : [],
      currentSemesterId: settings.currentSemesterId ?? null,
      primaryColor: settings.primaryColor || '#3498db',
    };
  } catch (error) {
    console.error('Failed to load widget source data:', error);
    return null;
  }
}

export async function getWidgetData(): Promise<WidgetCourseData | null> {
  try {
    const sourceData = await loadWidgetSourceData();
    if (sourceData) {
      await saveWidgetData(sourceData);
      return buildWidgetCourseData(sourceData);
    }

    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (!data) {
      return null;
    }

    const normalizedData = normalizeStoredWidgetData(JSON.parse(data));
    return normalizedData ? buildWidgetCourseData(normalizedData) : null;
  } catch (error) {
    console.error('Failed to get widget data:', error);
    return null;
  }
}
