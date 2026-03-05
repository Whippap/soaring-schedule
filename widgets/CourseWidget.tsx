'use no memo';

import React from 'react';
import {
  FlexWidget,
  TextWidget
} from 'react-native-android-widget';
import { WidgetCourseData } from '../src/utils/widgetData';

const formatSection = (sections: number[] | undefined): string => {
  if (!sections || sections.length === 0) return '';
  if (sections.length === 1) return `${sections[0]}节`;
  return `${sections[0]}-${sections[sections.length - 1]}节`;
};

const truncateCourseName = (name: string, maxLength: number = 6): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

interface CourseWidgetProps {
  data?: WidgetCourseData;
  isDarkMode?: boolean;
}

export function CourseWidget({ 
  data,
  isDarkMode = false
}: CourseWidgetProps) {
  const relevantCourses = data?.relevantCourses || [];
  const hasCourses = relevantCourses.length > 0;
  const displayCourses = relevantCourses.slice(0, 2);
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
      clickAction="REFRESH"
    >

      {/* Main Content */}
      {hasCourses ? (
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {displayCourses.map((course, index) => (
            <FlexWidget
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: 4,
                marginBottom: index < displayCourses.length - 1 ? 8 : 0,
              }}
            >
              <FlexWidget
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: primaryColor as any,
                  marginTop: 4,
                }}
              />
              <FlexWidget
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  marginLeft: 8,
                }}
              >
                <TextWidget
                  text={truncateCourseName(course.name)}
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: textColor,
                  }}
                />
                <TextWidget
                  text={`${formatSection(course.classSections)} ${course.timeSlot?.start || '00:00'}~${course.timeSlot?.end || '00:00'}`}
                  style={{
                    fontSize: 12,
                    color: secondaryTextColor,
                    marginTop: 2,
                  }}
                />
                {course.location && (
                  <TextWidget
                    text={course.location}
                    style={{
                      fontSize: 12,
                      color: secondaryTextColor,
                      marginTop: 2,
                    }}
                  />
                )}
              </FlexWidget>
            </FlexWidget>
          ))}
          {relevantCourses.length > 2 && (
            <FlexWidget
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <TextWidget
                text={`+${relevantCourses.length - 2} more`}
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
