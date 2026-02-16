import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import TimeTableEditor from './TimeTableEditor';
import { Semester } from '../types';

interface SemesterFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (semester: Omit<Semester, 'id'>) => void;
  initialSemester?: Semester;
}

const SemesterForm: React.FC<SemesterFormProps> = ({ 
  visible, 
  onClose, 
  onSave, 
  initialSemester 
}) => {
  const { height: screenHeight } = useWindowDimensions();
  
  // 表单状态
  const [semesterName, setSemesterName] = useState(initialSemester?.name || '');
  const [semesterStartDate, setSemesterStartDate] = useState(initialSemester?.startDate || '');
  const [semesterWeekCount, setSemesterWeekCount] = useState(initialSemester?.weekCount?.toString() || '20');
  const [semesterSectionCount, setSemesterSectionCount] = useState(initialSemester?.sectionCount?.toString() || '10');
  const [semesterSectionTimes, setSemesterSectionTimes] = useState(initialSemester?.sectionTimes || []);
  
  // 日期选择器状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialSemester?.startDate ? new Date(initialSemester.startDate) : new Date());
  const [showTimeTableEditor, setShowTimeTableEditor] = useState(false);

  // 处理时间设置更新
  const handleTimeTableUpdate = (updatedSectionTimes: any[]) => {
    setSemesterSectionTimes(updatedSectionTimes);
    setShowTimeTableEditor(false);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // 使用本地时间格式化日期，避免时区问题
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setSemesterStartDate(formattedDate);
    }
  };

  const handleSave = () => {
    if (!semesterName || !semesterStartDate) {
      Alert.alert('提示', '请填写完整的学期信息');
      return;
    }

    const weekCount = parseInt(semesterWeekCount);
    if (isNaN(weekCount) || weekCount <= 0) {
      Alert.alert('提示', '请输入有效的学期周数');
      return;
    }

    const sectionCount = parseInt(semesterSectionCount);
    if (isNaN(sectionCount) || sectionCount <= 0) {
      Alert.alert('提示', '请输入有效的课程节数');
      return;
    }

    // 计算结束日期（开始日期加上周数 - 1天）
    const startDate = new Date(semesterStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weekCount * 7) - 1);
    // 使用本地时间格式化日期，避免时区问题
    const endYear = endDate.getFullYear();
    const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
    const endDay = endDate.getDate().toString().padStart(2, '0');
    const formattedEndDate = `${endYear}-${endMonth}-${endDay}`;

    // 创建课节时间设置
    let sectionTimes = semesterSectionTimes;
    
    // 如果没有设置课节时间，创建默认的
    if (sectionTimes.length === 0) {
      const defaultTimes = [
        { start: '08:00', end: '08:45' },
        { start: '08:55', end: '09:40' },
        { start: '10:00', end: '10:45' },
        { start: '10:55', end: '11:40' },
        { start: '14:00', end: '14:45' },
        { start: '14:55', end: '15:40' },
        { start: '16:00', end: '16:45' },
        { start: '16:55', end: '17:40' },
        { start: '19:00', end: '19:45' },
        { start: '19:55', end: '20:40' }
      ];
      sectionTimes = defaultTimes.slice(0, sectionCount);
      
      // 如果需要更多时间，根据最后一个时间生成
      if (sectionCount > defaultTimes.length) {
        const lastTime = defaultTimes[defaultTimes.length - 1];
        let currentHour = parseInt(lastTime.start.split(':')[0]);
        let currentMinute = parseInt(lastTime.start.split(':')[1]);
        
        for (let i = defaultTimes.length; i < sectionCount; i++) {
          currentMinute += 10;
          if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
          }
          const start = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          
          currentMinute += 45;
          if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
          }
          const end = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          
          sectionTimes.push({ start, end });
        }
      }
    }
    // 如果课节时间数量与设置的节数不匹配，调整数量
    else if (sectionTimes.length !== sectionCount) {
      if (sectionTimes.length > sectionCount) {
        // 如果课节时间数量多于设置的节数，截断
        sectionTimes = sectionTimes.slice(0, sectionCount);
      } else {
        // 如果课节时间数量少于设置的节数，添加默认时间
        const additionalTimes = Array.from({ length: sectionCount - sectionTimes.length }, () => ({
          start: '00:00',
          end: '00:00'
        }));
        sectionTimes = [...sectionTimes, ...additionalTimes];
      }
    }

    // 创建学期对象
    const semester = {
      name: semesterName,
      startDate: semesterStartDate,
      endDate: formattedEndDate,
      weekCount,
      sectionCount,
      sectionTimes
    };

    onSave(semester);
    onClose();
  };

  return (
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
            <Text style={styles.headerTitle}>{initialSemester ? '编辑学期' : '添加学期'}</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>学期名称</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={semesterName}
                    onChangeText={setSemesterName}
                    placeholder="如：2023-2024学年第一学期"
                  />
                </View>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>开始日期</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{semesterStartDate || '选择日期'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>学期周数</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.numberInput}
                    value={semesterWeekCount}
                    onChangeText={setSemesterWeekCount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>每天课程节数</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.numberInput}
                    value={semesterSectionCount}
                    onChangeText={setSemesterSectionCount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>课节时间设置</Text>
                <TouchableOpacity 
                  style={styles.timeSettingButton}
                  onPress={() => setShowTimeTableEditor(true)}
                >
                  <Text style={styles.timeSettingButtonText}>点击开始设置</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.actionButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveActionButton]}
              onPress={handleSave}
            >
              <Text style={styles.actionButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 日期选择器 */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* 时间设置编辑器 */}
      <TimeTableEditor 
        visible={showTimeTableEditor} 
        onClose={() => setShowTimeTableEditor(false)} 
        onSave={handleTimeTableUpdate}
        initialSectionTimes={semesterSectionTimes}
        sectionCount={parseInt(semesterSectionCount) || 10}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
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
  formGroup: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  settingItem: {
    marginBottom: 15
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10
  },
  numberInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    textAlign: 'center'
  },
  dateInput: {
    width: 120,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    textAlign: 'center',
    justifyContent: 'center',
    backgroundColor: 'white'
  },
  timeSettingButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  timeSettingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#95a5a6'
  },
  saveActionButton: {
    backgroundColor: '#3498db'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14
  }
});

export default SemesterForm;