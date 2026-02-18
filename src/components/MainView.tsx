import React from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import { Course } from '../types';
import CourseSchedule from './CourseSchedule';

interface MainViewProps {
  courses: Course[];
  onAddCourse: () => void;
  onEditCourse?: (index: number) => void;
  onDeleteCourse?: (index: number) => void;
}

const MainView: React.FC<MainViewProps> = ({ courses, onAddCourse, onEditCourse, onDeleteCourse }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <CourseSchedule 
          courses={courses} 
          onAddCourse={onAddCourse}
          onEditCourse={onEditCourse}
          onDeleteCourse={onDeleteCourse}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1
  }
});

export default MainView;
