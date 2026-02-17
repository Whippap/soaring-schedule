import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { WidgetCourseData } from '../src/utils/widgetData';

interface CourseWidgetProps {
  widgetSize?: 'small' | 'medium' | 'large';
  data?: WidgetCourseData;
}

const CourseWidget: React.FC<CourseWidgetProps> = ({ 
  widgetSize = 'medium',
  data 
}) => {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const currentDate = new Date();
  
  const widgetDimensions = {
    small: { width: 150, height: 150 },
    medium: { width: 320, height: 150 },
    large: { width: 320, height: 300 }
  };

  const dimensions = widgetDimensions[widgetSize];
  const todayCourses = data?.todayCourses || [];
  const primaryColor = data?.primaryColor || '#3498db';

  return (
    <View style={[styles.widgetContainer, { width: dimensions.width, height: dimensions.height }]}>
      <View style={styles.widgetHeader}>
        <Text style={styles.widgetDate}>{format(currentDate, 'MM月dd日')}</Text>
        <Text style={styles.widgetWeekDay}>周{weekDays[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}</Text>
      </View>

      {widgetSize === 'small' ? (
        <View style={styles.smallWidgetContent}>
          <Text style={styles.smallCourseCount}>
            {todayCourses.length > 0 ? `${todayCourses.length} 节课` : '无课'}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {todayCourses.length > 0 ? (
            <View style={styles.courseList}>
              {todayCourses.slice(0, widgetSize === 'large' ? 5 : 2).map((course, index) => (
                <View key={index} style={styles.courseItem}>
                  <View style={[styles.courseDot, { backgroundColor: course.color || primaryColor }]} />
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
              {todayCourses.length > (widgetSize === 'large' ? 5 : 2) && (
                <Text style={styles.moreCourses}>
                  +{todayCourses.length - (widgetSize === 'large' ? 5 : 2)} 更多课程
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.noCourseContainer}>
              <Text style={styles.noCourseText}>今天没有课程</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
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
  smallWidgetContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  smallCourseCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db'
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

export default CourseWidget;
