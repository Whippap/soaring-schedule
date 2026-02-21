# 翱翔课表

一个基于 React Native + Expo 开发的课程表应用，支持自定义课程、教务系统导入、桌面 Widget 等功能。

## 项目简介

翱翔课表是一款专为高校学生设计的课程表管理应用，提供直观的课程展示、灵活的课程编辑、教务系统一键导入等功能，并支持 Android 桌面 Widget 快速查看今日课程。

## 功能特性

### 核心功能
- **课程管理**：手动添加、编辑、删除课程
- **多学期支持**：管理多个学期的课程数据
- **课表展示**：以周视图形式展示课程
- **教务系统导入**：支持从教务系统自动导入课程
- **课程颜色**：自定义课程颜色，便于区分
- **时间自定义**：灵活配置每节课的时间

### 高级功能
- **Android Widget**：桌面 Widget 快速查看今日课程
- **数据备份**：导出/导入课程数据
- **主题定制**：多种主题颜色可选
- **周课表**：支持单/双周课程设置
- **自动学期切换**：根据日期自动切换到当前学期

## 技术栈

- **框架**: React Native 0.81.5 + Expo 54.0.33
- **路由**: Expo Router 6.0.23
- **状态管理**: Zustand 5.0.11
- **本地存储**: AsyncStorage
- **UI 组件**: React Native Paper 5.15.0
- **Widget**: react-native-android-widget 0.20.1
- **开发语言**: TypeScript

## 项目结构

```
soaring-schedule-expo/
├── app/                          # Expo Router 路由页面
│   ├── _layout.tsx              # 根布局（底部导航）
│   ├── index.tsx                # 首页（课表）
│   ├── schedule.tsx             # 课程列表页
│   └── settings.tsx             # 设置页
├── assets/                       # 静态资源
│   └── images/                  # 图片资源
├── plugins/                      # Expo 插件
│   └── withHonorWidget.js       # 荣耀设备 Widget 插件
├── src/
│   ├── components/               # React 组件
│   │   ├── CalendarView.tsx     # 日历视图
│   │   ├── CourseForm.tsx       # 课程表单
│   │   ├── CourseImportWizard.tsx # 教务系统导入向导
│   │   ├── CourseList.tsx       # 课程列表
│   │   ├── CourseSchedule.tsx   # 课表视图
│   │   ├── JwxtWebView.tsx      # 教务系统 WebView
│   │   ├── MainView.tsx         # 主视图
│   │   ├── SemesterForm.tsx     # 学期表单
│   │   ├── TimeTableEditor.tsx  # 时间表编辑器
│   │   └── WidgetPreview.tsx    # Widget 预览
│   ├── hooks/                    # 自定义 Hooks
│   │   └── useWidgetDataSync.ts # Widget 数据同步 Hook
│   ├── stores/                   # Zustand 状态管理
│   │   ├── courseStore.ts        # 课程数据 Store
│   │   └── settingsStore.ts      # 设置 Store
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/                    # 工具函数
│       ├── dataBackup.ts         # 数据备份/恢复
│       ├── jwxtParser.ts         # 教务系统解析器
│       ├── timeConflict.ts       # 时间冲突检测
│       └── widgetData.ts         # Widget 数据处理
├── widgets/                      # Android Widget
│   ├── CourseWidget.tsx          # 课程 Widget
│   └── widget-task-handler.tsx   # Widget 任务处理
├── app.json                       # Expo 应用配置
├── package.json                   # 项目依赖
└── tsconfig.json                  # TypeScript 配置
```

## 快速开始

### 环境要求

- Node.js 18+
- JDK 17 (Android 构建)
- Android SDK (Android 构建)

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npx expo start
```

### 运行平台

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios

# Web
npx expo start --web
```

## 主要页面说明

### 首页 (index.tsx)
- 显示当前学期的课程表
- 周视图展示课程
- 支持添加、编辑、删除课程

### 课程列表 (schedule.tsx)
- 列表形式展示所有课程
- 按学期筛选课程
- 课程管理操作

### 设置页 (settings.tsx)
- 从教务系统导入课程
- 主题颜色设置
- Widget 预览
- 数据导出/导入
- 学期管理

## 数据结构

### 课程 (Course)
```typescript
interface Course {
  name: string;                    // 课程名称
  semesterId: string;              // 学期 ID
  timeSlots: TimeSlot[];           // 时间段列表
  code?: string;                   // 课程代码
  location?: string;               // 上课地点
  credits?: number;                // 学分
  teacher?: string;                // 任课老师
  assessmentMethod?: AssessmentMethod; // 考核方式
  notes?: string;                  // 备注
  color?: string;                  // 颜色
}
```

### 学期 (Semester)
```typescript
interface Semester {
  id: string;                      // 学期 ID
  name: string;                    // 学期名称
  startDate: string;               // 开始日期
  endDate: string;                 // 结束日期
  weekCount: number;               // 周数
  sectionCount: number;            // 每天课节数
  sectionTimes: SectionTime[];     // 课节时间
}
```

## 构建发布

详细的构建流程请参考 [应用构建流程参考.md](./应用构建流程参考.md)。

### 本地构建 (Android)

```bash
# 生成原生代码
npx expo prebuild --clean

# 使用 EAS 本地构建
eas build --platform android --profile preview --local
```

## 版本历史

见release

## 许可证

本项目采用 LICENSE 中指定的许可证。
