import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
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
  const getCurrentSemester = () => {
    return semesters.find(s => s.id === semesterId) || semesters[0];
  };
  
  const getSectionCountFromSemester = () => {
    const semester = getCurrentSemester();
    return semester?.sectionCount || 10;
  };
  
  const getSectionTimesFromSemester = () => {
    const semester = getCurrentSemester();
    return semester?.sectionTimes || [];
  };
  
  const getActualSectionCount = () => {
    return sectionCount || getSectionCountFromSemester();
  };
  
  const getActualSectionTimes = () => {
    return initialSectionTimes.length > 0 ? initialSectionTimes : getSectionTimesFromSemester();
  };
  
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
      
      // 如果没有课程时间设置，根据 sectionCount 生成默认的
      if (sectionTimes.length === 0) {
        sectionTimes = Array.from({ length: getActualSectionCount() }, (_, index) => {
          // 生成默认的课程时间，更符合实际的课程时间表
          let hour, minute;
          
          // 根据索引生成更合理的课程时间
          switch (index) {
            case 0:
              hour = 8; minute = 30; break; // 第1节: 08:30
            case 1:
              hour = 9; minute = 25; break; // 第2节: 09:25
            case 2:
              hour = 10; minute = 30; break; // 第3节: 10:30
            case 3:
              hour = 11; minute = 25; break; // 第4节: 11:25
            case 4:
              hour = 14; minute = 0; break; // 第5节: 14:00
            case 5:
              hour = 14; minute = 55; break; // 第6节: 14:55
            case 6:
              hour = 16; minute = 0; break; // 第7节: 16:00
            case 7:
              hour = 16; minute = 55; break; // 第8节: 16:55
            case 8:
              hour = 19; minute = 0; break; // 第9节: 19:00
            case 9:
              hour = 19; minute = 55; break; // 第10节: 19:55
            default:
              // 对于更多的课程节数，继续按照规律生成
              hour = 20 + Math.floor((index - 10) / 2);
              minute = ((index - 10) % 2) * 55;
              break;
          }
          
          const startHour = hour.toString().padStart(2, '0');
          const startMinute = minute.toString().padStart(2, '0');
          
          // 计算结束时间（默认45分钟一节课）
          let endHour = hour;
          let endMinute = minute + 45;
          if (endMinute >= 60) {
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
          }
          
          const endHourStr = endHour.toString().padStart(2, '0');
          const endMinuteStr = endMinute.toString().padStart(2, '0');
          
          return {
            start: `${startHour}:${startMinute}`,
            end: `${endHourStr}:${endMinuteStr}`
          };
        });
      }
      
      setLocalSectionTimes(sectionTimes);
      
      // 重新推断时长设置
      const durationSettings = inferDurationSettings(sectionTimes);
      setIsSameDuration(durationSettings.isSameDuration);
      setSingleDuration(durationSettings.singleDuration);
    }
  }, [visible, loadSettings, initialSectionTimes]);

  // 当 sectionCount 变化时，调整课程时间列表
  useEffect(() => {
    if (visible) {
      const currentCount = localSectionTimes.length;
      const targetCount = getActualSectionCount();
      
      if (currentCount !== targetCount) {
        let newSectionTimes = [...localSectionTimes];
        
        if (currentCount < targetCount) {
          // 需要添加新的课程时间
          for (let i = currentCount; i < targetCount; i++) {
            // 生成默认的课程时间
            let hour = 8 + Math.floor(i / 2);
            let minute = (i % 2) * 50;
            
            // 调整时间，模拟真实的课程时间表
            if (i >= 4) { // 下午课程
              hour += 4; // 下午14点开始
            }
            if (i >= 8) { // 晚上课程
              hour += 2; // 晚上19点开始
            }
            
            const startHour = hour.toString().padStart(2, '0');
            const startMinute = minute.toString().padStart(2, '0');
            
            // 计算结束时间（默认45分钟一节课）
            let endHour = hour;
            let endMinute = minute + 45;
            if (endMinute >= 60) {
              endHour += Math.floor(endMinute / 60);
              endMinute = endMinute % 60;
            }
            
            const endHourStr = endHour.toString().padStart(2, '0');
            const endMinuteStr = endMinute.toString().padStart(2, '0');
            
            newSectionTimes.push({
              start: `${startHour}:${startMinute}`,
              end: `${endHourStr}:${endMinuteStr}`
            });
          }
        } else {
          // 需要删除多余的课程时间
          newSectionTimes = newSectionTimes.slice(0, targetCount);
        }
        
        setLocalSectionTimes(newSectionTimes);
      }
    }
  }, [visible, sectionCount, localSectionTimes]);

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
    newTimes[index] = { start, end };
    setLocalSectionTimes(newTimes);
  };

  // 时间选择组件
  const TimeDisplay = ({ value, onPress }: { value: string, onPress: () => void }) => {
    return (
      <View>
        <TouchableOpacity 
          style={styles.timeDisplay} 
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.timeDisplayText}>{value}</Text>
        </TouchableOpacity>
      </View>
    );
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

  const handleSingleDurationChange = (duration: number) => {
    setSingleDuration(duration);
    if (isSameDuration) {
      // 计算并更新所有节次的时间
      const newTimes = [...localSectionTimes];
      let currentHour = 8;
      let currentMinute = 0;
      
      for (let i = 0; i < newTimes.length; i++) {
        // 计算开始时间
        const startHour = currentHour.toString().padStart(2, '0');
        const startMinute = currentMinute.toString().padStart(2, '0');
        const startTime = `${startHour}:${startMinute}`;
        
        // 计算结束时间
        currentMinute += duration;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
        const endHour = currentHour.toString().padStart(2, '0');
        const endMinute = currentMinute.toString().padStart(2, '0');
        const endTime = `${endHour}:${endMinute}`;
        
        // 更新时间
        newTimes[i] = { start: startTime, end: endTime };
        
        // 添加10分钟课间休息
        currentMinute += 10;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
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
                <Text style={styles.infoTextContent}>选择"每节课时长相同"时，只需设置一节课时长，系统会自动计算所有节次时间</Text>
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