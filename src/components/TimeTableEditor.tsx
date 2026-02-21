import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

// 友谊校区时间（5月1日-9月30日）- 夏季
const youyiTimesSummer = [
  { start: '08:00', end: '08:50' },
  { start: '09:00', end: '09:50' },
  { start: '10:10', end: '11:00' },
  { start: '11:10', end: '12:00' },
  { start: '12:20', end: '13:05' },
  { start: '13:05', end: '13:50' },
  { start: '14:30', end: '15:20' },
  { start: '15:30', end: '16:20' },
  { start: '16:40', end: '17:30' },
  { start: '17:40', end: '18:30' },
  { start: '19:30', end: '20:20' },
  { start: '20:30', end: '21:20' }
];

// 友谊校区时间（10月1日-4月30日）- 冬季
const youyiTimesWinter = [
  { start: '08:00', end: '08:50' },
  { start: '09:00', end: '09:50' },
  { start: '10:10', end: '11:00' },
  { start: '11:10', end: '12:00' },
  { start: '12:20', end: '13:05' },
  { start: '13:05', end: '13:50' },
  { start: '14:00', end: '14:50' },
  { start: '15:00', end: '15:50' },
  { start: '16:10', end: '17:00' },
  { start: '17:10', end: '18:00' },
  { start: '19:00', end: '19:50' },
  { start: '20:00', end: '20:50' }
];

