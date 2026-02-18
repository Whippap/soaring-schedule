import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course, Semester } from '../types';

const WIDGET_DATA_KEY = '@soaring_schedule:widget_data';

export interface WidgetCourseData {
  courses: Course[];
  currentSemester: Semester | null;
  todayCourses: Course[];
  date: string;
  primaryColor: string;
  allTodayCourses?: Course[];
  relevantCourses?: Course[];
}

export async function saveWidgetData(data: WidgetCourseData) {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存 Widget 数据失败:', error);
  }
}

export async function getWidgetData(): Promise<WidgetCourseData | null> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('获取 Widget 数据失败:', error);
    return null;
  }
}
