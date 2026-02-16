import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import * as DocumentPicker from 'react-native-document-picker';
import Share from 'react-native-share';
import { Platform } from 'react-native';

// 存储键名
const STORAGE_KEYS = {
  COURSES: 'soaring-schedule-courses',
  TASKS: 'soaring-schedule-tasks',
  SETTINGS: 'soaring-schedule-settings'
};

// 备份数据结构
interface BackupData {
  version: string;
  timestamp: string;
  data: {
    courses: any[];
    tasks: any[];
    settings: any;
  };
}

/**
 * 导出数据为JSON文件
 */
export const exportData = async (): Promise<void> => {
  try {
    // 读取所有数据
    const courses = await AsyncStorage.getItem(STORAGE_KEYS.COURSES);
    const tasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);

    // 构建备份数据
    const backupData: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        courses: courses ? JSON.parse(courses) : [],
        tasks: tasks ? JSON.parse(tasks) : [],
        settings: settings ? JSON.parse(settings) : {}
      }
    };

    // 转换为JSON字符串
    const jsonString = JSON.stringify(backupData, null, 2);

    // 创建备份文件
    const fileName = `soaring-schedule-backup-${new Date().toISOString().split('T')[0]}.json`;
    const filePath = Platform.OS === 'ios' 
      ? `${RNFS.DocumentDirectoryPath}/${fileName}` 
      : `${RNFS.ExternalDirectoryPath}/${fileName}`;

    // 写入文件
    await RNFS.writeFile(filePath, jsonString, 'utf8');

    // 分享文件
    const shareOptions = {
      title: '课程表备份',
      url: `file://${filePath}`,
      type: 'application/json'
    };

    await Share.open(shareOptions);
  } catch (error) {
    console.error('导出数据失败:', error);
    throw error;
  }
};

/**
 * 导入数据从JSON文件
 */
export const importData = async (): Promise<boolean> => {
  try {
    // 选择文件
    const result = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.allFiles],
      copyTo: 'cachesDirectory'
    });

    // 读取文件内容
    const jsonString = await RNFS.readFile(result.uri, 'utf8');
    const backupData: BackupData = JSON.parse(jsonString);

    // 验证备份数据
    if (!backupData.version || !backupData.data) {
      throw new Error('无效的备份文件');
    }

    // 写入数据
    if (backupData.data.courses) {
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(backupData.data.courses));
    }
    if (backupData.data.tasks) {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(backupData.data.tasks));
    }
    if (backupData.data.settings) {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backupData.data.settings));
    }

    return true;
  } catch (error) {
    console.error('导入数据失败:', error);
    throw error;
  }
};

/**
 * 检查是否有数据
 */
export const hasData = async (): Promise<boolean> => {
  try {
    const courses = await AsyncStorage.getItem(STORAGE_KEYS.COURSES);
    const tasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    return !!(courses || tasks);
  } catch (error) {
    console.error('检查数据失败:', error);
    return false;
  }
};
