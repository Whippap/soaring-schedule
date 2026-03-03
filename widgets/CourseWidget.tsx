'use no memo';

import React from 'react';
import {
    FlexWidget,
    TextWidget
} from 'react-native-android-widget';

const emojis = [
  'o(*￣▽￣*)ブ',
  '(✿◠‿◠)',
  '(◕ᴗ◕✿)',
  '(≧◡≦)',
  '(◠‿◠)',
  '(◠ᴥ◠)',
  '(・ω<)★',
  '(｡♥‿♥｡)',
  '(◡‿◡✿)',
  '(✧ω✧)',
  '(◠‿◠)',
  '(｡◕‿◕｡)',
  '(´・ω・`)',
  '(￣▽￣)',
  '(>ω<)',
  '(◕‿◕)',
  '(✧∇✧)',
  '(￣ω￣)',
  '(◠‿◠)',
  '(๑•̀ㅂ•́)و✧',
  '(◠‿◠)ノ',
  '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
  '(◕‿◕)',
  '(◠‿◠)'
];

function getRandomEmoji(): string {
  const randomIndex = Math.floor(Math.random() * emojis.length);
  return emojis[randomIndex];
}

const formatSection = (sections: any): string => {
  if (!sections || sections.length === 0) return '';
  if (sections.length === 1) return `${sections[0]}节`;
  return `${sections[0]}-${sections[sections.length - 1]}节`;
};

const truncateCourseName = (name: string, maxLength: number = 6): string => {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

const filterCourses = (courses: any[], currentTime: Date): any[] => {
  const now = currentTime;
  
  const result: any[] = [];
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    if (course.endTime) {
      const endTime = new Date(course.endTime);
      if (endTime > now) {
        result.push(course);
      }
    }
  }
  
  result.sort((a, b) => {
    if (a.startTime && b.startTime) {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }
    return 0;
  });
  
  return result;
};

interface CourseWidgetProps {
  data?: any;
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
  
  const allTodayCourses = data?.allTodayCourses || [];
  const relevantCourses = filterCourses(allTodayCourses, currentDate);
  const hasCourses = relevantCourses.length > 0;
  const displayCourses = relevantCourses.slice(0, 2);
  const primaryColor = data?.primaryColor || '#3498db';
  const emoji = getRandomEmoji();
  
  const backgroundColor = isDarkMode ? '#1e1e1e' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#333333';
  const secondaryTextColor = isDarkMode ? '#b0b0b0' : '#666666';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        padding: 12,
        backgroundColor,
        borderRadius: 16,
      }}
      accessibilityLabel="课程表 Widget"
      clickAction="UPDATE_WIDGET"
    >
      <FlexWidget
        style={{
          width: 80,
          flexDirection: 'column',
          justifyContent: 'space-between',
          marginRight: 8,
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
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
              marginTop: 4,
            }}
          />
        </FlexWidget>
        <TextWidget
          text={emoji}
          style={{
            fontSize: 12,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        {hasCourses ? (
          <>
            {displayCourses.map((course: any, index: number) => (
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
          </>
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
    </FlexWidget>
  );
}
