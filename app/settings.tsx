import React, { useEffect } from 'react';
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

const SettingsScreen = () => {
  const {
    formatData,
    loadSettings
  } = useSettingsStore();

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
  }
});

export default SettingsScreen;
