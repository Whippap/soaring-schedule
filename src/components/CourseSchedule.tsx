import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { Course, Semester } from '../types';

interface CourseScheduleProps {
  courses: Course[];
  onAddCourse: () => void;
  onEditCourse?: (index: number) => void;
  onDeleteCourse?: (index: number) => void;
}


const SIDEBAR_WIDTH = 60; // 侧边栏宽度
const MIN_COLUMN_WIDTH = 60; // 最小列宽度
const FIXED_ROW_HEIGHT = 50; // 固定行高度

// 课节时间配置
const defaultSectionTimes = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '16:00', end: '16:45' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' },
  { start: '21:45', end: '22:30' }
];

const CourseSchedule: React.FC<CourseScheduleProps> = ({ courses, onAddCourse, onEditCourse, onDeleteCourse }) => {
  const { width: screenWidth } = useWindowDimensions();
  // 计算按钮位置，使三个按钮平分屏幕底部区域
  const buttonWidth = 120; // 每个按钮的宽度
  const buttonSpacing = (screenWidth - buttonWidth * 3) / 4; // 按钮之间的间距
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [showThreeDays, setShowThreeDays] = useState(false); // 控制是否只显示近三天
  const [isCurrentWeek, setIsCurrentWeek] = useState(true); // 控制是否显示返回本周按钮
  const weekChangeAnim = useRef(new Animated.Value(1)).current;
  
  // 从设置存储中获取时间表数据
  const { semesters, getCurrentSemester } = useSettingsStore();
  
  // 使用 state 来存储当前学期，确保在状态变化时更新
  const [currentSemester, setCurrentSemester] = useState(getCurrentSemester(currentDate));
  
  // 使用 state 来存储当前学期的相关信息
  const [semesterWeekCount, setSemesterWeekCount] = useState(currentSemester?.weekCount || 20);
  const [semesterStartDate, setSemesterStartDate] = useState(currentSemester?.startDate || new Date().toISOString().split('T')[0]);
  const [semesterName, setSemesterName] = useState(currentSemester?.name || '假期');
  
  // 当 semesters、currentDate 变化时，重新获取当前学期
  useEffect(() => {
    const newSemester = getCurrentSemester(currentDate);
    setCurrentSemester(newSemester);
    setSemesterWeekCount(newSemester?.weekCount || 20);
    setSemesterStartDate(newSemester?.startDate || new Date().toISOString().split('T')[0]);
    setSemesterName(newSemester?.name || '假期');
  }, [semesters, currentDate, getCurrentSemester]);

  // 获取指定日期对应的学期
  const getSemesterForDate = (date: Date): Semester => {
    for (const semester of semesters) {
      const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);
      
      const [endYear, endMonth, endDay] = semester.endDate.split('-').map(Number);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (checkDate >= startDate && checkDate <= endDate) {
        return semester;
      }
    }
    
    // 返回假期
    const targetYear = date.getFullYear();
    return {
      id: 'default',
      name: '假期',
      startDate: `${targetYear}-01-01`,
      endDate: `${targetYear}-12-31`,
      weekCount: 52,
      sectionCount: 10,
      sectionTimes: defaultSectionTimes.slice(0, 10)
    };
  };

  // 获取显示范围内所有日期的最大节数
  const getMaxSectionCount = (): number => {
    let maxCount = 0;
    
    if (daysToShow === 7) {
      // 计算周一的日期
      const monday = new Date(currentDate);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      const adjustedMonday = new Date(monday.setDate(diff));
      
      for (let i = 0; i < 7; i++) {
        const targetDate = addDays(adjustedMonday, i);
        const semester = getSemesterForDate(targetDate);
        maxCount = Math.max(maxCount, semester.sectionCount);
      }
    } else {
      // 只显示昨天、今天、明天
      for (let i = -1; i <= 1; i++) {
        const targetDate = addDays(new Date(), i);
        const semester = getSemesterForDate(targetDate);
        maxCount = Math.max(maxCount, semester.sectionCount);
      }
    }
    
    return maxCount;
  };

  // 获取指定日期的节数
  const getSectionCountForDate = (date: Date): number => {
    const semester = getSemesterForDate(date);
    return semester.sectionCount;
  };

  // 获取指定日期的准确日期对象
  const getExactDateForDay = (dayIndex: number): Date => {
    if (daysToShow === 7) {
      // 计算周一的日期
      const monday = new Date(currentDate);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      const adjustedMonday = new Date(monday.setDate(diff));
      
      // 计算对应星期的日期
      return addDays(adjustedMonday, dayIndex);
    } else {
      // 只显示昨天、今天、明天
      return addDays(new Date(), dayIndex);
    }
  };

  // 计算响应式布局参数
  const calculateLayout = () => {
    // 根据用户选择决定显示天数
    const daysToShow = showThreeDays ? 3 : 7;
    
    // 计算可用宽度（减去侧边栏）
    const availableWidth = screenWidth - SIDEBAR_WIDTH;
    
    // 计算列宽，确保填充满屏幕宽度
    const columnWidth = Math.max(MIN_COLUMN_WIDTH, availableWidth / daysToShow);
    
    // 使用固定的行高度
    const rowHeight = FIXED_ROW_HEIGHT;
    
    return {
      daysToShow,
      columnWidth,
      rowHeight,
      tableWidth: SIDEBAR_WIDTH + columnWidth * daysToShow // 表格总宽度
    };
  };

  const { daysToShow, columnWidth, rowHeight, tableWidth } = calculateLayout();

  // 生成显示的星期范围（最近3天或完整7天）
  const getDisplayWeekDays = () => {
    const allDays = ['一', '二', '三', '四', '五', '六', '日'];
    const todayIndex = new Date().getDay() - 1 || 6; // 今天是星期几（0-6，对应一二三四五六日）
    
    if (daysToShow === 7) {
      return allDays;
    } else {
      // 只显示昨天、今天、明天
      const displayDays = [];
      for (let i = -1; i <= 1; i++) {
        const dayIndex = (todayIndex + i + 7) % 7;
        displayDays.push(allDays[dayIndex]);
      }
      return displayDays;
    }
  };

  // 生成显示的日期范围
  const getDisplayDateRange = () => {
    const displayDates = [];
    
    if (daysToShow === 7) {
      // 完整7天（从周一到周日）
      for (let i = 0; i < 7; i++) {
        displayDates.push(i);
      }
    } else {
      // 只显示昨天、今天、明天
      for (let i = -1; i <= 1; i++) {
        displayDates.push(i);
      }
    }
    
    return displayDates;
  };

  // 模拟刷新
  const onRefresh = () => {
    setRefreshing(true);
    // 模拟网络请求
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // 动画效果
  const animateWeekChange = () => {
    Animated.sequence([
      Animated.timing(weekChangeAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(weekChangeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 生成课节标题 - 基于最大节数
  const maxSectionCount = getMaxSectionCount();
  const sectionTitles = Array.from({ length: maxSectionCount }, (_, index) => index + 1);

  // 生成星期标题
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  // 生成日期标题（基于当前日期）
  const getDateForDay = (dayIndex: number): string => {
    const targetDate = getExactDateForDay(dayIndex);
    return format(targetDate, 'MM-dd');
  };

  // 获取指定日期的学期
  const getSemesterIdForDate = (date: Date): string => {
    const semester = getSemesterForDate(date);
    return semester.id;
  };
  
  // 计算指定日期对应的学期周数
  const getWeekNumberForDate = (date: Date): number => {
    if (!semesterStartDate) return 1;
    
    const [startYear, startMonth, startDay] = semesterStartDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = displayDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };
  
  // 检查周数是否在课程的周数范围内
  const isWeekInRange = (weekNum: number, weekRange: string): boolean => {
    try {
      const [start, end] = weekRange.split('-').map(Number);
      return weekNum >= start && weekNum <= end;
    } catch {
      return false;
    }
  };
  
  // 获取指定星期和课节的课程
  const getCourseAt = (dayOfWeek: number, section: number, targetDate: Date): { course: Course; index: number; isFirstSection: boolean; isLastSection: boolean } | undefined => {
    const semesterId = getSemesterIdForDate(targetDate);
    const currentWeekNum = getWeekNumberForDate(targetDate);
    
    const index = courses.findIndex(course => {
      // 只显示属于当前学期的课程
      if (course.semesterId !== semesterId) return false;
      return course.timeSlots.some(slot => {
        // 检查是否在指定的星期和课节有课
        if (slot.dayOfWeek !== dayOfWeek || !slot.classSections.includes(section)) {
          return false;
        }
        // 检查当前周是否在课程的周数范围内
        return isWeekInRange(currentWeekNum, slot.weekRange);
      });
    });
    
    if (index !== -1) {
      const course = courses[index];
      const slot = course.timeSlots.find(slot => {
        return slot.dayOfWeek === dayOfWeek && slot.classSections.includes(section) && 
               isWeekInRange(currentWeekNum, slot.weekRange);
      });
      if (slot) {
        const isFirstSection = slot.classSections[0] === section;
        const isLastSection = slot.classSections[slot.classSections.length - 1] === section;
        return { course, index, isFirstSection, isLastSection };
      }
    }
    return undefined;
  };

  // 切换到上一周
  const goToPreviousWeek = () => {
    animateWeekChange();
    setCurrentWeek(prev => Math.max(1, prev - 1));
    setCurrentDate(prev => addDays(prev, -7));
  };

  // 切换到下一周
  const goToNextWeek = () => {
    animateWeekChange();
    setCurrentWeek(prev => Math.min(semesterWeekCount || 20, prev + 1));
    setCurrentDate(prev => addDays(prev, 7));
  };

  // 切换到当前周
  const goToCurrentWeek = () => {
    animateWeekChange();
    setCurrentDate(new Date());
  };

  // 计算当前周数和学期状态
  useEffect(() => {
    if (semesterStartDate && semesterWeekCount) {
      // 使用正确的方式解析日期，避免时区问题
      const [startYear, startMonth, startDay] = semesterStartDate.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);
      
      // 使用用户选择的显示日期，而不是今天的日期
      const displayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      const diffTime = displayDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);
      
      console.log('计算周数:', {
        semesterStartDate,
        semesterWeekCount,
        startDate,
        displayDate,
        diffDays,
        weekNum
      });
      
      // 如果当前日期在开学日期之前，显示第1周
      if (diffDays < 0) {
        setCurrentWeek(1);
      } 
      // 如果超过学期周数，显示学期结束
      else if (weekNum > semesterWeekCount) {
        setCurrentWeek(semesterWeekCount);
      } else {
        setCurrentWeek(weekNum);
      }
    }
  }, [semesterStartDate, semesterWeekCount, currentDate]);

  // 当 currentSemester 变化时，重新加载数据
  useEffect(() => {
    console.log('当前学期变化:', currentSemester);
  }, [currentSemester]);

  // 检查当前是否是本周
  useEffect(() => {
    const today = new Date();
    const isCurrentWeek = today.getDate() === currentDate.getDate() && 
                         today.getMonth() === currentDate.getMonth() && 
                         today.getFullYear() === currentDate.getFullYear();
    setIsCurrentWeek(!isCurrentWeek);
  }, [currentDate]);

  return (
    <View style={styles.container}>
      {/* 顶栏 - 显示日期、周数信息和添加按钮 */}
      <View style={styles.header}>
        <View style={styles.dateInfo}>
          <Text style={styles.currentDate}>{format(currentDate, 'yyyy/MM/dd')}</Text>
          <Text style={styles.weekInfoText}>
            {semesterName !== '假期' ? `${semesterName} 第 ${currentWeek} 周` : '假期'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowThreeDays(!showThreeDays)}
          >
            <Ionicons name={showThreeDays ? 'calendar-outline' : 'calendar-sharp'} size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onAddCourse}>
            <Text style={styles.headerButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 课程表格 */}
      <ScrollView 
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3498db']}
            tintColor="#3498db"
          />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ width: tableWidth }}>
            {/* 星期标题行 */}
            <View style={styles.weekHeaderRow}>
              {/* 空白角落 */}
              <View style={[styles.cornerCell, { width: SIDEBAR_WIDTH, height: rowHeight }]} />
              
              {/* 星期标题 */}
              {getDisplayWeekDays().map((day, index) => {
                const dateOffset = daysToShow === 7 ? index : index - 1;
                const exactDate = getExactDateForDay(dateOffset);
                const dateStr = getDateForDay(dateOffset);
                const today = new Date();
                const isToday = exactDate.getDate() === today.getDate() && 
                               exactDate.getMonth() === today.getMonth() && 
                               exactDate.getFullYear() === today.getFullYear();
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.weekDayCell, 
                      {
                        width: columnWidth, 
                        height: rowHeight
                      },
                      isToday && styles.todayColumn
                    ]}
                  >
                    <Text style={styles.weekDayText}>周{day}</Text>
                    <Text style={styles.dateText}>{dateStr}</Text>
                  </View>
                );
              })}
            </View>

            {/* 课程内容 */}
            {sectionTitles.map((section) => {
              // 获取显示的日期列表
              const displayDates = [];
              for (let i = 0; i < daysToShow; i++) {
                const dateOffset = daysToShow === 7 ? i : (i - 1);
                displayDates.push(getExactDateForDay(dateOffset));
              }
              
              // 找出是否有非默认学期，如果有则使用第一个非默认学期的时间
              let displaySectionTimes = null;
              for (const date of displayDates) {
                const semester = getSemesterForDate(date);
                if (semester.id !== 'default' && semester.sectionTimes && semester.sectionTimes[section - 1]) {
                  displaySectionTimes = semester.sectionTimes;
                  break;
                }
              }
              
              return (
                <View key={section} style={styles.sectionRow}>
                  {/* 课节标题和上课时间 - 根据显示的日期决定是否显示 */}
                  <View style={[styles.sectionCell, { width: SIDEBAR_WIDTH, height: rowHeight }]}>
                    <Text style={styles.sectionText}>{section}</Text>
                    {displaySectionTimes && displaySectionTimes[section - 1] && (
                      <Text style={styles.sectionTimeText}>
                        {displaySectionTimes[section - 1].start}~{displaySectionTimes[section - 1].end}
                      </Text>
                    )}
                  </View>

                  {/* 每天的课程单元格 */}
                  {getDisplayDateRange().map((dateOffset, index) => {
                    // 计算实际的日期
                    const exactDate = getExactDateForDay(dateOffset);
                    
                    // 计算实际的星期几（1-7）
                    let dayOfWeek;
                    if (daysToShow === 7) {
                      dayOfWeek = index + 1; // 周一到周日
                    } else {
                      // 昨天、今天、明天对应的星期几
                      const today = new Date().getDay() || 7;
                      dayOfWeek = (today + dateOffset + 7) % 7 || 7;
                    }
                    
                    // 获取该日期的节数
                    const dateSectionCount = getSectionCountForDate(exactDate);
                    // 获取该日期的学期
                    const dateSemester = getSemesterForDate(exactDate);
                    // 判断是否是默认学期
                    const isDefaultSemester = dateSemester.id === 'default';
                    
                    const courseData = getCourseAt(dayOfWeek, section, exactDate);
                    const course = courseData?.course;
                    const courseIndex = courseData?.index;
                    const isFirstSection = courseData?.isFirstSection;
                    const today = new Date();
                    const isToday = exactDate.getDate() === today.getDate() && 
                                   exactDate.getMonth() === today.getMonth() && 
                                   exactDate.getFullYear() === today.getFullYear();

                    return (
                      <View
                        key={index}
                        style={[
                          styles.courseCell,
                          { width: columnWidth, height: rowHeight },
                          isToday && styles.todayCell,
                          (section > dateSectionCount || isDefaultSemester) && styles.disabledCell
                        ]}
                      >
                        {!isDefaultSemester && section <= dateSectionCount && isFirstSection && course && (() => {
                          // 找到对应的 timeSlot
                          const targetSlot = course.timeSlots.find(
                            slot => slot.dayOfWeek === dayOfWeek && slot.classSections.includes(section)
                          );
                          if (targetSlot) {
                            // 计算课程块的高度
                            const startSection = Math.min(...targetSlot.classSections);
                            const endSection = Math.max(...targetSlot.classSections);
                            const courseHeight = (endSection - startSection + 1) * rowHeight;
                            
                            return (
                              <TouchableOpacity
                                style={[
                                  styles.courseBlock,
                                  {
                                    backgroundColor: course.color || '#3498db',
                                    height: courseHeight - 2,
                                    width: columnWidth - 2,
                                    position: 'absolute',
                                    top: 1,
                                    left: 1,
                                    zIndex: 1000
                                  }
                                ]}
                                onPress={() => {
                                  setSelectedCourse(course);
                                  setSelectedCourseIndex(courseIndex !== undefined ? courseIndex : null);
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.courseName} numberOfLines={2}>
                                  {course.name}
                                </Text>
                                {course.location && (
                                  <Text style={styles.courseLocation} numberOfLines={1}>
                                    {course.location}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {/* 课程详情模态框 */}
      <Modal
        visible={!!selectedCourse}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedCourse(null)}
          />
          <View style={styles.modalContent}>
            {selectedCourse && (
              <>
                <Text style={styles.modalTitle}>课程详情</Text>
                <Text style={styles.modalCourseName}>{selectedCourse.name}</Text>
                
                {selectedCourse.code && (
                  <Text style={styles.modalDetail}>课程代码: {selectedCourse.code}</Text>
                )}
                {selectedCourse.location && (
                  <Text style={styles.modalDetail}>上课地点: {selectedCourse.location}</Text>
                )}
                {selectedCourse.teacher && (
                  <Text style={styles.modalDetail}>任课老师: {selectedCourse.teacher}</Text>
                )}
                {selectedCourse.credits && (
                  <Text style={styles.modalDetail}>学分: {selectedCourse.credits}</Text>
                )}
                {selectedCourse.assessmentMethod && (
                  <Text style={styles.modalDetail}>考核方式: {selectedCourse.assessmentMethod}</Text>
                )}
                
                <Text style={styles.modalDetailTitle}>上课时间:</Text>
                {selectedCourse.timeSlots.map((slot, index) => (
                  <Text key={index} style={styles.modalTimeSlot}>
                    {weekDays[slot.dayOfWeek - 1]} {slot.classSections.join('-')}节 ({slot.weekRange}周, {slot.repeatRule})
                  </Text>
                ))}
                
                {selectedCourse.notes && (
                  <>
                    <Text style={styles.modalDetailTitle}>备注:</Text>
                    <Text style={styles.modalNotes}>{selectedCourse.notes}</Text>
                  </>
                )}
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      if (selectedCourseIndex !== null && onEditCourse) {
                        onEditCourse(selectedCourseIndex);
                      }
                      setSelectedCourse(null);
                    }}
                  >
                    <Text style={styles.actionButtonText}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      Alert.alert(
                        '确认删除',
                        '确定要删除这门课程吗？',
                        [
                          {
                            text: '取消',
                            style: 'cancel'
                          },
                          {
                            text: '删除',
                            style: 'destructive',
                            onPress: () => {
                              if (selectedCourseIndex !== null && onDeleteCourse) {
                                onDeleteCourse(selectedCourseIndex);
                              }
                              setSelectedCourse(null);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.actionButtonText}>删除</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeButton]}
                    onPress={() => setSelectedCourse(null)}
                  >
                    <Text style={styles.actionButtonText}>关闭</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 周切换浮动按钮 */}
      <TouchableOpacity 
        style={[
          styles.weekPrevButton, 
          { left: buttonSpacing }
        ]} 
        onPress={goToPreviousWeek}
      >
        <Text style={styles.weekButtonText}>← 上一周</Text>
      </TouchableOpacity>

      {isCurrentWeek && (
        <TouchableOpacity 
          style={[
            styles.weekCurrentButton,
            { left: '50%', marginLeft: -40 }
          ]} 
          onPress={goToCurrentWeek}
        >
          <Text style={styles.weekButtonText}>返回本周</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[
          styles.weekNextButton, 
          { right: buttonSpacing }
        ]} 
        onPress={goToNextWeek}
      >
        <Text style={styles.weekButtonText}>下一周 →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#3498db'
  },
  dateInfo: {
    flexDirection: 'column'
  },
  currentDate: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500'
  },
  weekInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4
  },
  headerButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500'
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  weekNavButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginHorizontal: 5
  },


  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  sectionRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  cornerCell: {
    backgroundColor: '#f0f0f0'
  },
  weekDayCell: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd'
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  todayColumn: {
    backgroundColor: '#fff3e0',
    borderBottomColor: '#ff9800',
    borderBottomWidth: 2
  },
  sectionCell: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd'
  },
  sectionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333'
  },
  sectionTimeText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  courseCell: {
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    position: 'relative'
  },
  disabledCell: {
    backgroundColor: '#f9f9f9'
  },
  todayCell: {
    backgroundColor: '#fff3e0'
  },
  courseBlock: {
    padding: 6,
    borderRadius: 4,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  courseName: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2
  },
  courseLocation: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  addButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
    backgroundColor: '#fafafa',
    borderRadius: 4
  },
  addButtonText: {
    fontSize: 20,
    color: '#999'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '85%',
    maxHeight: '70%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333'
  },
  modalCourseName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  modalDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  modalDetailTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 12,
    marginBottom: 6
  },
  modalTimeSlot: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 10
  },
  modalNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500'
  },
  editButton: {
    backgroundColor: '#3498db'
  },
  deleteButton: {
    backgroundColor: '#e74c3c'
  },
  closeButton: {
    backgroundColor: '#95a5a6'
  },
  weekPrevButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  weekNextButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  weekCurrentButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#2ecc71',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  weekButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default CourseSchedule;
