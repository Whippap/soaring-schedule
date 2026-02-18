import { parseScheduleText } from './src/utils/jwxtParser';

// 测试用例 - 模拟材料力学课程的 scheduleText
const testScheduleText1 = "1-16周 周一 第11-12节; 1-16周 周三 第11-12节";
const testScheduleText2 = "1-16周 周一 第十一节~第十二节; 1-16周 周三 第十一节~第十二节";

console.log("=== 测试1: 阿拉伯数字格式 ===");
console.log("输入:", testScheduleText1);
const result1 = parseScheduleText(testScheduleText1);
console.log("解析结果:", JSON.stringify(result1, null, 2));

console.log("\n=== 测试2: 中文数字格式 ===");
console.log("输入:", testScheduleText2);
const result2 = parseScheduleText(testScheduleText2);
console.log("解析结果:", JSON.stringify(result2, null, 2));
