import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestWidgetUpdate,
  type WidgetTaskHandlerProps
} from 'react-native-android-widget';
import { CourseWidget } from './CourseWidget';
import { getWidgetData, type WidgetCourseData } from '../src/utils/widgetData';

const nameToWidget = {
  CourseWidget: CourseWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget =
    nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
      try {
        const widgetData = await getWidgetData();
        const isDarkMode = await AsyncStorage.getItem('@soaring_schedule:dark_mode') === 'true';
        props.renderWidget(<CourseWidget data={widgetData as WidgetCourseData} isDarkMode={isDarkMode} />);
      } catch (error) {
        console.error('Error in CourseWidgetTaskHandler:', error);
        props.renderWidget(<CourseWidget />);
      }
      break;

    case 'WIDGET_RESIZED':
      break;

    case 'WIDGET_DELETED':
      break;

    case 'WIDGET_CLICK':
      break;

    default:
      break;
  }
}

const CourseWidgetName = 'CourseWidget';

export async function updateCourseWidget() {
  try {
    await (requestWidgetUpdate as any)({
      widgetName: CourseWidgetName,
    });
  } catch (error) {
    console.error('Error updating course widget:', error);
  }
}
