import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal
} from 'react-native';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Course, Task } from '../types';

interface CalendarViewProps {
  courses: Course[];
  tasks: Task[];
  onAddTask: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const CALENDAR_WIDTH = screenWidth - 40;
const CELL_SIZE = CALENDAR_WIDTH / 7;

const CalendarView: React.FC<CalendarViewProps> = ({ courses, tasks, onAddTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayDetails, setShowDayDetails] = useState(false);

  // 生成日历数据
  const generateCalendarDays = () => {
    const daysInMonth = [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // 周一开始
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    let day = startDate;
    while (day <= endDate) {
      daysInMonth.push(day);
      day = addDays(day, 1);
    }

    return daysInMonth;
  };

  // 获取指定日期的课程
  const getCoursesForDate = (date: Date): Course[] => {
    // 这里需要根据日期计算出对应的周数和星期，然后匹配课程
    // 简化实现：暂时返回所有课程
    return courses;
  };

  // 获取指定日期的事务
  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => task.date === dateStr);
  };

  // 检查日期是否有课程
  const hasCourses = (date: Date): boolean => {
    return getCoursesForDate(date).length > 0;
  };

  // 检查日期是否有事务
  const hasTasks = (date: Date): boolean => {
    return getTasksForDate(date).length > 0;
  };

  // 处理日期点击
  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    setShowDayDetails(true);
  };

  // 切换到上个月
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // 切换到下个月
  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 切换到今天
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <View style={styles.container}>
      {/* 日历头部 */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.monthText}>
            {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
          </Text>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.todayButton}>今天</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 星期标题 */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day, index) => (
          <View key={index} style={[styles.weekDayCell, { width: CELL_SIZE }]}>
            <Text style={[styles.weekDayText, index >= 5 && styles.weekendText]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 日历网格 */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const hasCourse = hasCourses(date);
          const hasTask = hasTasks(date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarCell,
                { width: CELL_SIZE, height: CELL_SIZE },
                !isCurrentMonth && styles.otherMonthCell,
                isSelected && styles.selectedCell,
                isToday(date) && styles.todayCell
              ]}
              onPress={() => handleDatePress(date)}
              disabled={!isCurrentMonth}
            >
              <Text style={[
                styles.dateText,
                !isCurrentMonth && styles.otherMonthText,
                isSelected && styles.selectedDateText,
                isToday(date) && styles.todayDateText,
                (index % 7 === 5 || index % 7 === 6) && styles.weekendDateText
              ]}>
                {format(date, 'd')}
              </Text>
              
              {/* 标记点 */}
              <View style={styles.markersContainer}>
                {hasCourse && <View style={[styles.marker, styles.courseMarker]} />}
                {hasTask && <View style={[styles.marker, styles.taskMarker]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 添加事务按钮 */}
      <TouchableOpacity style={styles.addButton} onPress={onAddTask}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* 日期详情模态框 */}
      <Modal
        visible={showDayDetails && selectedDate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayDetails(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayDetails(false)}
        >
          <View style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedDate && (
              <>
                <Text style={styles.modalTitle}>
                  {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                </Text>
                
                {/* 当天课程 */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>课程</Text>
                  {getCoursesForDate(selectedDate).length > 0 ? (
                    getCoursesForDate(selectedDate).map((course, index) => (
                      <View key={index} style={styles.modalItem}>
                        <Text style={styles.modalItemTitle}>{course.name}</Text>
                        {course.location && (
                          <Text style={styles.modalItemDetail}>地点: {course.location}</Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.modalEmptyText}>暂无课程</Text>
                  )}
                </View>
                
                {/* 当天事务 */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>事务</Text>
                  {getTasksForDate(selectedDate).length > 0 ? (
                    getTasksForDate(selectedDate).map((task, index) => (
                      <View key={index} style={styles.modalItem}>
                        <Text style={styles.modalItemTitle}>{task.name}</Text>
                        {task.startTime && (
                          <Text style={styles.modalItemDetail}>时间: {task.startTime} - {task.endTime || '结束时间'}</Text>
                        )}
                        {task.location && (
                          <Text style={styles.modalItemDetail}>地点: {task.location}</Text>
                        )}
                        <Text style={[
                          styles.modalItemStatus,
                          task.status === '已完成' ? styles.completedStatus : styles.pendingStatus
                        ]}>
                          {task.status}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.modalEmptyText}>暂无事务</Text>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDayDetails(false)}
                >
                  <Text style={styles.closeButtonText}>关闭</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerButton: {
    padding: 10
  },
  headerButtonText: {
    fontSize: 24,
    color: '#3498db'
  },
  headerTitle: {
    alignItems: 'center'
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  todayButton: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 4
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 10
  },
  weekDayCell: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  weekendText: {
    color: '#e74c3c'
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  calendarCell: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white'
  },
  otherMonthCell: {
    backgroundColor: '#f9f9f9'
  },
  selectedCell: {
    backgroundColor: '#e3f2fd'
  },
  todayCell: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 1.5
  },
  dateText: {
    fontSize: 16,
    color: '#333'
  },
  otherMonthText: {
    color: '#999'
  },
  selectedDateText: {
    fontWeight: 'bold',
    color: '#1976d2'
  },
  todayDateText: {
    fontWeight: 'bold',
    color: '#f57c00'
  },
  weekendDateText: {
    color: '#e74c3c'
  },
  markersContainer: {
    flexDirection: 'row',
    marginTop: 4
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2
  },
  courseMarker: {
    backgroundColor: '#3498db'
  },
  taskMarker: {
    backgroundColor: '#f39c12'
  },
  addButton: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
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
  addButtonText: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  modalSection: {
    marginBottom: 20
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333'
  },
  modalItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  modalItemDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  modalItemStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4
  },
  completedStatus: {
    color: '#4caf50'
  },
  pendingStatus: {
    color: '#f39c12'
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20
  },
  closeButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16
  }
});

export default CalendarView;
