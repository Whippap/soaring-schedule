import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useCourseStore } from '../stores/courseStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Semester } from '../types';
import JwxtWebView from './JwxtWebView';
import SemesterForm from './SemesterForm';
import { ParsedData, convertToCourses, calculateMaxWeekFromCourses, calculateMaxSectionFromCourses, enhanceExtractedData } from '../utils/jwxtParser';

interface CourseImportWizardProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'webview' | 'select-semester' | 'confirm';

const CourseImportWizard: React.FC<CourseImportWizardProps> = ({ 
  visible, 
  onClose 
}) => {
  const [step, setStep] = useState<Step>('webview');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [selectedDataSemester, setSelectedDataSemester] = useState<string | null>(null);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoCreateSemester, setAutoCreateSemester] = useState<Omit<Semester, 'id'> | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setStep('webview');
      setParsedData(null);
      setSelectedSemesterId(null);
      setSelectedDataSemester(null);
      setShowSemesterForm(false);
      setImporting(false);
      setAutoCreateSemester(null);
      setOverwriteExisting(false);
    }
  }, [visible]);
  
  const { addCourse, removeCoursesBySemester } = useCourseStore();
  const { semesters, addSemester } = useSettingsStore();

  const checkSemesterConflict = (newSemester: Omit<Semester, 'id'>): Semester[] => {
    const conflicts: Semester[] = [];
    const newStart = new Date(newSemester.startDate);
    const newEnd = new Date(newSemester.endDate);
    
    semesters.forEach(existing => {
      const existingStart = new Date(existing.startDate);
      const existingEnd = new Date(existing.endDate);
      
      if (!(newEnd < existingStart || newStart > existingEnd)) {
        conflicts.push(existing);
      }
    });
    
    return conflicts;
  };

  const getDefaultStartDate = (semesterName: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    
    if (semesterName.includes('春')) {
      return `${year}-02-15`;
    } else if (semesterName.includes('秋')) {
      return `${year}-09-01`;
    } else {
      return `${year}-02-15`;
    }
  };

  const handleSelectDataSemester = (dataSemester: string) => {
    setSelectedDataSemester(dataSemester);
    
    const selectedParsedSemester = parsedData?.semesters.find(s => s.dataSemester === dataSemester);
    if (selectedParsedSemester) {
      const existingSemester = semesters.find(s => s.name === selectedParsedSemester.name);
      if (existingSemester) {
        setSelectedSemesterId(existingSemester.id);
      } else {
        setSelectedSemesterId(null);
      }
    }
  };

  const handleAutoCreateSemester = () => {
    if (!parsedData || !selectedDataSemester) return;
    
    const selectedParsedSemester = parsedData.semesters.find(s => s.dataSemester === selectedDataSemester);
    if (!selectedParsedSemester) return;
    
    const filteredCourses = parsedData.courses.filter(c => c.dataSemester === selectedDataSemester);
    const maxWeek = calculateMaxWeekFromCourses(filteredCourses.length > 0 ? filteredCourses : parsedData.courses);
    const maxSection = calculateMaxSectionFromCourses(filteredCourses.length > 0 ? filteredCourses : parsedData.courses);
    
    const defaultStartDate = getDefaultStartDate(selectedParsedSemester.name);
    
    const newSemester: Omit<Semester, 'id'> = {
      name: selectedParsedSemester.name,
      startDate: defaultStartDate,
      endDate: defaultStartDate,
      weekCount: maxWeek,
      sectionCount: maxSection,
      sectionTimes: []
    };
    
    console.log('创建学期:', newSemester);
    setAutoCreateSemester(newSemester);
    
    // 等待状态更新后再显示表单
    setTimeout(() => {
      setShowSemesterForm(true);
    }, 100);
  };

  const handleDataExtracted = (data: ParsedData) => {
    console.log('收到提取的数据:', data);
    console.log('学期数量:', data.semesters.length);
    console.log('课程数量:', data.courses.length);
    
    // 增强数据，补充地点信息
    const enhancedData = enhanceExtractedData(data);
    setParsedData(enhancedData);
    setStep('select-semester');
    
    if (enhancedData.semesters.length > 0) {
      handleSelectDataSemester(enhancedData.semesters[0].dataSemester);
    }
  };

  const handleCreateSemester = (semesterData: Omit<Semester, 'id'>) => {
    const conflicts = checkSemesterConflict(semesterData);
    
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(s => s.name).join('、');
      Alert.alert(
        '学期时间冲突',
        `新创建的学期与以下学期存在时间冲突：\n${conflictNames}\n\n是否继续创建？`,
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '继续创建', 
            onPress: () => {
              addSemester(semesterData);
            }
          }
        ]
      );
    } else {
      addSemester(semesterData);
    }
  };

  const handleImport = async () => {
    if (!parsedData || (!selectedSemesterId && semesters.length === 0)) {
      Alert.alert('提示', '请先选择或创建一个学期');
      return;
    }

    setImporting(true);
    
    try {
      const targetSemesterId = selectedSemesterId || semesters[0].id;
      
      // 如果选择了覆盖，则先删除该学期的所有课程
      if (overwriteExisting && selectedSemesterId) {
        await removeCoursesBySemester(selectedSemesterId);
      }
      
      const courses = convertToCourses(
        parsedData.courses, 
        targetSemesterId, 
        selectedDataSemester || undefined
      );
      
      if (courses.length === 0) {
        Alert.alert('提示', '没有找到可导入的课程');
        setImporting(false);
        return;
      }
      
      for (const course of courses) {
        await addCourse(course);
      }
      
      Alert.alert('成功', `成功导入 ${courses.length} 门课程\n\n解析结果不一定全部正确，请您再次检查是否有课程缺失或时间错误。\n网课无固定上课时间，不会被导入。`);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('错误', '导入课程失败');
    } finally {
      setImporting(false);
    }
  };

  const renderWebViewStep = () => (
    <JwxtWebView
      visible={visible && step === 'webview'}
      onClose={onClose}
      onDataExtracted={handleDataExtracted}
    />
  );

  const minWeekCount = useMemo(() => {
    if (!parsedData) return 20;
    
    const filteredCourses = selectedDataSemester 
      ? parsedData.courses.filter(c => c.dataSemester === selectedDataSemester)
      : parsedData.courses;
      
    return calculateMaxWeekFromCourses(filteredCourses);
  }, [parsedData, selectedDataSemester]);

  const maxSectionCount = useMemo(() => {
    if (!parsedData) return 10;
    
    const filteredCourses = selectedDataSemester 
      ? parsedData.courses.filter(c => c.dataSemester === selectedDataSemester)
      : parsedData.courses;
      
    return calculateMaxSectionFromCourses(filteredCourses);
  }, [parsedData, selectedDataSemester]);

  const renderSelectSemesterStep = () => {
    if (!parsedData) return null;
    
    const selectedParsedSemester = selectedDataSemester 
      ? parsedData.semesters.find(s => s.dataSemester === selectedDataSemester)
      : null;
      
    const filteredCourses = selectedDataSemester 
      ? parsedData.courses.filter(c => c.dataSemester === selectedDataSemester)
      : parsedData.courses;

    return (
      <Modal
        visible={visible && step === 'select-semester'}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('webview')} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>选择学期</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.content}>
            {parsedData.semesters.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>检测到的学期</Text>
                <Text style={styles.hintText}>
                  {selectedParsedSemester 
                    ? `已提取到 ${selectedParsedSemester.name} 的课程，共 ${filteredCourses.length} 门` 
                    : '选择要导入的学期'}
                </Text>
                {parsedData.semesters.map((sem) => (
                  <TouchableOpacity
                    key={sem.dataSemester}
                    style={[
                      styles.optionItem,
                      selectedDataSemester === sem.dataSemester && styles.selectedOption
                    ]}
                    onPress={() => handleSelectDataSemester(sem.dataSemester)}
                  >
                    <Text style={styles.optionText}>{sem.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>选择目标学期</Text>
              
              {semesters.length > 0 ? (
                semesters.map((sem) => (
                  <TouchableOpacity
                    key={sem.id}
                    style={[
                      styles.optionItem,
                      selectedSemesterId === sem.id && styles.selectedOption
                    ]}
                    onPress={() => setSelectedSemesterId(sem.id)}
                  >
                    <Text style={styles.optionText}>{sem.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>暂无学期，请先创建</Text>
              )}

              {selectedParsedSemester && !semesters.some(s => s.name === selectedParsedSemester.name) && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.autoCreateButton]}
                  onPress={handleAutoCreateSemester}
                >
                  <Text style={styles.actionButtonText}>
                    创建「{selectedParsedSemester?.name}」学期
                  </Text>
                </TouchableOpacity>
              )}

              {selectedSemesterId && (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    overwriteExisting && styles.selectedOption
                  ]}
                  onPress={() => setOverwriteExisting(!overwriteExisting)}
                >
                  <Text style={styles.optionText}>
                    {overwriteExisting ? '✓ 覆盖原有学期课程' : '覆盖原有学期课程'}
                  </Text>
                  <Text style={styles.hintText}>
                    {overwriteExisting ? '将删除该学期所有现有课程并导入新课程' : '勾选后将替换该学期的所有课程'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.createButton]}
                onPress={() => {
                  setAutoCreateSemester(null);
                  setShowSemesterForm(true);
                }}
              >
                <Text style={styles.actionButtonText}>创建新学期</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>预览</Text>
              <Text style={styles.previewText}>
                找到 {parsedData.courses.length} 门课程
              </Text>
              {parsedData.courses.slice(0, 5).map((course, index) => (
                <Text key={index} style={styles.coursePreview}>
                  • {course.name}
                </Text>
              ))}
              {parsedData.courses.length > 5 && (
                <Text style={styles.moreText}>
                  ...还有 {parsedData.courses.length - 5} 门课程
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.actionButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.importButton,
                (!selectedSemesterId && semesters.length === 0) && styles.disabledButton
              ]}
              onPress={handleImport}
              disabled={(!selectedSemesterId && semesters.length === 0) || importing}
            >
              {importing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>导入课程</Text>
              )}
            </TouchableOpacity>
          </View>

          <SemesterForm
            visible={showSemesterForm}
            onClose={() => {
              setShowSemesterForm(false);
              setAutoCreateSemester(null);
            }}
            onSave={(semester) => {
              handleCreateSemester(semester);
              setTimeout(() => {
                const newSemesters = [...useSettingsStore.getState().semesters];
                if (newSemesters.length > 0) {
                  setSelectedSemesterId(newSemesters[newSemesters.length - 1].id);
                }
              }, 100);
            }}
            initialSemester={autoCreateSemester ? {
              ...autoCreateSemester,
              id: ''
            } as Semester : undefined}
            minWeekCount={minWeekCount}
            maxSectionCount={maxSectionCount}
          />
        </View>
      </Modal>
    );
  };

  return (
    <>
      {step === 'webview' && renderWebViewStep()}
      {step === 'select-semester' && renderSelectSemesterStep()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 24,
    color: '#333'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    flex: 1,
    padding: 20
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db'
  },
  optionText: {
    fontSize: 15,
    color: '#333'
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 15
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  coursePreview: {
    fontSize: 13,
    color: '#555',
    marginBottom: 5
  },
  moreText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic'
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  createButton: {
    backgroundColor: '#2ecc71',
    marginTop: 10
  },
  autoCreateButton: {
    backgroundColor: '#f39c12'
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6'
  },
  importButton: {
    flex: 1,
    backgroundColor: '#3498db'
  },
  disabledButton: {
    backgroundColor: '#bdc3c7'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16
  }
});

export default CourseImportWizard;
