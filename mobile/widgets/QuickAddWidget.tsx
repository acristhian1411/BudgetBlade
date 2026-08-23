'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function QuickAddWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        borderRadius: 20,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'nativebudgetblade://new-transaction' }}
      accessibilityLabel="Agregar nueva transacción"
    >
      <TextWidget
        text="+"
        style={{
          fontSize: 40,
          fontWeight: 'bold',
          color: '#ffffff',
        }}
      />
    </FlexWidget>
  );
}
