import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { Course } from '../types';

interface CourseState {
  courses: Course[];
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (index: number, course: Course) => Promise<void>;
  deleteCourse: (index: number) => Promise<void>;
  clearAllCourses: () => Promise<void>;
  loadData: () => Promise<void>;
  adjustCoursesForSemester: (semesterId: string, maxWeek: number, maxSection: number) => Promise<void>;
}

const COURSES_STORAGE_KEY = 'soaring-schedule-courses';

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  addCourse: async (course) => {
    const newCourses = [...useCourseStore.getState().courses, course];
    set({ courses: newCourses });
    await AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(newCourses));
  },
  updateCourse: async (index, course) => {
    const newCourses = [...useCourseStore.getState().courses];
    newCourses[index] = course;
    set({ courses: newCourses });
    await AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(newCourses));
  },
  deleteCourse: async (index) => {
    const newCourses = [...useCourseStore.getState().courses];
    newCourses.splice(index, 1);
    set({ courses: newCourses });
    await AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(newCourses));
  },
  clearAllCourses: async () => {
    set({ courses: [] });
    await AsyncStorage.removeItem(COURSES_STORAGE_KEY);
  },
  loadData: async () => {
    try {
      // 加载课程数据
      const storedCourses = await AsyncStorage.getItem(COURSES_STORAGE_KEY);
      if (storedCourses) {
        set({ courses: JSON.parse(storedCourses) });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  },
  adjustCoursesForSemester: async (semesterId: string, maxWeek: number, maxSection: number) => {
    const currentState = useCourseStore.getState();
    const adjustedCourses = currentState.courses.map(course => {
      if (course.semesterId !== semesterId) {
        return course;
      }
      
      const adjustedTimeSlots = course.timeSlots.map(slot => {
        // 调整周数范围
        const [startWeek, endWeek] = slot.weekRange.split('-').map(Number);
        const newEndWeek = Math.min(endWeek, maxWeek);
        const newStartWeek = Math.min(startWeek, newEndWeek);
        
        // 调整课节范围
        const adjustedClassSections = slot.classSections
          .map(section => Math.min(section, maxSection))
          .filter(section => section > 0);
        
        // 如果调整后没有课节了，保留最小的课节
        const finalClassSections = adjustedClassSections.length > 0 
          ? adjustedClassSections 
          : [1];
        
        return {
          ...slot,
          weekRange: `${newStartWeek}-${newEndWeek}`,
          classSections: finalClassSections
        };
      });
      
      return {
        ...course,
        timeSlots: adjustedTimeSlots
      };
    });
    
    set({ courses: adjustedCourses });
    await AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(adjustedCourses));
  }
}));