// 长安校区时间
const changAnTimes = [
  { start: '08:30', end: '09:15' },
  { start: '09:25', end: '10:10' },
  { start: '10:30', end: '11:15' },
  { start: '11:25', end: '12:10' },
  { start: '12:20', end: '13:05' },
  { start: '13:05', end: '13:50' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '16:00', end: '16:45' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:40', end: '21:25' }
];

interface TimeTableEditorProps {
  visible: boolean;
  onClose: () => void;
  semesterId?: string;
  onSave?: (sectionTimes: any[]) => void;
  initialSectionTimes?: any[];
  sectionCount?: number;
}

const TimeTableEditor: React.FC<TimeTableEditorProps> = ({ 
  visible, 
  onClose, 
  semesterId, 
  onSave, 
  initialSectionTimes = [], 
  sectionCount = 10 
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const { semesters, updateSemesterSectionTime, loadSettings } = useSettingsStore();
  
  // 获取当前学期的信息
  const getCurrentSemester = useCallback(() => {
    return semesters.find(s => s.id === semesterId) || semesters[0];
  }, [semesters, semesterId]);
  
  const getSectionCountFromSemester = useCallback(() => {
    const semester = getCurrentSemester();
    return semester?.sectionCount || 10;
  }, [getCurrentSemester]);
  
  const getSectionTimesFromSemester = useCallback(() => {
    const semester = getCurrentSemester();
    return semester?.sectionTimes || [];
  }, [getCurrentSemester]);
  
  const getActualSectionCount = useCallback(() => {
    return sectionCount || getSectionCountFromSemester();
  }, [sectionCount, getSectionCountFromSemester]);
  
  const getActualSectionTimes = useCallback(() => {
    return initialSectionTimes.length > 0 ? initialSectionTimes : getSectionTimesFromSemester();
  }, [initialSectionTimes, getSectionTimesFromSemester]);
  
  // 从初始时间设置中推断每节课时长相同的设置和单节课时长
  const inferDurationSettings = (sectionTimes: any[]) => {
    if (sectionTimes.length < 2) {
      return { isSameDuration: true, singleDuration: 45 };
    }
    
    // 计算每节课的时长
    const durations = sectionTimes.map((time, index) => {
      const start = time.start.split(':').map(Number);
      const end = time.end.split(':').map(Number);
      return (end[0] - start[0]) * 60 + (end[1] - start[1]);
    });
    
    // 检查所有课的时长是否相同
    const firstDuration = durations[0];
    const isSame = durations.every(duration => duration === firstDuration);
    
    return {
      isSameDuration: isSame,
      singleDuration: isSame ? firstDuration : 45
    };
  };

  const initialDurationSettings = inferDurationSettings(getActualSectionTimes());
  const [isSameDuration, setIsSameDuration] = useState(initialDurationSettings.isSameDuration);
  const [singleDuration, setSingleDuration] = useState(initialDurationSettings.singleDuration);
  const [localSectionTimes, setLocalSectionTimes] = useState(getActualSectionTimes());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      loadSettings();
      // 当模态框打开时，加载正确的时间设置
      let sectionTimes = getActualSectionTimes();
      
      // 如果没有课程时间设置，根据 sectionCount 生成默认的长安校区课程时间
      if (sectionTimes.length === 0) {
        
        sectionTimes = changAnTimes.slice(0, getActualSectionCount());
        
        // 如果需要更多时间，根据最后一个时间生成
        if (getActualSectionCount() > changAnTimes.length) {
          const lastTime = changAnTimes[changAnTimes.length - 1];
          // 解析最后一个时间
          const [lastStartHour, lastStartMin] = lastTime.start.split(':').map(Number);
          const [lastEndHour, lastEndMin] = lastTime.end.split(':').map(Number);
          
          // 计算课程时长和课间休息
          const lastStartTotal = lastStartHour * 60 + lastStartMin;
          const lastEndTotal = lastEndHour * 60 + lastEndMin;
          const duration = lastEndTotal - lastStartTotal;
          
          // 从 changAnTimes 的第2个开始计算间隔
          let interval = 10;
          if (changAnTimes.length >= 2) {
            const [prevEndHour, prevEndMin] = changAnTimes[changAnTimes.length - 2].end.split(':').map(Number);
            const [currStartHour, currStartMin] = lastTime.start.split(':').map(Number);
            const prevEndTotal = prevEndHour * 60 + prevEndMin;
            const currStartTotal = currStartHour * 60 + currStartMin;
            interval = currStartTotal - prevEndTotal;
          }
          
          let currentStartTotal = lastEndTotal + interval;
          
          for (let i = changAnTimes.length; i < getActualSectionCount(); i++) {
            const startHour = Math.floor(currentStartTotal / 60);
            const startMin = currentStartTotal % 60;
            const endTotal = currentStartTotal + duration;
            const endHour = Math.floor(endTotal / 60);
            const endMin = endTotal % 60;
            
            sectionTimes.push({
              start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
              end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
            });
            
            currentStartTotal = endTotal + interval;
          }
        }
      }
      
      setLocalSectionTimes(sectionTimes);
      
      // 重新推断时长设置
      const durationSettings = inferDurationSettings(sectionTimes);
      setIsSameDuration(durationSettings.isSameDuration);
      setSingleDuration(durationSettings.singleDuration);
    }
  }, [visible, loadSettings, initialSectionTimes, getActualSectionCount, getActualSectionTimes]);

  // 当 sectionCount 变化时，调整课程时间列表
  useEffect(() => {
    if (visible) {
      const currentCount = localSectionTimes.length;
      const targetCount = getActualSectionCount();
      
      if (currentCount !== targetCount) {
        let newSectionTimes = [...localSectionTimes];
        
        if (currentCount < targetCount) {
          // 需要添加新的课程时间 - 使用长安校区的时间规律
          
          // 对于 i 在 changAnTimes 范围内的，直接使用长安校区的时间
          for (let i = currentCount; i < targetCount; i++) {
            if (i < changAnTimes.length) {
              newSectionTimes.push(changAnTimes[i]);
            } else {
              // 对于超过长安校区时间数量的，根据规律生成
              const lastTime = changAnTimes[changAnTimes.length - 1];
              const [lastStartHour, lastStartMin] = lastTime.start.split(':').map(Number);
              const [lastEndHour, lastEndMin] = lastTime.end.split(':').map(Number);
              
              // 计算课程时长和课间休息
              const lastStartTotal = lastStartHour * 60 + lastStartMin;
              const lastEndTotal = lastEndHour * 60 + lastEndMin;
              const duration = lastEndTotal - lastStartTotal;
              
              // 计算间隔
              const [prevEndHour, prevEndMin] = changAnTimes[changAnTimes.length - 2].end.split(':').map(Number);
              const [currStartHour, currStartMin] = lastTime.start.split(':').map(Number);
              const prevEndTotal = prevEndHour * 60 + prevEndMin;
              const currStartTotal = currStartHour * 60 + currStartMin;
              const interval = currStartTotal - prevEndTotal;
              
              // 计算当前要添加的课与最后一个 changAn 课之间的偏移
              const offset = i - changAnTimes.length + 1;
              const currentStartTotal = lastEndTotal + interval * offset + duration * (offset - 1);
              
              const startHour = Math.floor(currentStartTotal / 60);
              const startMin = currentStartTotal % 60;
              const endTotal = currentStartTotal + duration;
              const endHour = Math.floor(endTotal / 60);
              const endMin = endTotal % 60;
              
              newSectionTimes.push({
                start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
                end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
              });
            }
          }
        } else {
          // 需要删除多余的课程时间
          newSectionTimes = newSectionTimes.slice(0, targetCount);
        }
        
        setLocalSectionTimes(newSectionTimes);
      }
    }
  }, [visible, sectionCount, localSectionTimes, getActualSectionCount]);

  // 检查时间是否有重叠
  const checkTimeOverlap = (times: any[]): { hasOverlap: boolean, message: string } => {
    // 生成实际使用的时间列表，考虑"每节课时长相同"的情况
    const actualTimes = times.map((time, index) => {
      const start = time.start;
      let end = time.end;
      
      if (isSameDuration) {
        // 如果每节课时长相同，根据开始时间和单节课时长计算结束时间
        const startParts = start.split(':').map(Number);
        let endHour = startParts[0];
        let endMinute = startParts[1] + singleDuration;
        if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute = endMinute % 60;
        }
        end = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      }
      
      return { start, end };
    });
    
    // 检查时间重叠
    for (let i = 0; i < actualTimes.length; i++) {
      const current = actualTimes[i];
      const currentStart = current.start.split(':').map(Number);
      const currentEnd = current.end.split(':').map(Number);
      const currentStartTime = currentStart[0] * 60 + currentStart[1];
      const currentEndTime = currentEnd[0] * 60 + currentEnd[1];
      
      // 检查结束时间是否超过一天（即是否大于等于 24:00）
      if (currentEnd[0] >= 24) {
        return {
          hasOverlap: true,
          message: `第 ${i + 1} 节的结束时间超过了一天，请调整到 24:00 之前`
        };
      }
      
      // 检查当前课的开始时间是否早于结束时间
      if (currentStartTime >= currentEndTime) {
        return {
          hasOverlap: true,
          message: `第 ${i + 1} 节的开始时间晚于或等于结束时间`
        };
      }
      
      // 检查与其他课的重叠
      for (let j = i + 1; j < actualTimes.length; j++) {
        const other = actualTimes[j];
        const otherStart = other.start.split(':').map(Number);
        const otherEnd = other.end.split(':').map(Number);
        const otherStartTime = otherStart[0] * 60 + otherStart[1];
        const otherEndTime = otherEnd[0] * 60 + otherEnd[1];
        
        // 检查重叠
        if (currentStartTime < otherEndTime && currentEndTime > otherStartTime) {
          return {
            hasOverlap: true,
            message: `第 ${i + 1} 节与第 ${j + 1} 节的时间重叠`
          };
        }
      }
    }
    return { hasOverlap: false, message: '' };
  };

  const handleSave = async () => {
    try {
      // 检查一节课时长是否大于 0
      if (isSameDuration && singleDuration <= 0) {
        Alert.alert('错误', '一节课时长必须大于 0');
        return;
      }
      
      // 检查时间重叠
      const overlapCheck = checkTimeOverlap(localSectionTimes);
      if (overlapCheck.hasOverlap) {
        Alert.alert('错误', overlapCheck.message);
        return;
      }
      
      if (onSave) {
        // 使用回调函数保存时间设置
        onSave(localSectionTimes);
        Alert.alert('成功', '时间设置已保存');
      } else if (semesterId) {
        // 保存所有节次的时间设置到学期
        for (let i = 0; i < localSectionTimes.length; i++) {
          await updateSemesterSectionTime(semesterId, i, localSectionTimes[i]);
        }
        Alert.alert('成功', '时间设置已保存');
      }
      onClose();
    } catch (error) {
      console.error('保存时间设置失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleTimeChange = (index: number, start: string, end: string) => {
    const newTimes = [...localSectionTimes];
    
    // 如果启用了「每节课时长相同」，只计算当前课程的结束时间
    if (isSameDuration) {
      const [startHour, startMinute] = start.split(':').map(Number);
      const endTotalMinutes = startHour * 60 + startMinute + singleDuration;
      const endHour = Math.floor(endTotalMinutes / 60);
      const endMin = endTotalMinutes % 60;
      const newEnd = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      newTimes[index] = { start, end: newEnd };
    } else {
      // 如果没有启用「每节课时长相同」，直接使用用户设置的时间
      newTimes[index] = { start, end };
    }
    
    setLocalSectionTimes(newTimes);
  };

  // 时间选择器模态框
  const TimePickerModal = ({ visible, value, onClose, onChange }: { visible: boolean, value: string, onClose: () => void, onChange: (time: string) => void }) => {
    // 安全解析时间值
    const parseTime = (timeStr: string) => {
      try {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
          return {
            hours: parseInt(parts[0]) || 0,
            minutes: parseInt(parts[1]) || 0
          };
        }
      } catch {
        // 解析失败返回默认值
      }
      return { hours: 0, minutes: 0 };
    };

    const [selectedDate, setSelectedDate] = useState(new Date());

    // 初始化选中的日期
    useEffect(() => {
      if (visible) {
        const { hours, minutes } = parseTime(value);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        setSelectedDate(date);
      }
    }, [visible, value]);

    if (!visible) return null;

    const handleDateChange = (event: any, date?: Date) => {
      if (date) {
        setSelectedDate(date);
        // 直接保存选择的时间，不需要额外的确定按钮
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        onChange(newTime);
        onClose();
      } else {
        // 如果用户取消选择，关闭选择器
        onClose();
      }
    };

    return (
      <View>
        <DateTimePicker
          value={selectedDate}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleDateChange}
        />
      </View>
    );
  };

  const fillYouyiSummerTimes = () => {
    const targetCount = getActualSectionCount();
    const newTimes = youyiTimesSummer.slice(0, targetCount);
    
    // 如果需要更多时间，根据规律生成
    if (targetCount > youyiTimesSummer.length) {
      const lastTime = youyiTimesSummer[youyiTimesSummer.length - 1];
      const [lastStartHour, lastStartMin] = lastTime.start.split(':').map(Number);
      const [lastEndHour, lastEndMin] = lastTime.end.split(':').map(Number);
      
      // 计算课程时长和课间休息
      const lastStartTotal = lastStartHour * 60 + lastStartMin;
      const lastEndTotal = lastEndHour * 60 + lastEndMin;
      const duration = lastEndTotal - lastStartTotal;
      
      // 计算间隔
      const [prevEndHour, prevEndMin] = youyiTimesSummer[youyiTimesSummer.length - 2].end.split(':').map(Number);
      const [currStartHour, currStartMin] = lastTime.start.split(':').map(Number);
      const prevEndTotal = prevEndHour * 60 + prevEndMin;
      const currStartTotal = currStartHour * 60 + currStartMin;
      const interval = currStartTotal - prevEndTotal;
      
      let currentStartTotal = lastEndTotal + interval;
      
      for (let i = youyiTimesSummer.length; i < targetCount; i++) {
        const startHour = Math.floor(currentStartTotal / 60);
        const startMin = currentStartTotal % 60;
        const endTotal = currentStartTotal + duration;
        const endHour = Math.floor(endTotal / 60);
        const endMin = endTotal % 60;
        
        newTimes.push({
          start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
          end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
        });
        
        currentStartTotal = endTotal + interval;
      }
    }
    
    setLocalSectionTimes(newTimes);
    
    // 重新推断时长设置
    const durationSettings = inferDurationSettings(newTimes);
    setIsSameDuration(durationSettings.isSameDuration);
    setSingleDuration(durationSettings.singleDuration);
  };

  const fillChangAnTimes = () => {
    const targetCount = getActualSectionCount();
    const newTimes = changAnTimes.slice(0, targetCount);
    
    // 如果需要更多时间，根据规律生成
    if (targetCount > changAnTimes.length) {
      const lastTime = changAnTimes[changAnTimes.length - 1];
      const [lastStartHour, lastStartMin] = lastTime.start.split(':').map(Number);
      const [lastEndHour, lastEndMin] = lastTime.end.split(':').map(Number);
      
      // 计算课程时长和课间休息
      const lastStartTotal = lastStartHour * 60 + lastStartMin;
      const lastEndTotal = lastEndHour * 60 + lastEndMin;
      const duration = lastEndTotal - lastStartTotal;
      
      // 计算间隔
      const [prevEndHour, prevEndMin] = changAnTimes[changAnTimes.length - 2].end.split(':').map(Number);
      const [currStartHour, currStartMin] = lastTime.start.split(':').map(Number);
      const prevEndTotal = prevEndHour * 60 + prevEndMin;
      const currStartTotal = currStartHour * 60 + currStartMin;
      const interval = currStartTotal - prevEndTotal;
      
      let currentStartTotal = lastEndTotal + interval;
      
      for (let i = changAnTimes.length; i < targetCount; i++) {
        const startHour = Math.floor(currentStartTotal / 60);
        const startMin = currentStartTotal % 60;
        const endTotal = currentStartTotal + duration;
        const endHour = Math.floor(endTotal / 60);
        const endMin = endTotal % 60;
        
        newTimes.push({
          start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
          end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
        });
        
        currentStartTotal = endTotal + interval;
      }
    }
    
    setLocalSectionTimes(newTimes);
    
    // 重新推断时长设置
    const durationSettings = inferDurationSettings(newTimes);
    setIsSameDuration(durationSettings.isSameDuration);
    setSingleDuration(durationSettings.singleDuration);
  };

  const fillYouyiWinterTimes = () => {
    const targetCount = getActualSectionCount();
    const newTimes = youyiTimesWinter.slice(0, targetCount);
    
    // 如果需要更多时间，根据规律生成
    if (targetCount > youyiTimesWinter.length) {
      const lastTime = youyiTimesWinter[youyiTimesWinter.length - 1];
      const [lastStartHour, lastStartMin] = lastTime.start.split(':').map(Number);
      const [lastEndHour, lastEndMin] = lastTime.end.split(':').map(Number);
      
      // 计算课程时长和课间休息
      const lastStartTotal = lastStartHour * 60 + lastStartMin;
      const lastEndTotal = lastEndHour * 60 + lastEndMin;
      const duration = lastEndTotal - lastStartTotal;
      
      // 计算间隔
      const [prevEndHour, prevEndMin] = youyiTimesWinter[youyiTimesWinter.length - 2].end.split(':').map(Number);
      const [currStartHour, currStartMin] = lastTime.start.split(':').map(Number);
      const prevEndTotal = prevEndHour * 60 + prevEndMin;
      const currStartTotal = currStartHour * 60 + currStartMin;
      const interval = currStartTotal - prevEndTotal;
      
      let currentStartTotal = lastEndTotal + interval;
      
      for (let i = youyiTimesWinter.length; i < targetCount; i++) {
        const startHour = Math.floor(currentStartTotal / 60);
        const startMin = currentStartTotal % 60;
        const endTotal = currentStartTotal + duration;
        const endHour = Math.floor(endTotal / 60);
        const endMin = endTotal % 60;
        
        newTimes.push({
          start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
          end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
        });
        
        currentStartTotal = endTotal + interval;
      }
    }
    
    setLocalSectionTimes(newTimes);
    
    // 友谊校区冬季时间每节课时长不同，所以取消勾选「每节课时长相同」
    setIsSameDuration(false);
  };

  const handleSingleDurationChange = (duration: number) => {
    setSingleDuration(duration);
    if (isSameDuration) {
      // 保持用户已设置的课程开始时间，只调整结束时间
      const newTimes = [...localSectionTimes];
      
      for (let i = 0; i < newTimes.length; i++) {
        // 使用当前已有的开始时间
        const [startHour, startMinute] = newTimes[i].start.split(':').map(Number);
        
        // 计算新的结束时间
        let endHour = startHour;
        let endMinute = startMinute + duration;
        if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute = endMinute % 60;
        }
        
        // 只更新结束时间，保持开始时间不变
        newTimes[i] = { 
          start: newTimes[i].start, 
          end: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}` 
        };
      }
      
      setLocalSectionTimes(newTimes);
    }
  };

  // 处理时间点击
  const handleTimePress = (index: number, type: 'start' | 'end') => {
    console.log('点击时间:', index, type);
    // 确保index有效
    if (index >= 0 && index < localSectionTimes.length) {
      setEditingIndex(index);
      setEditingType(type);
      console.log('设置编辑状态:', index, type);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.container, { height: screenHeight * 0.8 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>设置课程时间</Text>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.infoText}>
                <Text style={styles.infoTextContent}>点击时间可以修改每节课的开始和结束时间</Text>
                <Text style={styles.infoTextContent}>选择「每节课时长相同」时，只需设置一节课的开始时间，系统会自动计算结束时间</Text>
              </View>

              {/* 校区时间快速填入按钮 */}
              <View style={styles.campusButtonsContainer}>
                <View style={styles.campusSection}>
                  <Text style={styles.campusSectionTitle}>友谊校区</Text>
                  <View style={styles.youyiButtonsRow}>
                    <TouchableOpacity
                      style={[styles.campusButton, styles.youyiSummerButton]}
                      onPress={fillYouyiSummerTimes}
                    >
                      <Text style={styles.campusButtonText}>5月1日-9月30日</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.campusButton, styles.youyiWinterButton]}
                      onPress={fillYouyiWinterTimes}
                    >
                      <Text style={styles.campusButtonText}>10月1日-4月30日</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.campusSection}>
                  <Text style={styles.campusSectionTitle}>长安校区</Text>
                  <TouchableOpacity
                    style={[styles.campusButton, styles.changAnButton]}
                    onPress={fillChangAnTimes}
                  >
                    <Text style={styles.campusButtonText}>填入长安校区时间表</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>每节课时长相同</Text>
                <Switch
                  value={isSameDuration}
                  onValueChange={setIsSameDuration}
                  trackColor={{ false: '#d0d0d0', true: '#3498db' }}
                  thumbColor={isSameDuration ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>一节课时长</Text>
                <View style={styles.durationInputContainer}>
                  <TextInput
                    style={styles.durationInput}
                    value={singleDuration.toString()}
                    onChangeText={(text) => {
                      // 允许用户删除所有数字，暂时设置为 0
                      if (text === '') {
                        setSingleDuration(0);
                      } else {
                        const duration = parseInt(text);
                        if (!isNaN(duration) && duration > 0) {
                          handleSingleDurationChange(duration);
                        }
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.durationUnit}>分钟</Text>
                </View>
              </View>

              <Text style={styles.noteText}>请注意是24小时制！</Text>

              <View style={styles.timeList}>
                {localSectionTimes.slice(0, getActualSectionCount()).map((time, index) => {
                  // 计算结束时间
                  let endTime = time.end;
                  if (isSameDuration) {
                    // 解析开始时间
                    const [startHour, startMinute] = time.start.split(':').map(Number);
                    // 计算结束时间
                    let endHour = startHour;
                    let endMinute = startMinute + singleDuration;
                    if (endMinute >= 60) {
                      endHour += Math.floor(endMinute / 60);
                      endMinute = endMinute % 60;
                    }
                    // 格式化结束时间
                    endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                  }
                  
                  return (
                    <View key={index} style={styles.timeItem}>
                      <Text style={styles.timeItemLabel}>第 {index + 1} 节</Text>
                      <View style={styles.timeInputContainer}>
                        {/* 开始时间按钮 */}
                        <TouchableOpacity
                          style={styles.timeDisplay}
                          onPress={() => handleTimePress(index, 'start')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.timeDisplayText}>{time.start}</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.timeSeparator}>-</Text>
                        
                        {/* 结束时间按钮 */}
                        <TouchableOpacity
                          style={[styles.timeDisplay, isSameDuration && styles.disabledInput]}
                          onPress={() => handleTimePress(index, 'end')}
                          disabled={isSameDuration}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.timeDisplayText}>{endTime}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 时间选择器模态框 - 放在最外层确保层级最高 */}
      <TimePickerModal 
        visible={editingIndex !== null}
        value={editingIndex !== null && editingIndex < localSectionTimes.length ? 
          (editingType === 'start' ? localSectionTimes[editingIndex].start : localSectionTimes[editingIndex].end) 
          : '00:00'}
        onClose={() => setEditingIndex(null)}
        onChange={(newTime) => {
          if (editingIndex !== null && editingIndex < localSectionTimes.length) {
            const time = localSectionTimes[editingIndex];
            if (editingType === 'start') {
              handleTimeChange(editingIndex, newTime, time.end);
            } else {
              handleTimeChange(editingIndex, time.start, newTime);
            }
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  timePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    width: '90%',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: {
    padding: 5
  },
  backButtonText: {
    fontSize: 24,
    color: '#333'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  saveButton: {
    padding: 5
  },
  saveButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500'
  },
  content: {
    flex: 1,
    padding: 20
  },
  infoText: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  infoTextContent: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
    marginBottom: 10
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  sectionLabel: {
    fontSize: 14,
    color: '#333'
  },
  sectionValue: {
    fontSize: 14,
    color: '#666'
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  durationInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    textAlign: 'center'
  },
  durationUnit: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666'
  },
  noteText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20
  },
  campusButtonsContainer: {
    flexDirection: 'column',
    gap: 15,
    marginBottom: 20
  },
  campusSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  campusSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  youyiButtonsRow: {
    flexDirection: 'row',
    gap: 10
  },
  campusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  youyiSummerButton: {
    backgroundColor: '#e67e22'
  },
  youyiWinterButton: {
    backgroundColor: '#3498db'
  },
  changAnButton: {
    backgroundColor: '#2ecc71'
  },
  campusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  timeList: {
    marginBottom: 20
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  timeItemLabel: {
    fontSize: 14,
    color: '#333'
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    backgroundColor: 'white',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeDisplayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  pickerArrow: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerArrowText: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: '500'
  },
  pickerButton: {
    padding: 10
  },
  pickerButtonText: {
    fontSize: 20,
    color: '#3498db'
  },
  pickerColumn: {
    height: 180, // 调整高度以显示5个选项（36 * 5）
    width: 80,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f5f5f5'
  },
  pickerScrollContent: {
    paddingVertical: 90, // 调整padding，确保中间选项可见
    alignItems: 'center'
  },
  pickerOption: {
    height: 36,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerOptionSelected: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 4
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400'
  },
  pickerOptionTextSelected: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: '600'
  },
  timeSeparator: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#666'
  },
  timeSeparatorLarge: {
    marginHorizontal: 20,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666'
  },
  disabledInput: {
    opacity: 0.6
  },
  pickerModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    maxWidth: 400,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 2000
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  pickerModalClose: {
    fontSize: 24,
    color: '#999',
    padding: 5
  },
  pickerModalContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  pickerModalSave: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center'
  },
  pickerModalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500'
  },
  timePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999
  }
});

export default TimeTableEditor;