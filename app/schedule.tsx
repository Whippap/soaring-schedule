import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import CourseForm from '../src/components/CourseForm';
import SemesterForm from '../src/components/SemesterForm';
import TimeTableEditor from '../src/components/TimeTableEditor';
import { useCourseStore } from '../src/stores/courseStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { Course, Semester } from '../src/types';

type ViewMode = '学期' | '课程';

export default function ScheduleScreen() {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    loadData
  } = useCourseStore();

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('课程');
  
  // 学期管理相关状态
  const {
    semesters,
    addSemester,
    updateSemester,
    deleteSemester,
    loadSettings
  } = useSettingsStore();
  
  const [showTimeTableEditor, setShowTimeTableEditor] = useState(false);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [semesterToEdit, setSemesterToEdit] = useState<Semester | null>(null);
  const [selectedSemesterForCourses, setSelectedSemesterForCourses] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [loadData, loadSettings]);





  const handleEditSemester = (semester: Semester) => {
    setSemesterToEdit(semester);
    setShowSemesterForm(true);
  };

  const handleDeleteSemester = (id: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个学期吗？',
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSemester(id);
              Alert.alert('成功', '学期已删除');
            } catch (error: any) {
              Alert.alert('错误', error.message);
            }
          }
        }
      ]
    );
  };

  const resetSemesterForm = () => {
    setSemesterToEdit(null);
    setShowSemesterForm(true);
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

  const handleSaveSemester = async (semesterData: Omit<Semester, 'id'>) => {
    try {
      if (semesterToEdit) {
        await updateSemester(semesterToEdit.id, semesterData);
        Alert.alert('成功', '学期信息已更新');
      } else {
        await addSemester(semesterData);
        Alert.alert('成功', '学期已添加');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message);
    }
  };

  const filteredCourses = selectedSemesterForCourses
    ? courses.filter(course => course.semesterId === selectedSemesterForCourses)
    : courses;
  
  const renderCourseItem = ({ item, index }: { item: Course; index: number }) => {
    // 找到项目在原始 courses 数组中的索引
    const originalIndex = courses.findIndex(c => {
      // 使用课程名称和学期ID来唯一标识课程
      return c.name === item.name && c.semesterId === item.semesterId;
    });
    const semester = semesters.find(s => s.id === item.semesterId);
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEditCourse(originalIndex)}
              >
                <Ionicons name="pencil-outline" size={20} color="#3498db" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
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
                        onPress: () => deleteCourse(originalIndex)
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          </View>
          {semester && (
            <Text style={styles.itemDetail}>学期: {semester.name}</Text>
          )}
          {item.timeSlots.length > 0 && (
            <Text style={styles.itemDetail}>
              时间: 周{item.timeSlots[0].dayOfWeek} {item.timeSlots[0].classSections.join(',')}节
            </Text>
          )}
          {item.location && (
            <Text style={styles.itemDetail}>地点: {item.location}</Text>
          )}
          {item.teacher && (
            <Text style={styles.itemDetail}>教师: {item.teacher}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 顶栏切换按钮 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.headerToggleButton}
              onPress={() => setViewMode(viewMode === '课程' ? '学期' : '课程')}
            >
              <Ionicons 
                name={viewMode === '课程' ? "school-outline" : "calendar-outline"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.headerTitle}>{viewMode}</Text>
            </TouchableOpacity>
            
            {/* 添加学期按钮 */}
            {viewMode === '学期' && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={resetSemesterForm}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>添加学期</Text>
              </TouchableOpacity>
            )}
            
            {/* 添加课程按钮 */}
            {viewMode === '课程' && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  setEditingCourseIndex(null);
                  setShowCourseForm(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>添加课程</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 内容区域 */}
        {viewMode === '课程' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>课程 ({filteredCourses.length})</Text>
            
            {/* 学期筛选器 */}
            {semesters.length > 0 && (
              <View style={styles.semesterFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.semesterFilterOption,
                    !selectedSemesterForCourses && styles.semesterFilterOptionActive
                  ]}
                  onPress={() => setSelectedSemesterForCourses(null)}
                >
                  <Text
                    style={[
                      styles.semesterFilterOptionText,
                      !selectedSemesterForCourses && styles.semesterFilterOptionTextActive
                    ]}
                  >
                    全部
                  </Text>
                </TouchableOpacity>
                {semesters.map((semester) => (
                  <TouchableOpacity
                    key={semester.id}
                    style={[
                      styles.semesterFilterOption,
                      selectedSemesterForCourses === semester.id && styles.semesterFilterOptionActive
                    ]}
                    onPress={() => setSelectedSemesterForCourses(semester.id)}
                  >
                    <Text
                      style={[
                        styles.semesterFilterOptionText,
                        selectedSemesterForCourses === semester.id && styles.semesterFilterOptionTextActive
                      ]}
                    >
                      {semester.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {filteredCourses.length > 0 ? (
              <FlatList
                data={filteredCourses}
                renderItem={renderCourseItem}
                keyExtractor={(item, index) => `course-${index}`}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>暂无课程</Text>
            )}
          </View>
        )}

        {viewMode === '学期' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>学期管理</Text>
            
            {/* 学期选择 */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>当前学期</Text>
              <View style={styles.selectContainer}>
                {(() => {
                  const currentDate = new Date();
                  // 查找包含当前日期的学期
                  const currentSemester = semesters.find((semester: Semester) => {
                    const startDate = new Date(semester.startDate);
                    const endDate = new Date(semester.endDate);
                    return currentDate >= startDate && currentDate <= endDate;
                  });
                  
                  if (currentSemester) {
                    return (
                      <TouchableOpacity
                        key={currentSemester.id}
                        style={[
                          styles.semesterOption,
                          styles.semesterOptionActive
                        ]}
                      >
                        <Text 
                          style={[
                            styles.semesterOptionText,
                            styles.semesterOptionTextActive
                          ]}
                        >
                          {currentSemester.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  } else {
                    // 没有学期包含当前日期，显示假期
                    return (
                      <View style={styles.semesterOption}>
                        <Text style={styles.semesterOptionText}>假期</Text>
                      </View>
                    );
                  }
                })()}
              </View>
            </View>



            {/* 学期列表 */}
            {semesters.length > 0 && (
              <View style={styles.semesterList}>
                <Text style={styles.listTitle}>已添加学期</Text>
                {semesters.map((semester: Semester) => (
                  <View key={semester.id} style={styles.semesterItem}>
                    <View style={styles.semesterInfo}>
                      <Text style={styles.semesterName}>{semester.name}</Text>
                      <Text style={styles.semesterDate}>
                        {semester.startDate}
                      </Text>
                      <Text style={styles.semesterWeeks}>{semester.weekCount}周</Text>
                    </View>
                    <View style={styles.semesterActions}>
                      <TouchableOpacity 
                        style={styles.actionIcon}
                        onPress={() => handleEditSemester(semester)}
                      >
                        <Ionicons name="create-outline" size={20} color="#3498db" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionIcon}
                        onPress={() => handleDeleteSemester(semester.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 课程表单 */}
      <CourseForm
        visible={showCourseForm}
        onClose={() => setShowCourseForm(false)}
        onSave={handleSaveCourse}
        initialCourse={editingCourseIndex !== null ? courses[editingCourseIndex] : undefined}
      />

      {/* 时间设置编辑器 */}
      <TimeTableEditor 
        visible={showTimeTableEditor} 
        onClose={() => setShowTimeTableEditor(false)} 
        semesterId={semesterToEdit?.id}
      />

      {/* 学期表单 */}
      <SemesterForm
        visible={showSemesterForm}
        onClose={() => setShowSemesterForm(false)}
        onSave={handleSaveSemester}
        initialSemester={semesterToEdit || undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 40
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center'
  },
  itemContent: {
    flex: 1,
    padding: 16
  },
  deleteButton: {
    padding: 16,
    marginRight: 8
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1
  },
  itemActions: {
    flexDirection: 'row',
    gap: 15
  },
  editButton: {
    padding: 5
  },
  deleteButton: {
    padding: 5
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
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
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
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
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    minWidth: 200
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
  formGroup: {
    marginBottom: 20,
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
  formTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 15
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8
  },
  semesterOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginBottom: 8
  },
  semesterOptionActive: {
    backgroundColor: '#3498db'
  },
  semesterOptionText: {
    fontSize: 12,
    color: '#333'
  },
  semesterOptionTextActive: {
    color: 'white'
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center'
  },
  exportButton: {
    backgroundColor: '#3498db'
  },
  cancelButton: {
    backgroundColor: '#95a5a6'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14
  },
  semesterList: {
    marginTop: 20
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 15
  },
  semesterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  semesterInfo: {
    flex: 1
  },
  semesterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  semesterDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  semesterWeeks: {
    fontSize: 12,
    color: '#999'
  },
  semesterActions: {
    flexDirection: 'row',
    gap: 15
  },
  actionIcon: {
    padding: 5
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4
  },
  addButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500'
  },
  // 学期筛选器样式
  semesterFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15
  },
  semesterFilterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  semesterFilterOptionActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db'
  },
  semesterFilterOptionText: {
    fontSize: 12,
    color: '#333'
  },
  semesterFilterOptionTextActive: {
    color: 'white',
    fontWeight: '500'
  }
});
