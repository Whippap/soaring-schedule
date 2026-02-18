'use no memo';

import React from 'react';
import {
  FlexWidget,
  TextWidget
} from 'react-native-android-widget';
import { WidgetCourseData } from '../src/utils/widgetData';

interface CourseWidgetProps {
  data?: WidgetCourseData;
  isDarkMode?: boolean;
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

export function CourseWidget({ 
  data,
  isDarkMode = false
}: CourseWidgetProps) {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const weekDayIndex = currentDate.getDay();
  const adjustedWeekDayIndex = weekDayIndex === 0 ? 6 : weekDayIndex - 1;
  
  const relevantCourses = data?.relevantCourses || [];
  const hasCourses = relevantCourses.length > 0;
  const displayCourses = relevantCourses.slice(0, 3);
  const primaryColor = data?.primaryColor || '#3498db';
  
  const backgroundColor = isDarkMode ? '#1e1e1e' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#333333';
  const secondaryTextColor = isDarkMode ? '#b0b0b0' : '#666666';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        padding: 12,
        backgroundColor,
        borderRadius: 16,
      }}
      accessibilityLabel="课程表 Widget"
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
        <TextWidget
          text={`${month}月${day}日`}
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: textColor,
          }}
        />
        <TextWidget
          text={`周${weekDays[adjustedWeekDayIndex]}`}
          style={{
            fontSize: 14,
            color: secondaryTextColor,
          }}
        />
      </FlexWidget>

      {/* Main Content */}
      {hasCourses ? (
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
          ))}
          {relevantCourses.length > 3 && (
            <FlexWidget
              style={{
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <TextWidget
                text={`+${relevantCourses.length - 3} 更多课程`}
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
          }}
        >
          <TextWidget
            text="今天没有课了"
            style={{
              fontSize: 18,
              fontWeight: '500',
              color: secondaryTextColor,
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
