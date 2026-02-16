import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    StyleSheet
} from 'react-native';
import CourseForm from '../src/components/CourseForm';
import MainView from '../src/components/MainView';
import { useCourseStore } from '../src/stores/courseStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { Course } from '../src/types';

export default function HomeScreen() {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    loadData
  } = useCourseStore();

  const { loadSettings } = useSettingsStore();

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      await loadSettings();
      await loadData();
    };
    initializeApp();
  }, [loadData, loadSettings]);

  const handleAddCourse = () => {
    setEditingCourseIndex(null);
    setShowCourseForm(true);
  };

  const handleEditCourse = (index: number) => {
    setEditingCourseIndex(index);
    setShowCourseForm(true);
  };

  const handleSaveCourse = (course: Course) => {
    if (editingCourseIndex !== null) {
      updateCourse(editingCourseIndex, course);
    } else {
      addCourse(course);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <MainView
        courses={courses}
        onAddCourse={handleAddCourse}
        onEditCourse={handleEditCourse}
        onDeleteCourse={(index) => deleteCourse(index)}
      />
      
      {/* 课程表单 */}
      <CourseForm
        visible={showCourseForm}
        onClose={() => setShowCourseForm(false)}
        onSave={handleSaveCourse}
        initialCourse={editingCourseIndex !== null ? courses[editingCourseIndex] : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});
