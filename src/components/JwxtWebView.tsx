import React, { useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ParsedData } from '../utils/jwxtParser';

interface JwxtWebViewProps {
  visible: boolean;
  onClose: () => void;
  onDataExtracted: (data: ParsedData) => void;
}

const JWXT_URL = 'https://ecampus.nwpu.edu.cn/';

const INJECTED_JAVASCRIPT_BEFORE_LOAD = `
(function() {
  window.addEventListener('load', function() {
    setTimeout(function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('PAGE_LOADED');
      }
    }, 2000);
  });
})();
true;
`;

const EXTRACT_DATA_SCRIPT = `
(function() {
  console.log('开始提取课程数据...');
  
  // 等待更长时间让动态内容加载
  setTimeout(function() {
    try {
      console.log('当前URL:', window.location.href);
      console.log('等待完成，开始提取...');
      
      const semesters = [];
      const courses = [];
      
      let targetDocument = document;
      
      const iframes = document.querySelectorAll('iframe');
      console.log('找到 iframe 数量:', iframes.length);
      
      iframes.forEach((iframe, idx) => {
        console.log('iframe', idx, 'src:', iframe.src);
        console.log('iframe', idx, 'id:', iframe.id);
        console.log('iframe', idx, 'class:', iframe.className);
      });
      
      for (let i = 0; i < iframes.length; i++) {
        try {
          const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
          if (iframeDoc) {
            console.log('成功访问 iframe', i, '的文档');
            const iframeBodyText = iframeDoc.body ? iframeDoc.body.textContent : '';
            console.log('iframe 内容长度:', iframeBodyText.length);
            if (iframeBodyText.includes('机械原理') || 
                iframeBodyText.includes('材料力学') || 
                iframeBodyText.includes('学分') ||
                iframeBodyText.includes('课程')) {
              console.log('在 iframe', i, '中找到课程相关内容');
              targetDocument = iframeDoc;
              break;
            }
          }
        } catch (e) {
          console.log('无法访问 iframe', i, '的内容:', e.message);
        }
      }
      
      console.log('使用的文档:', targetDocument === document ? '主文档' : 'iframe文档');
      
      const semesterSelect = targetDocument.getElementById('semesters');
      if (semesterSelect) {
        console.log('找到学期选择器');
        const options = semesterSelect.querySelectorAll('option');
        options.forEach(option => {
          const value = option.value;
          const text = option.textContent.trim();
          if (value && value !== 'all') {
            semesters.push({
              name: text,
              dataSemester: value
            });
          }
        });
        console.log('从选择器提取到学期:', semesters);
      }
      
      if (semesters.length === 0) {
        semesters.push({
          name: '2025-2026春',
          dataSemester: '2025-2026-2'
        });
      }
      
      console.log('开始扫描目标文档的元素...');
      
      const docHtml = targetDocument.body ? targetDocument.body.innerHTML : targetDocument.documentElement.innerHTML;
      console.log('文档HTML长度:', docHtml.length);
      
      if (docHtml.length < 5000) {
        console.log('文档HTML内容:', docHtml);
      } else {
        console.log('文档HTML前3000字符:', docHtml.substring(0, 3000));
      }
      
      const allTr = targetDocument.querySelectorAll('tr');
      console.log('找到 tr 元素数量:', allTr.length);
      
      allTr.forEach((tr, idx) => {
        if (idx < 20) {
          const trText = tr.textContent || '';
          if (trText.length > 10) {
            console.log('tr', idx, ':', trText.substring(0, 200));
          }
        }
      });
      
      const allH3 = targetDocument.querySelectorAll('h3');
      console.log('找到 h3 元素数量:', allH3.length);
      allH3.forEach((h3, idx) => {
        if (idx < 20) {
          console.log('h3', idx, ':', h3.textContent);
        }
      });
      
      const allShowSchedules = targetDocument.querySelectorAll('.showSchedules');
      console.log('找到 showSchedules 元素数量:', allShowSchedules.length);
      
      let currentDataSemester = semesters.length > 0 ? semesters[0].dataSemester : 'unknown';
      
      allTr.forEach((tr, trIndex) => {
        try {
          const trHtml = tr.outerHTML;
          const trText = tr.textContent || '';
          
          if (trHtml.includes('data-semester')) {
            const ds = tr.getAttribute('data-semester');
            if (ds) {
              currentDataSemester = ds;
              console.log('更新学期为:', currentDataSemester);
            }
          }
          
          const showSchedules = tr.querySelector('.showSchedules');
          const h3 = tr.querySelector('h3');
          
          let hasCourse = false;
          let courseName = '';
          
          if (showSchedules) {
            courseName = showSchedules.textContent.trim();
            hasCourse = true;
          } else if (h3) {
            courseName = h3.textContent.trim();
            hasCourse = true;
          } else if (trText.includes('学分(') && trText.length > 20) {
            const h3Match = trHtml.match(/<h3[^>]*>([^<]+)<\\/h3>/);
            if (h3Match) {
              courseName = h3Match[1].trim();
              hasCourse = true;
            } else {
              const textParts = trText.split(/\\s+/);
              if (textParts.length > 3) {
                courseName = textParts[0];
                hasCourse = courseName.length >= 2;
              }
            }
          }
          
          if (hasCourse && courseName && courseName.length >= 2) {
            console.log('找到课程:', courseName);
            
            const courseCodeMatch = trHtml.match(/\\[([A-Za-z0-9]+)\\]/);
            const courseCode = courseCodeMatch ? courseCodeMatch[1] : '';
            
            const creditsMatch = trHtml.match(/学分\\(([\\d.]+)\\)/);
            const credits = creditsMatch ? parseFloat(creditsMatch[1]) : 0;
            
            const teacherMatch = trHtml.match(/授课教师[：:]([^<]+)/) || 
                                 trHtml.match(/教师[：:]([^<]+)/);
            const teacher = teacherMatch ? teacherMatch[1].trim() : '';
            
            const assessmentMatch = trHtml.match(/(考试|考察)/);
            const assessmentMethod = assessmentMatch ? assessmentMatch[1] : '考试';
            
            let scheduleText = '';
            let location = '';
            const allTd = tr.querySelectorAll('td');
            
            allTd.forEach((td, tdIdx) => {
              const tdHtml = td.innerHTML || '';
              const tdText = td.textContent || '';
              if (tdText.includes('第') && (tdText.includes('节') || tdText.includes('周'))) {
                scheduleText = tdHtml;
              } else {
                // 尝试从其他td中提取地点信息
                const locationPatterns = [
                  /(长安校区|翠华校区|雁塔校区|未央校区|沣东校区|草堂校区|友谊校区|太白校区|曲江校区)\s*([^\s,;<]+)/,
                  /([ABCEFGSTU教]\s*\d+[-\d]*)/,
                  /(\S+楼)\s*([^\s,;<]+)/,
                  /(\S+教学楼)\s*([^\s,;<]+)/,
                  /(\S+实验楼)\s*([^\s,;<]+)/,
                  /(\d+室)/,
                  /(\d+教室)/
                ];
                for (const pattern of locationPatterns) {
                  const match = tdText.match(pattern);
                  if (match) {
                    if (match[1] && match[2]) {
                      location = match[1] + ' ' + match[2];
                    } else if (match[1]) {
                      location = match[1];
                    }
                    break;
                  }
                }
              }
            });
            
            if (!scheduleText && allTd.length > 2) {
              scheduleText = allTd[allTd.length - 1].innerHTML || allTd[allTd.length - 2].innerHTML || '';
            }
            
            if (!scheduleText) {
              scheduleText = trHtml;
            }
            
            console.log('课程详情:', {
              name: courseName,
              code: courseCode,
              credits: credits,
              teacher: teacher,
              assessmentMethod: assessmentMethod,
              location: location,
              scheduleLength: scheduleText.length
            });
            
            if (!scheduleText.includes('网课') && courseName) {
              courses.push({
                name: courseName,
                code: courseCode,
                credits: credits,
                teacher: teacher,
                assessmentMethod: assessmentMethod,
                scheduleText: scheduleText,
                location: location,
                dataSemester: currentDataSemester
              });
            }
          }
        } catch (err) {
          console.error('处理 tr', trIndex, '出错:', err);
        }
      });
      
      if (courses.length === 0) {
        console.log('备用方法：直接扫描整个HTML...');
        const pageHtml = targetDocument.body ? targetDocument.body.innerHTML : targetDocument.documentElement.innerHTML;
        
        const courseNameRegex = /<h3[^>]*>([^<]+)<\\/h3>/g;
        const names = [];
        let match;
        while ((match = courseNameRegex.exec(pageHtml)) !== null) {
          names.push(match[1].trim());
        }
        console.log('从 h3 找到课程名:', names);
        
        const showSchedulesRegex = /class="[^"]*showSchedules[^"]*"[^>]*>([^<]+)</g;
        const scheduleNames = [];
        while ((match = showSchedulesRegex.exec(pageHtml)) !== null) {
          scheduleNames.push(match[1].trim());
        }
        console.log('从 showSchedules 找到课程名:', scheduleNames);
        
        const combinedNames = [...new Set([...names, ...scheduleNames])];
        console.log('合并后课程名:', combinedNames);
        
        combinedNames.forEach((name, idx) => {
          if (name && name.length >= 2) {
            courses.push({
              name: name,
              code: '',
              credits: 0,
              teacher: '',
              assessmentMethod: '考试',
              scheduleText: '1-16周 周一 第1-2节',
              dataSemester: currentDataSemester
            });
          }
        });
      }
      
      console.log('提取完成！');
      console.log('学期数:', semesters.length, semesters);
      console.log('课程数:', courses.length);
      courses.forEach((c, i) => {
        console.log('  课程', i, ':', c.name, c.teacher, c.credits);
      });
      
      const result = JSON.stringify({ semesters, courses });
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('DATA_EXTRACTED:' + result);
      }
    } catch (error) {
      console.error('提取数据时出错:', error);
      console.error('错误堆栈:', error.stack);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('ERROR:' + error.message);
      }
    }
  }, 4000);
  true;
})();
true;
`;

