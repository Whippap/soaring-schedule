import { Course, TimeSlot } from '../types';

/**
 * 检测两个时间段是否冲突
 * @param slot1 第一个时间段
 * @param slot2 第二个时间段
 * @returns 是否冲突
 */
export const isTimeSlotConflict = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  // 检查是否在同一天
  if (slot1.dayOfWeek !== slot2.dayOfWeek) {
    return false;
  }

  // 检查周数范围是否有重叠
  const weekRange1 = parseWeekRange(slot1.weekRange);
  const weekRange2 = parseWeekRange(slot2.weekRange);
  
  if (weekRange1.max < weekRange2.min || weekRange2.max < weekRange1.min) {
    return false;
  }

  // 检查重复规则是否有重叠
  if (!isRepeatRuleOverlap(slot1.repeatRule, slot2.repeatRule)) {
    return false;
  }

  // 检查课节是否有重叠
  const sections1 = new Set(slot1.classSections);
  const sections2 = new Set(slot2.classSections);
  
  for (const section of sections1) {
    if (sections2.has(section)) {
      return true;
    }
  }

  return false;
};

/**
 * 检测课程是否与现有课程冲突
 * @param newCourse 新课程
 * @param existingCourses 现有课程列表
 * @param excludeIndex 排除的课程索引（用于更新课程时）
 * @returns 是否冲突
 */
export const isCourseConflict = (
  newCourse: Course,
  existingCourses: Course[],
  excludeIndex?: number
): boolean => {
  return existingCourses.some((existingCourse, index) => {
    // 排除正在更新的课程
    if (excludeIndex !== undefined && index === excludeIndex) {
      return false;
    }

    // 检查每个时间段是否冲突
    return newCourse.timeSlots.some(newSlot => {
      return existingCourse.timeSlots.some(existingSlot => {
        return isTimeSlotConflict(newSlot, existingSlot);
      });
    });
  });
};

/**
 * 解析周数范围字符串
 * @param weekRange 周数范围字符串（如 "1-16"）
 * @returns 解析后的周数范围对象
 */
const parseWeekRange = (weekRange: string): { min: number; max: number } => {
  const parts = weekRange.split('-');
  if (parts.length === 2) {
    return {
      min: parseInt(parts[0].trim()),
      max: parseInt(parts[1].trim())
    };
  }
  // 如果只有一个数字，返回相同的最小和最大值
  const week = parseInt(weekRange.trim());
  return { min: week, max: week };
};

/**
 * 检查两个重复规则是否有重叠
 * @param rule1 第一个重复规则
 * @param rule2 第二个重复规则
 * @returns 是否有重叠
 */
const isRepeatRuleOverlap = (rule1: string, rule2: string): boolean => {
  // 空字符串规则（即原来的"全部"）与任何规则都重叠
  if (rule1 === '' || rule2 === '') {
    return true;
  }
  // 单周和双周不重叠
  return rule1 === rule2;
};
