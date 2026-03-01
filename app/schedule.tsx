import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number | null>(null);
  
  // 学期管理相关状态
  const {
    semesters,
    addSemester,
    updateSemester,
    deleteSemester,
    loadSettings,
    primaryColor
  } = useSettingsStore();
  
  const [showTimeTableEditor, setShowTimeTableEditor] = useState(false);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [semesterToEdit, setSemesterToEdit] = useState<Semester | null>(null);
  const [selectedSemesterForCourses, setSelectedSemesterForCourses] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [loadData, loadSettings]);





  const [editMinWeekCount, setEditMinWeekCount] = useState<number | undefined>();
  const [editMaxSectionCount, setEditMaxSectionCount] = useState<number | undefined>();
  
  const handleEditSemester = (semester: Semester) => {
    setSemesterToEdit(semester);
    
    // 计算最小周数和最小节数
    const semesterCourses = courses.filter(c => c.semesterId === semester.id);
    if (semesterCourses.length > 0) {
      let maxWeek = 0;
      let maxSection = 0;
      
      for (const course of semesterCourses) {
        for (const slot of course.timeSlots) {
          const weekEndMatch = slot.weekRange.match(/-([0-9]+)/);
          if (weekEndMatch) {
            const endWeek = parseInt(weekEndMatch[1]);
            if (endWeek > maxWeek) {
              maxWeek = endWeek;
            }
          }
          
          if (slot.classSections && slot.classSections.length > 0) {
            const sectionMax = Math.max(...slot.classSections);
            if (sectionMax > maxSection) {
              maxSection = sectionMax;
            }
          }
        }
      }
      
      setEditMinWeekCount(maxWeek > 0 ? maxWeek : undefined);
      setEditMaxSectionCount(maxSection > 0 ? maxSection : undefined);
    } else {
      setEditMinWeekCount(undefined);
      setEditMaxSectionCount(undefined);
    }
    
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
      <TouchableOpacity 
        style={styles.itemCard}
        onPress={() => {
          setSelectedCourse(item);
          setSelectedCourseIndex(originalIndex);
        }}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity 
                style={styles.editButtonSmall}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditCourse(originalIndex);
                }}
              >
                <Ionicons name="pencil-outline" size={20} color="#3498db" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButtonSmall}
                onPress={(e) => {
                  e.stopPropagation();
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
                return `时间: ${timeText}`;
              })()}
            </Text>
          )}
          {item.location && (
            <Text style={styles.itemDetail}>地点: {item.location}</Text>
          )}
          {item.teacher && (
            <Text style={styles.itemDetail}>教师: {item.teacher}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 顶栏切换按钮 */}
        <View style={[styles.header, { backgroundColor: primaryColor }]}>
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
        minWeekCount={editMinWeekCount}
        maxSectionCount={editMaxSectionCount}
      />

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
                {selectedCourse.timeSlots.map((slot, index) => {
                  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
                  return (
                    <Text key={index} style={styles.modalTimeSlot}>
                      周{weekDays[slot.dayOfWeek - 1]} {slot.classSections.join('-')}节 ({slot.weekRange}周{slot.repeatRule ? `, ${slot.repeatRule}` : ''})
                    </Text>
                  );
                })}
                
                {selectedCourse.notes && (
                  <>
                    <Text style={styles.modalDetailTitle}>备注:</Text>
                    <Text style={styles.modalNotes}>{selectedCourse.notes}</Text>
                  </>
                )}
                
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalEditButton]}
                    onPress={() => {
                      if (selectedCourseIndex !== null) {
                        handleEditCourse(selectedCourseIndex);
                      }
                      setSelectedCourse(null);
                    }}
                  >
                    <Text style={styles.modalActionButtonText}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalDeleteButton]}
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
                              if (selectedCourseIndex !== null) {
                                deleteCourse(selectedCourseIndex);
                              }
                              setSelectedCourse(null);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.modalActionButtonText}>删除</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalCloseButton]}
                    onPress={() => setSelectedCourse(null)}
                  >
                    <Text style={styles.modalActionButtonText}>关闭</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  deleteButtonLarge: {
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
  editButtonSmall: {
    padding: 5
  },
  deleteButtonSmall: {
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
  },
  // 课程详情模态框样式
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10
  },
  modalActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center'
  },
  modalActionButtonText: {
    color: 'white',
    fontWeight: '500'
  },
  modalEditButton: {
    backgroundColor: '#3498db'
  },
  modalDeleteButton: {
    backgroundColor: '#e74c3c'
  },
  modalCloseButton: {
    backgroundColor: '#95a5a6'
  }
});
