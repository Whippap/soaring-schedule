import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../src/stores/settingsStore';
import CourseImportWizard from '../src/components/CourseImportWizard';
import { exportData, importData } from '../src/utils/dataBackup';

const SettingsScreen = () => {
  const {
    formatData,
    loadSettings,
    primaryColor,
    updatePrimaryColor
  } = useSettingsStore();
  
  const [showImportWizard, setShowImportWizard] = useState(false);
  
  // 主题颜色选择器颜色
  const themeColors = [
    '#3498db', // 蓝色
    '#2ecc71', // 绿色
    '#e74c3c', // 红色
    '#f39c12', // 橙色
    '#9b59b6', // 紫色
    '#1abc9c', // 青色
    '#e67e22', // 深橙色
    '#34495e'  // 深蓝色
  ];

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleFormatData = () => {
    Alert.alert(
      '确认格式化',
      '确定要恢复所有到默认选项，并且删除所有学期和课程吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '格式化',
          style: 'destructive',
          onPress: formatData
        }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      await exportData();
      Alert.alert('成功', '数据导出成功！');
    } catch (error) {
      Alert.alert('错误', '导出数据失败：' + (error as Error).message);
    }
  };

  const handleImportData = () => {
    Alert.alert(
      '二次确认',
      '导入数据将覆盖现有的所有课程和学期数据，确定要继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定导入',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await importData();
              if (success) {
                Alert.alert('成功', '数据导入成功！请重启应用以查看更改。');
              }
            } catch (error) {
              Alert.alert('错误', '导入数据失败：' + (error as Error).message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 导入课表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>导入课表</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.importButton]} 
            onPress={() => setShowImportWizard(true)}
          >
            <Text style={styles.actionButtonText}>从教务系统导入课表</Text>
          </TouchableOpacity>
          
          <Text style={styles.importDescription}>
            登录教务系统后，前往&quot;我的课表-全部课程&quot;页面，系统将自动提取您的课程信息并导入到本地。
          </Text>
        </View>

        {/* 主题设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>主题设置</Text>
          
          <Text style={styles.themeLabel}>选择主题颜色</Text>
          <View style={styles.colorPickerContainer}>
            {themeColors.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  primaryColor === color && styles.selectedColorButton
                ]}
                onPress={() => updatePrimaryColor(color)}
              >
                {primaryColor === color && <Text style={styles.colorCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 数据管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.exportButton]} 
            onPress={handleExportData}
          >
            <Text style={styles.actionButtonText}>导出应用数据</Text>
          </TouchableOpacity>
          
          <Text style={styles.importDescription}>
            导出当前所有课程和学期数据，以便备份或在其他设备上恢复。
          </Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.importDataButton]} 
            onPress={handleImportData}
          >
            <Text style={styles.actionButtonText}>导入应用数据</Text>
          </TouchableOpacity>
          
          <Text style={styles.formatDescription}>
            导入之前导出的数据，将覆盖当前所有课程和学期数据。
          </Text>
        </View>

        {/* 调试用格式化选项 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>调试工具</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.formatButton]} 
            onPress={handleFormatData}
          >
            <Text style={styles.actionButtonText}>格式化数据</Text>
          </TouchableOpacity>
          
          <Text style={styles.formatDescription}>
            点击后将恢复所有到默认选项，并且删除所有学期和课程。
          </Text>
        </View>

        {/* 版本信息 */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>版本 pre-release</Text>
        </View>
      </ScrollView>
      
      <CourseImportWizard
        visible={showImportWizard}
        onClose={() => setShowImportWizard(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },

  content: {
    flex: 1,
    padding: 20
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap'
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  numberInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    textAlign: 'center'
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  actionButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10
  },
  importButton: {
    backgroundColor: '#3498db'
  },
  importDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    lineHeight: 18
  },
  formatButton: {
    backgroundColor: '#e74c3c'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14
  },
  versionInfo: {
    alignItems: 'center',
    marginBottom: 40
  },
  versionText: {
    fontSize: 12,
    color: '#999'
  },
  formatDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    lineHeight: 18
  },
  themeLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedColorButton: {
    borderColor: '#333'
  },
  colorCheckmark: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  exportButton: {
    backgroundColor: '#2ecc71'
  },
  importDataButton: {
    backgroundColor: '#9b59b6',
    marginTop: 10
  }
});

export default SettingsScreen;
