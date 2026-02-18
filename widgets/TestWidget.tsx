'use no memo';

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function TestWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
      }}
      accessibilityLabel="测试 Widget"
    >
      <TextWidget
        text="Hello Widget"
        style={{
          fontSize: 32,
          color: '#3498db',
        }}
      />
    </FlexWidget>
  );
}
