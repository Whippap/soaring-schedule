import React from 'react';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlexWidget,
  TextWidget,
  IconWidget,
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
  type IconData
} from 'react-native-android-widget';
import { Course, Semester, SectionTime } from '../src/types';
import { getWidgetData, WidgetCourseData } from '../src/utils/widgetData';

interface CourseWithTime extends Course {
  startTime?: Date;
  endTime?: Date;
  timeSlot?: {
    start: string;
    end: string;
  };
}

interface CourseWidgetProps {
  courses?: Course[];
  currentSemester?: Semester | null;
  todayCourses?: Course[];
  primaryColor?: string;
  widgetSize?: number;
  allTodayCourses?: Course[];
  isDarkMode?: boolean;
  lastUpdated?: Date;
}

const parseTime = (timeStr: string, date: Date): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const getTimeSlotForSection = (
  classSections: number[],
  sectionTimes: SectionTime[]
): { start: string; end: string } => {
  const sortedSections = [...classSections].sort((a, b) => a - b);
  const firstSection = sortedSections[0];
  const lastSection = sortedSections[sortedSections.length - 1];
  
  return {
    start: sectionTimes[firstSection - 1]?.start || '08:00',
    end: sectionTimes[lastSection - 1]?.end || '20:40'
  };
};

const getRelevantCourses = (
  coursesWithTime: CourseWithTime[],
  currentTime: Date
): CourseWithTime[] => {
  const now = currentTime;

  const ongoingOrFutureCourses = coursesWithTime.filter(course => {
    if (course.endTime) {
      return course.endTime > now;
    }
    return false;
  });

  ongoingOrFutureCourses.sort((a, b) => {
    if (a.startTime && b.startTime) {
      return a.startTime.getTime() - b.startTime.getTime();
    }
    return 0;
  });

  return ongoingOrFutureCourses;
};

const getTimeIcon = (hour: number): IconData => {
  if (hour < 6) return { type: 'clock-outline' };
  if (hour < 12) return { type: 'weather-sunny' };
  if (hour < 18) return { type: 'weather-partly-cloudy' };
  return { type: 'weather-night' };
};

const getNextUpdateTime = (): string => {
  const nextUpdate = new Date();
  nextUpdate.setMinutes(nextUpdate.getMinutes() + 15);
  return format(nextUpdate, 'HH:mm');
};

