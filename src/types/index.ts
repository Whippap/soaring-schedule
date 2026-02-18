// 重复规则枚举
export enum RepeatRule {
  ALL = '',
  ODD = '仅单周',
  EVEN = '仅双周'
}

// 考核方式枚举
export enum AssessmentMethod {
  EXAM = '考试',
  INSPECTION = '考察',
  PNP = 'PnP'
}

// 时间段接口
export interface TimeSlot {
  // 周数范围 (如 1-16 周)
  weekRange: string;
  // 重复规则
  repeatRule: RepeatRule;
  // 星期 (1-7)
  dayOfWeek: number;
  // 课节 (如 [1, 2])
  classSections: number[];
}

// 课程接口
export interface Course {
  // 课程名称
  name: string;
  // 所属学期ID
  semesterId: string;
  // 时间段列表
  timeSlots: TimeSlot[];
  // 课程代码 (可选)
  code?: string;
  // 上课地点 (可选)
  location?: string;
  // 学分 (可选)
  credits?: number;
  // 任课老师 (可选)
  teacher?: string;
  // 考核方式 (可选)
  assessmentMethod?: AssessmentMethod;
  // 备注 (可选)
  notes?: string;
  // 颜色 (可选，16进制颜色值)
  color?: string;
}

// 时间段接口
export interface SectionTime {
  start: string;
  end: string;
}

// 学期接口
export interface Semester {
  // 学期ID
  id: string;
  // 学期名称
  name: string;
  // 开始时间 (YYYY-MM-DD)
  startDate: string;
  // 结束时间 (YYYY-MM-DD)
  endDate: string;
  // 学期周数
  weekCount: number;
  // 时间表设置
  sectionCount: number; // 每天课程节数
  sectionTimes: SectionTime[]; // 课节时间设置
}
