import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { Semester } from '../types';
import { useCourseStore } from './courseStore';

interface SectionTime {
  start: string;
  end: string;
}

interface SettingsState {
  // 学期设置
  semesters: Semester[];
  currentSemesterId: string | null;
  // 显示设置
  showWeekends: boolean;
  showExpiredCourses: boolean;
  darkMode: boolean;
  // 主题设置
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  // 操作方法
  addSemester: (semester: Omit<Semester, 'id'>) => Promise<void>;
  updateSemester: (id: string, semester: Partial<Semester>) => Promise<void>;
  updateSemesterSectionCount: (id: string, count: number) => Promise<void>;
  updateSemesterSectionTime: (id: string, index: number, time: SectionTime) => Promise<void>;
  deleteSemester: (id: string) => Promise<void>;
  setCurrentSemester: (id: string) => Promise<void>;
  getCurrentSemester: (date?: Date) => Semester;
  updateShowWeekends: (value: boolean) => Promise<void>;
  updateShowExpiredCourses: (value: boolean) => Promise<void>;
  updateDarkMode: (value: boolean) => Promise<void>;
  updatePrimaryColor: (color: string) => Promise<void>;
  updateSecondaryColor: (color: string) => Promise<void>;
  updateAccentColor: (color: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  formatData: () => Promise<void>; // 调试用格式化选项
}

// 默认设置 - 长安校区课程时间
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
  { start: '20:40', end: '21:25' }
];

const SETTINGS_STORAGE_KEY = 'soaring-schedule-settings';

