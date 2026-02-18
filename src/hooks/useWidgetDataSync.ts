import { useEffect, useCallback } from 'react';
import { Course, Semester, SectionTime } from '../types';
import { useCourseStore } from '../stores/courseStore';
import { useSettingsStore } from '../stores/settingsStore';
import { saveWidgetData, WidgetCourseData } from '../utils/widgetData';
import { updateCourseWidget } from '../../widgets/widget-task-handler';

interface CourseWithTime extends Course {
  startTime: Date;
  endTime: Date;
  timeSlot: {
    start: string;
    end: string;
  };
}

export function useWidgetDataSync() {
  const { courses } = useCourseStore();
  const { getCurrentSemester, primaryColor } = useSettingsStore();

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
          timeSlot
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

    const widgetData: WidgetCourseData = {
      courses,
      currentSemester,
      todayCourses: relevantCourses as Course[],
      date: currentDate.toISOString(),
      primaryColor,
      allTodayCourses: todayCoursesWithTime as Course[],
      relevantCourses: relevantCourses as Course[]
    };

    saveWidgetData(widgetData);
    updateCourseWidget();
  }, [courses, getCurrentSemester, getTodayCoursesWithTime, getRelevantCourses, primaryColor]);
}
