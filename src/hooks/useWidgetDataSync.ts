import { useCallback, useEffect, useRef } from 'react';
import { updateCourseWidget } from '../../widgets/widget-task-handler';
import { useCourseStore } from '../stores/courseStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Course, SectionTime, Semester } from '../types';
import { saveWidgetData, WidgetCourseData } from '../utils/widgetData';

interface CourseWithTime extends Course {
  startTime: Date;
  endTime: Date;
  timeSlot: {
    start: string;
    end: string;
  };
  classSections: number[];
}

export function useWidgetDataSync() {
  const { courses } = useCourseStore();
  const { getCurrentSemester, primaryColor } = useSettingsStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isCurrentDateInSemester = useCallback((date: Date, semester: Semester): boolean => {
    if (semester.id === 'default') return true;
    const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = semester.endDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    const displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return displayDate >= startDate && displayDate <= endDate;
  }, []);

  const getAllCourseTimePoints = useCallback((
    coursesWithTime: CourseWithTime[]
  ): Date[] => {
    const timePoints: Date[] = [];
    coursesWithTime.forEach(course => {
      timePoints.push(new Date(course.startTime));
      timePoints.push(new Date(course.endTime));
    });
    return timePoints.sort((a, b) => a.getTime() - b.getTime());
  }, []);

  const scheduleNextUpdate = useCallback((
    timePoints: Date[],
    currentTime: Date
  ) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current as NodeJS.Timeout);
      timerRef.current = null;
    }

    const nextTimePoint = timePoints.find(time => time > currentTime);
    
    if (nextTimePoint) {
      const delay = nextTimePoint.getTime() - currentTime.getTime();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        timerRef.current = setTimeout(() => {
          updateCourseWidget();
        }, delay) as unknown as NodeJS.Timeout;
      }
    }
  }, []);

  const getWeekNumberForDate = useCallback((date: Date, semester: Semester): number => {
    if (semester.id === 'default') return 1;

    const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = displayDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);

    return Math.min(weekNum, semester.weekCount);
  }, []);

  const isWeekInRange = useCallback((weekNum: number, weekRange: string): boolean => {
    try {
      const [start, end] = weekRange.split('-').map(Number);
      return weekNum >= start && weekNum <= end;
    } catch {
      return false;
    }
  }, []);

  const parseTime = useCallback((timeStr: string, date: Date): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }, []);

  const getTimeSlotForSection = useCallback((
    classSections: number[],
    sectionTimes: SectionTime[]
  ): { start: string; end: string } => {
    const sortedSections = [...classSections].sort((a, b) => a - b);
    const firstSection = sortedSections[0];
    const lastSection = sortedSections[sortedSections.length - 1];
    
    return {
      start: sectionTimes[firstSection - 1]?.start || '08:00',
      end: sectionTimes[lastSection - 1]?.end || '20:40'
    };
  }, []);

  const getTodayCoursesWithTime = useCallback((
    courses: Course[],
    currentSemester: Semester
  ): CourseWithTime[] => {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const weekNum = getWeekNumberForDate(today, currentSemester);

    const coursesWithTime: CourseWithTime[] = [];

    courses.forEach(course => {
      if (course.semesterId !== currentSemester.id) return;

      course.timeSlots.forEach(slot => {
        if (slot.dayOfWeek !== dayOfWeek) return;
        if (!isWeekInRange(weekNum, slot.weekRange)) return;

        const timeSlot = getTimeSlotForSection(slot.classSections, currentSemester.sectionTimes);
        const startTime = parseTime(timeSlot.start, today);
        const endTime = parseTime(timeSlot.end, today);

        coursesWithTime.push({
          ...course,
          startTime,
          endTime,
          timeSlot,
          classSections: slot.classSections
        });
      });
    });

    return coursesWithTime;
  }, [getWeekNumberForDate, isWeekInRange, getTimeSlotForSection, parseTime]);

  const getRelevantCourses = useCallback((
    coursesWithTime: CourseWithTime[],
    currentTime: Date
  ): CourseWithTime[] => {
    const now = currentTime;

    const ongoingOrFutureCourses = coursesWithTime.filter(course => course.endTime > now);

    ongoingOrFutureCourses.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return ongoingOrFutureCourses;
  }, []);

  useEffect(() => {
    const currentDate = new Date();
    const currentSemester = getCurrentSemester(currentDate);
    const todayCoursesWithTime = getTodayCoursesWithTime(courses, currentSemester);
    const relevantCourses = getRelevantCourses(todayCoursesWithTime, currentDate);

    const serializeCourse = (course: CourseWithTime) => ({
      ...course,
      startTime: course.startTime.toISOString(),
      endTime: course.endTime.toISOString()
    });

    const widgetData: WidgetCourseData = {
      courses,
      currentSemester,
      todayCourses: relevantCourses.map(serializeCourse),
      date: currentDate.toISOString(),
      primaryColor,
      allTodayCourses: todayCoursesWithTime.map(serializeCourse),
      relevantCourses: relevantCourses.map(serializeCourse)
    };

    saveWidgetData(widgetData);
    updateCourseWidget();

    if (currentSemester && isCurrentDateInSemester(currentDate, currentSemester)) {
      const timePoints = getAllCourseTimePoints(todayCoursesWithTime);
      scheduleNextUpdate(timePoints, currentDate);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [courses, getCurrentSemester, getTodayCoursesWithTime, getRelevantCourses, primaryColor, isCurrentDateInSemester, getAllCourseTimePoints, scheduleNextUpdate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