export function CourseWidget({ 
  courses = [], 
  currentSemester = null, 
  todayCourses = [], 
  primaryColor = '#3498db',
  widgetSize = 150,
  allTodayCourses = [],
  isDarkMode = false,
  lastUpdated = new Date()
}: CourseWidgetProps) {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const currentDate = new Date();
  
  const maxCourses = {
    small: 2,
    medium: 3,
    large: 5
  };
  
  const isSmall = widgetSize < 200;
  const isLarge = widgetSize > 200;
  const sizeKey = isSmall ? 'small' : isLarge ? 'large' : 'medium';
  
  const coursesWithTime: CourseWithTime[] = [];
  
  if (currentSemester && allTodayCourses.length > 0) {
    const today = new Date();
    
    allTodayCourses.forEach(course => {
      if (course.timeSlot) {
        coursesWithTime.push({
          ...course,
          startTime: parseTime(course.timeSlot.start, today),
          endTime: parseTime(course.timeSlot.end, today),
          timeSlot: course.timeSlot
        });
      } else if (course.timeSlots && course.timeSlots.length > 0) {
        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const todaySlot = course.timeSlots.find(slot => slot.dayOfWeek === dayOfWeek);
        
        if (todaySlot) {
          const timeSlot = getTimeSlotForSection(todaySlot.classSections, currentSemester.sectionTimes || []);
          coursesWithTime.push({
            ...course,
            startTime: parseTime(timeSlot.start, today),
            endTime: parseTime(timeSlot.end, today),
            timeSlot
          });
        }
      }
    });
  } else {
    // 添加默认数据，确保 widget 不会显示空白
    coursesWithTime.push({
      id: 'default',
      name: '暂无课程',
      location: '',
      teacher: '',
      color: primaryColor,
      semesterId: 'default',
      timeSlots: [],
      startTime: new Date(),
      endTime: new Date(),
      timeSlot: { start: '00:00', end: '23:59' }
    });
  }
  
  const relevantCourses = getRelevantCourses(coursesWithTime, currentDate);
  const displayCourses = relevantCourses.slice(0, maxCourses[sizeKey]);
  // 检查是否只有默认数据
  const hasRealCourses = relevantCourses.length > 0 && !relevantCourses.some(course => course.id === 'default');
  const hasCourses = relevantCourses.length > 0;
  
  const backgroundColor = isDarkMode ? '#1e1e1e' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#333333';
  const secondaryTextColor = isDarkMode ? '#b0b0b0' : '#666666';
  const borderColor = isDarkMode ? '#333333' : '#e0e0e0';

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        padding: 12,
        backgroundColor,
        borderRadius: 16,
        borderWidth: 1,
        borderColor
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconWidget
            icon={getTimeIcon(currentDate.getHours())}
            style={{
              color: primaryColor,
              size: 20,
            }}
          />
          <TextWidget
            text={format(currentDate, 'MM月dd日')}
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: textColor,
            }}
          />
        </FlexWidget>
        <TextWidget
          text={`周${weekDays[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}`}
          style={{
            fontSize: 14,
            color: secondaryTextColor,
          }}
        />
      </FlexWidget>

      {/* Main Content */}
      {sizeKey === 'small' ? (
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {hasRealCourses ? (
            <FlexWidget
              style={{
                alignItems: 'center',
                gap: 4,
              }}
            >
              <IconWidget
                icon={{ type: 'clock-outline' }}
                style={{
                  color: primaryColor,
                  size: 24,
                }}
              />
              <TextWidget
                text={`${displayCourses.length} 节课`}
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: primaryColor
                }}
              />
              {displayCourses[0] && (
                <TextWidget
                  text={displayCourses[0].timeSlot?.start || ''}
                  style={{
                    fontSize: 14,
                    color: secondaryTextColor,
                  }}
                />
              )}
            </FlexWidget>
          ) : (
            <FlexWidget
              style={{
                alignItems: 'center',
                gap: 8,
              }}
            >
              <IconWidget
                icon={{ type: 'school' }}
                style={{
                  color: secondaryTextColor,
                  size: 24,
                }}
              />
              <TextWidget
                text="今天没有课了"
                style={{
                  fontSize: 16,
                  color: secondaryTextColor,
                  textAlign: 'center',
                }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      ) : (
        hasRealCourses ? (
          <FlexWidget
            style={{
              flex: 1,
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {displayCourses.map((course, index) => (
              <FlexWidget
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 4,
                }}
              >
                <FlexWidget
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: course.color || primaryColor,
                  }}
                />
                <FlexWidget
                  style={{
                    flex: 1,
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <TextWidget
                    text={course.name}
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: textColor,
                    }}
                  />
                  <FlexWidget
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    {course.timeSlot && (
                      <TextWidget
                        text={`${course.timeSlot.start} - ${course.timeSlot.end}`}
                        style={{
                          fontSize: 12,
                          color: secondaryTextColor,
                        }}
                      />
                    )}
                    {course.location && (
                      <TextWidget
                        text={course.location}
                        style={{
                          fontSize: 12,
                          color: secondaryTextColor,
                        }}
                      />
                    )}
                  </FlexWidget>
                </FlexWidget>
              </FlexWidget>
            ))}
            {relevantCourses.length > maxCourses[sizeKey] && (
              <FlexWidget
                style={{
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <TextWidget
                  text={`+${relevantCourses.length - maxCourses[sizeKey]} 更多课程`}
                  style={{
                    fontSize: 12,
                    color: secondaryTextColor,
                  }}
                />
              </FlexWidget>
            )}
          </FlexWidget>
        ) : (
          <FlexWidget
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <IconWidget
              icon={{ type: 'school' }}
              style={{
                color: secondaryTextColor,
                size: 40,
              }}
            />
            <TextWidget
              text="今天没有课了"
              style={{
                fontSize: 18,
                fontWeight: '500',
                color: secondaryTextColor,
                textAlign: 'center',
              }}
            />
            <TextWidget
              text="享受您的自由时间！"
              style={{
                fontSize: 14,
                color: secondaryTextColor,
                textAlign: 'center',
              }}
            />
          </FlexWidget>
        )
      )}

      {/* Footer */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}
      >
        <TextWidget
          text={`更新: ${format(lastUpdated, 'HH:mm')}`}
          style={{
            fontSize: 10,
            color: secondaryTextColor,
          }}
        />
        <TextWidget
          text={`下次: ${getNextUpdateTime()}`}
          style={{
            fontSize: 10,
            color: secondaryTextColor,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

const CourseWidgetName = 'CourseWidget';

export async function CourseWidgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo } = props;
  
  try {
    const widgetData = await getWidgetData();
    const isDarkMode = await AsyncStorage.getItem('@soaring_schedule:dark_mode') === 'true';
    
    if (widgetData) {
      return (
        <CourseWidget
          courses={widgetData.courses}
          currentSemester={widgetData.currentSemester}
          todayCourses={widgetData.todayCourses}
          primaryColor={widgetData.primaryColor}
          widgetSize={widgetInfo.height}
          allTodayCourses={widgetData.allTodayCourses}
          isDarkMode={isDarkMode}
          lastUpdated={new Date()}
        />
      );
    }
    
    return (
      <CourseWidget
        isDarkMode={isDarkMode}
        lastUpdated={new Date()}
      />
    );
  } catch (error) {
    console.error('Error in CourseWidgetTaskHandler:', error);
    return (
      <CourseWidget
        lastUpdated={new Date()}
      />
    );
  }
}

registerWidgetTaskHandler(CourseWidgetName, CourseWidgetTaskHandler);

export async function updateCourseWidget() {
  try {
    await requestWidgetUpdate({
      widgetName: CourseWidgetName,
    });
  } catch (error) {
    console.error('Error updating course widget:', error);
  }
}