export const useSettingsStore = create<SettingsState>((set) => ({
  // 学期设置
  semesters: [],
  currentSemesterId: null,
  // 显示设置
  showWeekends: true,
  showExpiredCourses: true,
  darkMode: false,
  // 主题设置
  primaryColor: '#3498db',
  secondaryColor: '#2ecc71',
  accentColor: '#f39c12',
  
  // 操作方法
  addSemester: async (semesterData) => {
    const currentState = useSettingsStore.getState();
    const newSemester: Semester = {
      ...semesterData,
      id: Date.now().toString()
    };
    
    // 检查时间重叠
    const hasOverlap = currentState.semesters.some(existing => {
      const existingStart = new Date(existing.startDate);
      const existingEnd = new Date(existing.endDate);
      const newStart = new Date(newSemester.startDate);
      const newEnd = new Date(newSemester.endDate);
      
      return (newStart >= existingStart && newStart <= existingEnd) ||
             (newEnd >= existingStart && newEnd <= existingEnd) ||
             (existingStart >= newStart && existingStart <= newEnd);
    });
    
    if (hasOverlap) {
      throw new Error('学期时间与现有学期存在重叠');
    }
    
    const newSemesters = [...currentState.semesters, newSemester];
    set({ semesters: newSemesters });
    
    // 如果是第一个学期，自动设为当前学期
    if (newSemesters.length === 1) {
      set({ currentSemesterId: newSemester.id });
    }
    
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateSemesterSectionCount: async (id, count) => {
    const currentState = useSettingsStore.getState();
    const semesterIndex = currentState.semesters.findIndex(s => s.id === id);
    
    if (semesterIndex === -1) {
      throw new Error('学期不存在');
    }
    
    const updatedSemester = { ...currentState.semesters[semesterIndex] };
    const newSectionTimes = [...updatedSemester.sectionTimes];
    
    // 调整sectionTimes数组长度以匹配新的节数
    if (count > newSectionTimes.length) {
      // 如果新节数大于当前数组长度，添加默认时间
      const lastTime = newSectionTimes[newSectionTimes.length - 1];
      let currentHour = parseInt(lastTime.start.split(':')[0]);
      let currentMinute = parseInt(lastTime.start.split(':')[1]);
      
      for (let i = newSectionTimes.length; i < count; i++) {
        // 计算开始时间（加10分钟课间休息）
        currentMinute += 10;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
        const start = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // 计算结束时间（45分钟课程）
        currentMinute += 45;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
        const end = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        newSectionTimes.push({ start, end });
      }
    } else if (count < newSectionTimes.length) {
      // 如果新节数小于当前数组长度，截断数组
      newSectionTimes.splice(count);
    }
    
    updatedSemester.sectionCount = count;
    updatedSemester.sectionTimes = newSectionTimes;
    
    const newSemesters = [...currentState.semesters];
    newSemesters[semesterIndex] = updatedSemester;
    set({ semesters: newSemesters });
    
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateSemesterSectionTime: async (id, index, time) => {
    const currentState = useSettingsStore.getState();
    const semesterIndex = currentState.semesters.findIndex(s => s.id === id);
    
    if (semesterIndex === -1) {
      throw new Error('学期不存在');
    }
    
    const updatedSemester = { ...currentState.semesters[semesterIndex] };
    const newSectionTimes = [...updatedSemester.sectionTimes];
    newSectionTimes[index] = time;
    updatedSemester.sectionTimes = newSectionTimes;
    
    const newSemesters = [...currentState.semesters];
    newSemesters[semesterIndex] = updatedSemester;
    set({ semesters: newSemesters });
    
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateSemester: async (id, semesterData) => {
    const currentState = useSettingsStore.getState();
    const semesterIndex = currentState.semesters.findIndex(s => s.id === id);
    
    if (semesterIndex === -1) {
      throw new Error('学期不存在');
    }
    
    const oldSemester = currentState.semesters[semesterIndex];
    const updatedSemester = {
      ...oldSemester,
      ...semesterData
    };
    
    // 检查时间重叠
    const hasOverlap = currentState.semesters.some((existing, index) => {
      if (index === semesterIndex) return false;
      
      const existingStart = new Date(existing.startDate);
      const existingEnd = new Date(existing.endDate);
      const updatedStart = new Date(updatedSemester.startDate);
      const updatedEnd = new Date(updatedSemester.endDate);
      
      return (updatedStart >= existingStart && updatedStart <= existingEnd) ||
             (updatedEnd >= existingStart && updatedEnd <= existingEnd) ||
             (existingStart >= updatedStart && existingStart <= updatedEnd);
    });
    
    if (hasOverlap) {
      throw new Error('学期时间与现有学期存在重叠');
    }
    
    const newSemesters = [...currentState.semesters];
    newSemesters[semesterIndex] = updatedSemester;
    set({ semesters: newSemesters });
    
    // 如果周数或节数减少，调整该学期下的课程
    if (updatedSemester.weekCount < oldSemester.weekCount || 
        updatedSemester.sectionCount < oldSemester.sectionCount) {
      await useCourseStore.getState().adjustCoursesForSemester(
        id, 
        updatedSemester.weekCount, 
        updatedSemester.sectionCount
      );
    }
    
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  deleteSemester: async (id) => {
    const currentState = useSettingsStore.getState();
    const newSemesters = currentState.semesters.filter(s => s.id !== id);
    
    let newCurrentSemesterId = currentState.currentSemesterId;
    if (id === currentState.currentSemesterId) {
      newCurrentSemesterId = newSemesters.length > 0 ? newSemesters[0].id : null;
    }
    
    set({ 
      semesters: newSemesters,
      currentSemesterId: newCurrentSemesterId
    });
    
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  setCurrentSemester: async (id) => {
    set({ currentSemesterId: id });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  getCurrentSemester: (date?: Date): Semester => {
    try {
      const currentState = useSettingsStore.getState();
      const targetDate = date || new Date();
      // 设置为当天的开始时间，避免时间部分影响比较
      const currentDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      
      // 查找包含当前日期的学期
      const currentSemester = currentState.semesters.find((semester: Semester) => {
        // 解析开始日期
        const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        
        // 计算学期开始是星期几 (0=周日, 1=周一, ..., 6=周六)
        const startDayOfWeek = startDate.getDay();
        
        // 找到学期开始的那一周的周一
        let weekStart = new Date(startDate);
        if (startDayOfWeek === 0) {
          // 如果开始日期是周日，上周一就是学期开始前6天
          weekStart.setDate(startDate.getDate() - 6);
        } else if (startDayOfWeek !== 1) {
          // 如果不是周一，减去(星期几-1)天得到周一
          weekStart.setDate(startDate.getDate() - (startDayOfWeek - 1));
        }
        
        // 计算学期最后一天（基于周数）
        const lastDay = new Date(weekStart);
        lastDay.setDate(weekStart.getDate() + semester.weekCount * 7 - 1);
        
        // 检查：从学期第一周的周一到最后一周的周日
        return currentDate >= weekStart && currentDate <= lastDay;
      });
      
      if (currentSemester) {
        return currentSemester;
      }
    } catch (error) {
      console.error('Error getting current semester:', error);
    }
    
    // 返回假期
    const targetDate = date || new Date();
    const currentYear = targetDate.getFullYear();
    return {
      id: 'default',
      name: '假期',
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      weekCount: 52,
      sectionCount: 13,
      sectionTimes: defaultSectionTimes
    };
  },
  
  updateShowWeekends: async (value) => {
    set({ showWeekends: value });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateShowExpiredCourses: async (value) => {
    set({ showExpiredCourses: value });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateDarkMode: async (value) => {
    set({ darkMode: value });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updatePrimaryColor: async (color) => {
    set({ primaryColor: color });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateSecondaryColor: async (color) => {
    set({ secondaryColor: color });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  updateAccentColor: async (color) => {
    set({ accentColor: color });
    const settings = useSettingsStore.getState();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },
  
  loadSettings: async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        set(parsedSettings);
        
        // 加载后自动判断当前学期
        const currentState = useSettingsStore.getState();
        const currentDate = new Date();
        
        // 使用 getCurrentSemester 函数判断
        const currentSemester = currentState.getCurrentSemester(currentDate);
        if (currentSemester && currentSemester.id !== 'default') {
          set({ currentSemesterId: currentSemester.id });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
  
  resetSettings: async () => {
    set({
      semesters: [],
      currentSemesterId: null,
      showWeekends: true,
      showExpiredCourses: true,
      darkMode: false,
      primaryColor: '#3498db',
      secondaryColor: '#2ecc71',
      accentColor: '#f39c12'
    });
    await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
  },
  
  formatData: async () => {
    // 恢复所有到默认选项，并且删除所有学期和课程
    set({
      semesters: [],
      currentSemesterId: null,
      showWeekends: true,
      showExpiredCourses: true,
      darkMode: false,
      primaryColor: '#3498db',
      secondaryColor: '#2ecc71',
      accentColor: '#f39c12'
    });
    
    // 清空课程数据（同时更新内存状态和存储）
    await useCourseStore.getState().clearAllCourses();
    
    // 删除所有存储的数据
    await AsyncStorage.multiRemove([
      SETTINGS_STORAGE_KEY
    ]);
  }
}));
