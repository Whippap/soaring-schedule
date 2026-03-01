import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Course } from '../types';
import CourseForm from './CourseForm';

interface CourseListProps {
  courses: Course[];
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (index: number, course: Course) => void;
  onDeleteCourse: (index: number) => void;
  onRefresh?: () => void;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onRefresh
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  const handleAddCourse = () => {
    setEditingIndex(null);
    setShowForm(true);
  };

  const handleEditCourse = (index: number) => {
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDeleteCourse = (index: number) => {
    Alert.alert(
      '确认删除',
      '确定要删除这门课程吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDeleteCourse(index)
        }
      ]
    );
  };

  const handleSaveCourse = (course: Course) => {
    if (editingIndex !== null) {
      onUpdateCourse(editingIndex, course);
    } else {
      onAddCourse(course);
    }
  };

  const renderCourse = ({ item, index }: { item: Course; index: number }) => {
    return (
      <TouchableOpacity
        style={[styles.courseCard, { borderLeftColor: item.color || '#3498db' }]}
        onPress={() => handleEditCourse(index)}
      >
        <View style={styles.courseHeader}>
          <Text style={styles.courseName}>{item.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCourse(index)}
          >
            <Text style={styles.deleteButtonText}>删除</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.courseInfo}>
          {item.code && <Text style={styles.courseDetail}>代码: {item.code}</Text>}
          {item.location && <Text style={styles.courseDetail}>地点: {item.location}</Text>}
          {item.teacher && <Text style={styles.courseDetail}>老师: {item.teacher}</Text>}
          {item.credits && <Text style={styles.courseDetail}>学分: {item.credits}</Text>}
        </View>
        
        <View style={styles.timeSlotsContainer}>
          <Text style={styles.timeSlotsTitle}>时间段:</Text>
          <Text style={styles.timeSlot}>
            {(() => {
              const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
              const displaySlots = item.timeSlots.slice(0, 2);
              let timeText = '';
              displaySlots.forEach((slot, idx) => {
                const dayText = weekDays[slot.dayOfWeek - 1];
                const sectionsText = slot.classSections.join('-');
                timeText += `周${dayText} ${sectionsText}节 (${slot.weekRange}周)`;
                if (idx !== displaySlots.length - 1) {
                  timeText += '、';
                }
              });
              if (item.timeSlots.length > 2) {
                timeText += '等';
              }
              return timeText;
            })()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={handleAddCourse}>
        <Text style={styles.addButtonText}>+ 添加课程</Text>
      </TouchableOpacity>

      {courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>暂无课程</Text>
          <Text style={styles.emptyStateSubText}>点击上方按钮添加课程</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3498db']}
              tintColor="#3498db"
            />
          }
        />
      )}

      <CourseForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveCourse}
        initialCourse={editingIndex !== null ? courses[editingIndex] : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  addButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  listContent: {
    padding: 15,
    paddingTop: 0
  },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500'
  },
  courseInfo: {
    marginBottom: 10
  },
  courseDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  timeSlotsContainer: {
    marginTop: 10
  },
  timeSlotsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5
  },
  timeSlot: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
    paddingLeft: 10
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#ccc'
  }
});

export default CourseList;
