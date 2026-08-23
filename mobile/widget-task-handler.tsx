import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuickAddWidget } from './widgets/QuickAddWidget';

const nameToWidget = {
  QuickAdd: QuickAddWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
      props.renderWidget(<Widget />);
      break;
    case 'WIDGET_RESIZED':
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
