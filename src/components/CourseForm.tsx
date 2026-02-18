import { isCourseConflict } from "@/src/utils/timeConflict";
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useCourseStore } from '../stores/courseStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Course, RepeatRule, TimeSlot } from '../types';

interface CourseFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (course: Course) => void;
  initialCourse?: Course;
}

const CourseForm: React.FC<CourseFormProps> = ({
  visible,
  onClose,
  onSave,
  initialCourse
}) => {
  const { courses } = useCourseStore();
  const { semesters, getCurrentSemester } = useSettingsStore();
  
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  
  const [course, setCourse] = useState<Course>({
    name: '',
    semesterId: '',
    timeSlots: [{ weekRange: '1-20', repeatRule: RepeatRule.ALL, dayOfWeek: 1, classSections: [1] }],
    code: '',
    location: '',
    credits: undefined,
    teacher: '',
    assessmentMethod: undefined,
    notes: '',
    color: '#3498db'
  });
  
  useEffect(() => {
    if (visible) {
      const current = getCurrentSemester();
      
      let newSemesterId: string = '';
      if (initialCourse) {
        newSemesterId = initialCourse.semesterId;
      } else {
        if (current.id !== 'default') {
          newSemesterId = current.id;
        } else if (semesters.length > 0) {
          newSemesterId = semesters[0].id;
        }
      }
      
      setSelectedSemesterId(newSemesterId);
      
      // 根据是否编辑课程来初始化状态
      if (initialCourse) {
        // 编辑模式：使用 initialCourse 的数据
        setCourse({
          name: initialCourse.name,
          semesterId: initialCourse.semesterId,
          timeSlots: initialCourse.timeSlots,
          code: initialCourse.code || '',
          location: initialCourse.location || '',
          credits: initialCourse.credits,
          teacher: initialCourse.teacher || '',
          assessmentMethod: initialCourse.assessmentMethod,
          notes: initialCourse.notes || '',
          color: initialCourse.color || '#3498db'
        });
      } else {
        // 新增模式：根据选中的学期初始化课程
        if (newSemesterId) {
          const selectedSemester = semesters.find(s => s.id === newSemesterId);
          const maxWeek = selectedSemester?.weekCount || 20;
          const defaultWeekRange = `1-${maxWeek}`;
          
          setCourse({
            name: '',
            semesterId: newSemesterId,
            timeSlots: [{ weekRange: defaultWeekRange, repeatRule: RepeatRule.ALL, dayOfWeek: 1, classSections: [1] }],
            code: '',
            location: '',
            credits: undefined,
            teacher: '',
            assessmentMethod: undefined,
            notes: '',
            color: '#3498db'
          });
        }
      }
    }
  }, [visible, initialCourse, semesters, getCurrentSemester]);
  
  // 当选择学期变化时，更新课程的时间槽以符合新学期的限制
  useEffect(() => {
    if (selectedSemesterId && visible && !initialCourse) {
      const selectedSemester = semesters.find(s => s.id === selectedSemesterId);
      if (selectedSemester) {
        const maxWeek = selectedSemester.weekCount;
        
        setCourse(prev => {
          const updatedTimeSlots = prev.timeSlots.map(slot => {
            const [start, end] = slot.weekRange.split('-').map(Number);
            const newEnd = Math.min(end, maxWeek);
            const newStart = Math.min(start, newEnd);
            return {
              ...slot,
              weekRange: `${newStart}-${newEnd}`,
              classSections: slot.classSections.map(s => Math.min(s, selectedSemester.sectionCount)).filter(s => s > 0)
            };
          });
          
          return {
            ...prev,
            semesterId: selectedSemesterId,
            timeSlots: updatedTimeSlots
          };
        });
      }
    }
  }, [selectedSemesterId, visible, semesters, initialCourse]);
  
  // 找到初始课程在课程列表中的索引
  const initialCourseIndex = initialCourse 
    ? courses.findIndex(c => c.name === initialCourse.name && c.code === initialCourse.code)
    : -1;

  // 状态管理
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempWeekRange, setTempWeekRange] = useState('1-20');
  const [tempRepeatRule, setTempRepeatRule] = useState(RepeatRule.ALL);
  const [tempDayOfWeek, setTempDayOfWeek] = useState(1);
  const [tempClassSections, setTempClassSections] = useState<number[]>([1]);
  const [editingTimeSlotIndex, setEditingTimeSlotIndex] = useState(0);
  const [weekSelectionMode, setWeekSelectionMode] = useState<'single' | 'range'>('single');
  const [weekRangeStart, setWeekRangeStart] = useState<number | null>(null);
  const [weekRangeEnd, setWeekRangeEnd] = useState<number | null>(null);

  // 颜色选择器
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

  // 处理颜色选择
  const handleColorSelect = (color: string) => {
    setCourse(prev => ({ ...prev, color }));
  };

  // 处理周数选择确定
  const handleWeekPickerConfirm = () => {
    setCourse(prev => {
      const newTimeSlots = [...prev.timeSlots];
      newTimeSlots[editingTimeSlotIndex] = {
        ...newTimeSlots[editingTimeSlotIndex],
        weekRange: tempWeekRange,
        repeatRule: tempRepeatRule
      };
      return { ...prev, timeSlots: newTimeSlots };
    });
    setShowWeekPicker(false);
  };

  // 处理时间选择确定
  const handleTimePickerConfirm = () => {
    let fullClassSections: number[] = [];
    if (tempClassSections.length === 2) {
      // 生成完整的节次数组，例如从1-4节生成[1,2,3,4]
      const start = Math.min(tempClassSections[0], tempClassSections[1]);
      const end = Math.max(tempClassSections[0], tempClassSections[1]);
      fullClassSections = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else if (tempClassSections.length === 1) {
      // 如果只有一个节次，直接使用
      fullClassSections = tempClassSections;
    } else {
      // 默认使用第一个节次
      fullClassSections = [1];
    }
    
    setCourse(prev => {
      const newTimeSlots = [...prev.timeSlots];
      newTimeSlots[editingTimeSlotIndex] = {
        ...newTimeSlots[editingTimeSlotIndex],
        dayOfWeek: tempDayOfWeek,
        classSections: fullClassSections
      };
      return { ...prev, timeSlots: newTimeSlots };
    });
    setShowTimePicker(false);
  };

  const handleAddTimeSlot = () => {
    const selectedSemester = semesters.find(s => s.id === selectedSemesterId);
    const maxWeek = selectedSemester?.weekCount || 20;
    const defaultWeekRange = `1-${maxWeek}`;
    
    setCourse(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { weekRange: defaultWeekRange, repeatRule: RepeatRule.ALL, dayOfWeek: 1, classSections: [1] }]
    }));
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (course.timeSlots.length > 1) {
      setCourse(prev => ({
        ...prev,
        timeSlots: prev.timeSlots.filter((_, i) => i !== index)
      }));
    } else {
      Alert.alert('提示', '至少需要一个时间段');
    }
  };

  const handleSave = () => {
    if (!course.name.trim()) {
      Alert.alert('提示', '请输入课程名称');
      return;
    }
    
    if (!selectedSemesterId || selectedSemesterId === 'default') {
      Alert.alert('提示', '请选择一个有效的学期（不能选择假期）');
      return;
    }
    
    const selectedSemester = semesters.find(s => s.id === selectedSemesterId);
    if (!selectedSemester) {
      Alert.alert('提示', '所选学期不存在');
      return;
    }
    
    // 检测时间冲突
    const courseToSave = { ...course, semesterId: selectedSemesterId };
    const conflict = isCourseConflict(
      courseToSave,
      courses,
      initialCourseIndex >= 0 ? initialCourseIndex : undefined
    );
    
    if (conflict) {
      Alert.alert('时间冲突', '该课程与现有课程存在时间冲突，请调整时间后重试');
      return;
    }
    
    onSave(courseToSave);
    onClose();
  };

  // 处理周数选择
  const handleWeekPress = (week: number) => {
    if (weekSelectionMode === 'single') {
      // 单选模式：直接选择单个周数
      setTempWeekRange(`${week}-${week}`);
    } else {
      // 范围选择模式：选择开始和结束周数
      if (weekRangeStart === null) {
        // 选择开始周
        setWeekRangeStart(week);
        setWeekRangeEnd(null);
      } else if (weekRangeEnd === null) {
        // 选择结束周
        const start = Math.min(weekRangeStart, week);
        const end = Math.max(weekRangeStart, week);
        setWeekRangeEnd(week);
        setTempWeekRange(`${start}-${end}`);
      } else {
        // 重置选择，开始新的范围
        setWeekRangeStart(week);
        setWeekRangeEnd(null);
      }
    }
  };

  // 渲染周数选择器
  const renderWeekPicker = () => {
    const selectedSemester = semesters.find(s => s.id === selectedSemesterId);
    const maxWeek = selectedSemester?.weekCount || 20;
    
    return (
      <Modal
        visible={showWeekPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeekPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowWeekPicker(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.pickerContainer}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.pickerTitle}>请选择周数</Text>
            
            {/* 选择模式切换 */}
            <View style={styles.weekSelectionModeContainer}>
              <TouchableOpacity
                style={[
                  styles.selectionModeButton,
                  weekSelectionMode === 'single' && styles.selectedSelectionModeButton
                ]}
                onPress={() => setWeekSelectionMode('single')}
              >
                <Text style={[
                  styles.selectionModeText,
                  weekSelectionMode === 'single' && styles.selectedSelectionModeText
                ]}>
                  单选
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionModeButton,
                  weekSelectionMode === 'range' && styles.selectedSelectionModeButton
                ]}
                onPress={() => setWeekSelectionMode('range')}
              >
                <Text style={[
                  styles.selectionModeText,
                  weekSelectionMode === 'range' && styles.selectedSelectionModeText
                ]}>
                  范围
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.weekNumberGrid}>
              {Array.from({ length: maxWeek }, (_, i) => i + 1).map(week => {
                // 检查是否是当前选中的周数
                const isSelected = tempWeekRange === `${week}-${week}` || 
                  (weekRangeStart !== null && weekRangeEnd !== null && 
                   week >= Math.min(weekRangeStart, weekRangeEnd) && 
                   week <= Math.max(weekRangeStart, weekRangeEnd));
                // 检查是否是范围的开始或结束
                const isRangeStart = weekRangeStart === week && weekRangeEnd === null;
                const isRangeEnd = weekRangeEnd === week;
                
                return (
                  <TouchableOpacity
                    key={week}
                    style={[
                      styles.weekNumberButton,
                      isSelected && styles.selectedWeekButton,
                      isRangeStart && styles.rangeStartWeekButton,
                      isRangeEnd && styles.rangeEndWeekButton
                    ]}
                    onPress={() => handleWeekPress(week)}
                  >
                    <Text style={[
                      styles.weekNumberText,
                      isSelected && styles.selectedWeekText
                    ]}>
                      {week}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.weekRangeDisplay}>
              <Text style={styles.weekRangeLabel}>当前选择：</Text>
              <Text style={styles.weekRangeValue}>{tempWeekRange}周</Text>
            </View>
            
            <View style={styles.pickerButtonGroup}>
              <TouchableOpacity 
                style={styles.pickerCancelButton} 
                onPress={() => {
                  setShowWeekPicker(false);
                  // 重置选择状态
                  setWeekRangeStart(null);
                  setWeekRangeEnd(null);
                }}
              >
                <Text style={styles.pickerCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.pickerConfirmButton} 
                onPress={() => {
                  handleWeekPickerConfirm();
                  // 重置选择状态
                  setWeekRangeStart(null);
                  setWeekRangeEnd(null);
                }}
              >
                <Text style={styles.pickerConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // 渲染时间选择器
  const renderTimePicker = () => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const selectedSemester = semesters.find(s => s.id === selectedSemesterId);
    const maxSection = selectedSemester?.sectionCount || 10;
    const sections = Array.from({ length: maxSection }, (_, i) => i + 1);
    
    // 确保开始节次不大于结束节次
    if (tempClassSections.length > 1 && tempClassSections[0] > tempClassSections[1]) {
      setTempClassSections([tempClassSections[1], tempClassSections[0]]);
    }
    
    return (
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTimePicker(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.pickerContainer}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.pickerTitle}>请选择时间</Text>
            
            <View style={styles.timePickerColumns}>
              {/* 星期列 */}
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {days.map((day, index) => {
                  const dayNum = index + 1;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        tempDayOfWeek === dayNum && styles.selectedPickerItem
                      ]}
                      onPress={() => setTempDayOfWeek(dayNum)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDayOfWeek === dayNum && styles.selectedPickerItemText
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              {/* 开始节次列 */}
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {sections.map(section => (
                  <TouchableOpacity
                    key={`start-${section}`}
                    style={[
                      styles.pickerItem,
                      tempClassSections.length > 0 && tempClassSections[0] === section && styles.selectedPickerItem
                    ]}
                    onPress={() => {
                      const endSection = tempClassSections.length > 1 ? tempClassSections[1] : section;
                      setTempClassSections([section, Math.max(section, endSection)]);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      tempClassSections.length > 0 && tempClassSections[0] === section && styles.selectedPickerItemText
                    ]}>
                      第{section}节
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* 结束节次列 */}
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {sections.map(section => (
                  <TouchableOpacity
                    key={`end-${section}`}
                    style={[
                      styles.pickerItem,
                      tempClassSections.length > 1 && tempClassSections[1] === section && styles.selectedPickerItem
                    ]}
                    onPress={() => {
                      const startSection = tempClassSections.length > 0 ? tempClassSections[0] : 1;
                      setTempClassSections([Math.min(startSection, section), section]);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      tempClassSections.length > 1 && tempClassSections[1] === section && styles.selectedPickerItemText
                    ]}>
                      第{section}节
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.pickerButtonGroup}>
              <TouchableOpacity 
                style={styles.pickerCancelButton} 
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.pickerCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.pickerConfirmButton} 
                onPress={handleTimePickerConfirm}
              >
                <Text style={styles.pickerConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // 渲染时间段
  const renderTimeSlot = (slot: TimeSlot, index: number) => {
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dayName = dayNames[slot.dayOfWeek - 1] || '';
    const sectionsText = slot.classSections.sort((a, b) => a - b).join('-');
    
    return (
      <View key={index} style={styles.timeSlotContainer}>
        <View style={styles.timeSlotHeader}>
          <Text style={styles.timeSlotTitle}>时间段 {index + 1}</Text>
          {course.timeSlots.length > 1 && (
            <TouchableOpacity
              style={styles.removeTimeSlotButton}
              onPress={() => handleRemoveTimeSlot(index)}
            >
              <Text style={styles.removeTimeSlotText}>删除</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.timeSlotField}
          onPress={() => {
            setEditingTimeSlotIndex(index);
            setTempWeekRange(slot.weekRange);
            setTempRepeatRule(slot.repeatRule);
            setShowWeekPicker(true);
          }}
        >
          <Text style={styles.timeSlotLabel}>周数</Text>
          <Text style={styles.timeSlotValue}>{slot.weekRange}周{slot.repeatRule ? ` (${slot.repeatRule})` : ''}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.timeSlotField}
          onPress={() => {
            setEditingTimeSlotIndex(index);
            setTempDayOfWeek(slot.dayOfWeek);
            setTempClassSections(slot.classSections);
            setShowTimePicker(true);
          }}
        >
          <Text style={styles.timeSlotLabel}>时间</Text>
          <Text style={styles.timeSlotValue}>
            {dayName} 第{sectionsText}节
            {slot.classSections.length > 1 && ` (共${slot.classSections.length}节)`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* 头部导航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{initialCourse ? '编辑课程' : '添加课程'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          {/* 课程名称 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>课程名称</Text>
            <TextInput
              style={styles.input}
              value={course.name}
              onChangeText={(text) => setCourse(prev => ({ ...prev, name: text }))}
              placeholder="请输入课程名称"
            />
            
          </View>

          {/* 学期选择 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>所属学期</Text>
            <View style={styles.semesterPickerContainer}>
              {semesters.length > 0 ? (
                semesters.map((semester) => (
                  <TouchableOpacity
                    key={semester.id}
                    style={[
                      styles.semesterOption,
                      selectedSemesterId === semester.id && styles.semesterOptionActive
                    ]}
                    onPress={() => setSelectedSemesterId(semester.id)}
                  >
                    <Text
                      style={[
                        styles.semesterOptionText,
                        selectedSemesterId === semester.id && styles.semesterOptionTextActive
                      ]}
                    >
                      {semester.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noSemesterText}>
                  暂无可用学期，请先在设置中添加学期
                </Text>
              )}
            </View>
          </View>

          {/* 颜色选择 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>点击更改颜色</Text>
            <View style={styles.colorPickerContainer}>
              {colors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    course.color === color && styles.selectedColorButton
                  ]}
                  onPress={() => handleColorSelect(color)}
                >
                  {course.color === color && <Text style={styles.colorCheckmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 学分 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>学分 (可不填)</Text>
            <TextInput
              style={styles.input}
              value={course.credits?.toString() || ''}
              onChangeText={(text) => setCourse(prev => ({ ...prev, credits: parseFloat(text) || undefined }))}
              placeholder="请输入学分"
              keyboardType="numeric"
            />
          </View>

          {/* 备注 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>备注 (可不填)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={course.notes}
              onChangeText={(text) => setCourse(prev => ({ ...prev, notes: text }))}
              placeholder="请输入备注信息"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* 时间段 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>时间段</Text>
            
            {course.timeSlots.map((slot, index) => renderTimeSlot(slot, index))}
          </View>

          {/* 任课老师 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>任课老师 (可不填)</Text>
            <TextInput
              style={styles.input}
              value={course.teacher}
              onChangeText={(text) => setCourse(prev => ({ ...prev, teacher: text }))}
              placeholder="请输入任课老师姓名"
            />
          </View>

          {/* 上课地点 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>上课地点 (可不填)</Text>
            <TextInput
              style={styles.input}
              value={course.location}
              onChangeText={(text) => setCourse(prev => ({ ...prev, location: text }))}
              placeholder="请输入上课地点"
            />
          </View>

          {/* 课程代码 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>课程代码 (可不填)</Text>
            <TextInput
              style={styles.input}
              value={course.code}
              onChangeText={(text) => setCourse(prev => ({ ...prev, code: text }))}
              placeholder="请输入课程代码"
            />
          </View>

          {/* 底部空间 */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* 浮动添加按钮 */}
        <TouchableOpacity 
          style={styles.floatingAddButton}
          onPress={handleAddTimeSlot}
        >
          <Text style={styles.floatingAddButtonText}>+</Text>
        </TouchableOpacity>

        {/* 渲染选择器 */}
        {renderWeekPicker()}
        {renderTimePicker()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 10
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  saveButton: {
    padding: 10
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3498db'
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  formGroup: {
    marginBottom: 25
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12
  },

  // 颜色选择器
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedColorButton: {
    borderColor: '#333'
  },
  colorCheckmark: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  // 时间段
  timeSlotContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  timeSlotTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  removeTimeSlotButton: {
    padding: 5
  },
  removeTimeSlotText: {
    fontSize: 14,
    color: '#e74c3c'
  },
  timeSlotField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  timeSlotLabel: {
    fontSize: 14,
    color: '#666'
  },
  timeSlotValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  // 浮动添加按钮
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  floatingAddButtonText: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    lineHeight: 36
  },
  // 周数选择器
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center'
  },
  // 周数选择模式
  weekSelectionModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 10
  },
  selectionModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center'
  },
  selectedSelectionModeButton: {
    backgroundColor: '#3498db'
  },
  selectionModeText: {
    fontSize: 14,
    color: '#333'
  },
  selectedSelectionModeText: {
    color: 'white',
    fontWeight: '500'
  },
  weekNumberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15
  },
  weekNumberButton: {
    width: '14%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbdefb'
  },
  selectedWeekButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db'
  },
  rangeStartWeekButton: {
    backgroundColor: '#bbdefb',
    borderColor: '#3498db'
  },
  rangeEndWeekButton: {
    backgroundColor: '#bbdefb',
    borderColor: '#3498db'
  },
  weekNumberText: {
    fontSize: 14,
    color: '#1976d2'
  },
  selectedWeekText: {
    color: 'white',
    fontWeight: '500'
  },
  // 周数范围显示
  weekRangeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  weekRangeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8
  },
  weekRangeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db'
  },

  pickerButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  pickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#333'
  },
  pickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  pickerConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500'
  },
  // 时间选择器列布局
  timePickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 300,
    marginBottom: 20
  },
  pickerColumn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden'
  },
  pickerItem: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  selectedPickerItem: {
    backgroundColor: '#e3f2fd'
  },
  pickerItemText: {
    fontSize: 14,
    color: '#333'
  },
  selectedPickerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db'
  },
  // 学期选择器样式
  semesterPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  semesterOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  semesterOptionActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db'
  },
  semesterOptionText: {
    fontSize: 14,
    color: '#333'
  },
  semesterOptionTextActive: {
    color: 'white',
    fontWeight: '500'
  },
  noSemesterText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 10
  }
});

export default CourseForm;