const JwxtWebView: React.FC<JwxtWebViewProps> = ({ 
  visible, 
  onClose, 
  onDataExtracted 
}) => {
  const webViewRef = useRef<WebView>(null);
  const [canExtract, setCanExtract] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    console.log('收到 WebView 消息:', message);
    
    if (message === 'PAGE_LOADED') {
      setCanExtract(true);
    } else if (message.startsWith('DATA_EXTRACTED:')) {
      try {
        const jsonData = message.substring('DATA_EXTRACTED:'.length);
        console.log('解析数据:', jsonData);
        const parsedData: ParsedData = JSON.parse(jsonData);
        console.log('解析完成，学期:', parsedData.semesters.length, '课程:', parsedData.courses.length);
        setExtracting(false);
        onDataExtracted(parsedData);
      } catch (error) {
        console.error('Failed to parse extracted data:', error);
        Alert.alert('错误', '解析课程数据失败，请重试');
        setExtracting(false);
      }
    } else if (message.startsWith('ERROR:')) {
      const errorMsg = message.substring('ERROR:'.length);
      console.error('WebView 报告错误:', errorMsg);
      Alert.alert('错误', '提取课程数据时出错: ' + errorMsg);
      setExtracting(false);
    }
  };

  const handleExtractData = () => {
    if (!webViewRef.current) return;
    
    setExtracting(true);
    
    try {
      console.log('开始注入提取脚本');
      webViewRef.current.injectJavaScript(EXTRACT_DATA_SCRIPT);
    } catch (error) {
      console.error('Error injecting extraction script:', error);
      Alert.alert('错误', '提取课程数据失败，请重试');
      setExtracting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>关闭</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>教务系统</Text>
          <TouchableOpacity 
            onPress={handleExtractData} 
            style={[styles.extractButton, (!canExtract || extracting) && styles.disabledButton]}
            disabled={!canExtract || extracting}
          >
            {extracting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.extractButtonText}>提取课程</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <WebView
          ref={webViewRef}
          source={{ uri: JWXT_URL }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT_BEFORE_LOAD}
          onMessage={handleMessage}
          onLoadStart={() => {
            setCanExtract(false);
          }}
          onLoadEnd={() => {}}
        />
        
        <View style={styles.guideBar}>
          <Text style={styles.guideText}>
            请登录后，前往&quot;我的课表-全部课程&quot;页面，然后点击&quot;提取课程&quot;按钮
          </Text>
        </View>
      </View>
    </Modal>
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
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  extractButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5
  },
  disabledButton: {
    backgroundColor: '#bdc3c7'
  },
  extractButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  webView: {
    flex: 1
  },
  guideBar: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffeeba'
  },
  guideText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18
  }
});

export default JwxtWebView;
