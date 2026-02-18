import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Course, Semester, SectionTime } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

interface CourseWithTime extends Course {
  startTime?: Date;
  endTime?: Date;
  timeSlot?: {
    start: string;
    end: string;
  };
}

interface WidgetPreviewProps {
  courses: Course[];
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({ 
  courses 
}) => {
  const { getCurrentSemester, primaryColor } = useSettingsStore();
  const currentDate = new Date();
  const currentSemester = getCurrentSemester(currentDate);

  const getWeekNumberForDate = (date: Date, semester: Semester): number => {
    if (semester.id === 'default') return 1;
    
    const [startYear, startMonth, startDay] = semester.startDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const displayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = displayDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);
    
    return Math.min(weekNum, semester.weekCount);
  };

  const isWeekInRange = (weekNum: number, weekRange: string): boolean => {
    try {
      const [start, end] = weekRange.split('-').map(Number);
      return weekNum >= start && weekNum <= end;
    } catch {
      return false;
    }
  };

  const parseTime = (timeStr: string, date: Date): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };

  const getTimeSlotForSection = (
    classSections: number[],
    sectionTimes: SectionTime[]
  ): { start: string; end: string } => {
    const sortedSections = [...classSections].sort((a, b) => a - b);
    const firstSection = sortedSections[0];
    const lastSection = sortedSections[sortedSections.length - 1];
    
    return {
      start: sectionTimes[firstSection - 1]?.start || '08:00',
      end: sectionTimes[lastSection - 1]?.end || '20:40'
    };
  };

  const getTodayCoursesWithTime = (): CourseWithTime[] => {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const weekNum = getWeekNumberForDate(today, currentSemester);

    const coursesWithTime: CourseWithTime[] = [];

    courses.forEach(course => {
      if (course.semesterId !== currentSemester.id) return;

      course.timeSlots.forEach(slot => {
        if (slot.dayOfWeek !== dayOfWeek) return;
        if (!isWeekInRange(weekNum, slot.weekRange)) return;

        const timeSlot = getTimeSlotForSection(slot.classSections, currentSemester.sectionTimes);
        const startTime = parseTime(timeSlot.start, today);
        const endTime = parseTime(timeSlot.end, today);

        coursesWithTime.push({
          ...course,
          startTime,
          endTime,
          timeSlot
        });
      });
    });

    return coursesWithTime;
  };

  const getRelevantCourses = (
    coursesWithTime: CourseWithTime[],
    currentTime: Date
  ): CourseWithTime[] => {
    const now = currentTime;

    const ongoingOrFutureCourses = coursesWithTime.filter(course => {
      if (course.endTime) {
        return course.endTime > now;
      }
      return false;
    });

    ongoingOrFutureCourses.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime.getTime() - b.startTime.getTime();
      }
      return 0;
    });

    return ongoingOrFutureCourses;
  };

  const todayCoursesWithTime = getTodayCoursesWithTime();
  const relevantCourses = getRelevantCourses(todayCoursesWithTime, currentDate);
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const displayCourses = relevantCourses.slice(0, 3);
  const hasCourses = relevantCourses.length > 0;

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.widgetHeader}>
        <Text style={styles.widgetDate}>{format(currentDate, 'MM月dd日')}</Text>
        <Text style={styles.widgetWeekDay}>周{weekDays[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}</Text>
      </View>

      <View style={styles.content}>
        {hasCourses ? (
          <View style={styles.courseList}>
            {displayCourses.map((course, index) => (
              <View key={index} style={styles.courseItem}>
                <View 
                  style={[styles.courseDot, { backgroundColor: course.color || primaryColor }]} 
                />
                <Text style={styles.courseName} numberOfLines={1}>
                  {course.name}
                </Text>
                {course.location && (
                  <Text style={styles.courseLocation} numberOfLines={1}>
                    {course.location}
                  </Text>
                )}
              </View>
            ))}
            {relevantCourses.length > 3 && (
              <Text style={styles.moreCourses}>
                +{relevantCourses.length - 3} 更多课程
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noCourseContainer}>
            <Text style={styles.noCourseText}>今天没有课了</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    width: 320,
    height: 150,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  widgetDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  widgetWeekDay: {
    fontSize: 14,
    color: '#666'
  },
  content: {
    flex: 1
  },
  courseList: {
    flex: 1,
    gap: 8
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  courseDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  courseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1
  },
  courseLocation: {
    fontSize: 12,
    color: '#666'
  },
  moreCourses: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  noCourseContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noCourseText: {
    fontSize: 14,
    color: '#999'
  }
});

export default WidgetPreview;
