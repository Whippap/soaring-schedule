# 翱翔课表 - Soaring Schedule

一个基于 Expo 和 React Native 开发的 Android 课表应用，支持从教务系统导入课程、自定义课程管理、Android Widget 预览与显示。

## 主要功能

### 课表管理
- 从教务系统自动导入课程
- 手动添加、编辑、删除课程
- 学期管理
- 课程时间冲突检测
- 自定义课程时间

### Android Widget
- 课程表 Widget 支持
- Widget 实时预览
- 显示距离当前时间最近的 3 节课
- 无课程时显示提示信息
- 荣耀系统 Widget 适配
- 深色模式支持

### 数据管理
- 数据备份与恢复
- 格式化数据
- AsyncStorage 数据持久化

### 主题设置
- 8 种主题颜色可选
- 深色/浅色模式切换

## 技术栈

- **框架**: Expo 54, React Native 0.81
- **路由**: Expo Router
- **状态管理**: Zustand
- **语言**: TypeScript
- **Widget**: react-native-android-widget
- **数据存储**: @react-native-async-storage/async-storage
- **日期处理**: date-fns

## 项目结构

```
soaring-schedule-expo/
├── app/                          # 路由页面
│   ├── _layout.tsx              # 布局配置
│   ├── index.tsx                # 首页（课表页面）
│   ├── schedule.tsx             # 课表页面（备用）
│   └── settings.tsx             # 设置页面
├── assets/                       # 静态资源
│   └── images/                  # 图片资源
├── plugins/                      # Expo Config Plugins
│   └── withHonorWidget.js       # 荣耀系统 Widget 适配
├── src/
│   ├── components/               # 组件
│   │   ├── CalendarView.tsx     # 日历视图
│   │   ├── CourseForm.tsx       # 课程表单
│   │   ├── CourseImportWizard.tsx # 教务系统导入向导
│   │   ├── CourseList.tsx       # 课程列表
│   │   ├── CourseSchedule.tsx   # 课程表视图
│   │   ├── JwxtWebView.tsx     # 教务系统 WebView
│   │   ├── MainView.tsx         # 主视图
│   │   ├── SemesterForm.tsx     # 学期表单
│   │   ├── TimeTableEditor.tsx # 时间编辑
│   │   └── WidgetPreview.tsx    # Widget 预览
│   ├── hooks/                    # 自定义 Hooks
│   │   └── useWidgetDataSync.ts # Widget 数据同步
│   ├── stores/                   # Zustand 状态管理
│   │   ├── courseStore.ts       # 课程数据存储
│   │   └── settingsStore.ts     # 设置数据存储
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/                    # 工具函数
│       ├── dataBackup.ts        # 数据备份
│       ├── jwxtParser.ts        # 教务系统解析
│       ├── timeConflict.ts      # 时间冲突检测
│       └── widgetData.ts        # Widget 数据管理
├── widgets/                      # Widget 组件
│   ├── CourseWidget.tsx         # 课程表 Widget
│   └── widget-task-handler.tsx  # Widget 任务处理器
├── app.json                      # Expo 配置
├── package.json                  # 项目依赖
├── tsconfig.json                 # TypeScript 配置
└── index.ts                      # 应用入口
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Android Studio（用于 Android 开发）

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npx expo start
```

### 运行 Android

```bash
npx expo run:android
```

### 构建预生成

```bash
npx expo prebuild --platform android --clean
```

## Widget 开发

项目使用 `react-native-android-widget` 库来开发 Android Widget。

### Widget 配置

Widget 配置在 `app.json` 中：

```json
{
  "plugins": [
    [
      "react-native-android-widget",
      {
        "widgets": [
          {
            "name": "CourseWidget",
            "label": "课程表",
            "minWidth": "180dp",
            "minHeight": "100dp",
            "targetCellWidth": 2,
            "targetCellHeight": 1,
            "updatePeriodMillis": 1800000
          }
        ]
      }
    ],
    "./plugins/withHonorWidget"
  ]
}
```

### Widget 组件

Widget 组件位于 `widgets/CourseWidget.tsx`，使用 `'use no memo'` 指令，只能使用以下组件：
- `FlexWidget`
- `TextWidget`

不能使用 React Hooks 和标准 React Native 组件。

### 数据同步

Widget 数据通过 `useWidgetDataSync` Hook 同步，使用 `AsyncStorage` 存储。

## 荣耀系统适配

为适配荣耀系统，项目包含了自定义 Config Plugin `plugins/withHonorWidget.js`，会在 Widget receiver 中添加：

```xml
<meta-data android:name="com.hihonor.widget.type" android:value="honorcard"/>
```

## 数据存储

数据使用 `AsyncStorage` 持久化：
- 课程数据
- 学期数据
- 设置数据
- Widget 数据

## 开发指南

### 添加新的 Widget

1. 在 `widgets/` 目录下创建新的 Widget 组件
2. 在 `widgets/widget-task-handler.tsx` 中注册
3. 在 `app.json` 中配置 Widget
4. 运行 `npx expo prebuild` 重新生成原生代码

### 自定义主题颜色

在 `app/settings.tsx` 中修改 `themeColors` 数组：

```typescript
const themeColors = [
  '#3498db', // 蓝色
  '#2ecc71', // 绿色
  // 添加更多颜色...
];
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
