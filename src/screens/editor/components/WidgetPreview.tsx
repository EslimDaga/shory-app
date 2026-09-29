import { memo } from 'react';
import { View } from 'react-native';
import type { TrackMetadata } from '@/types/music';
import { configToProps, type WidgetConfig, type WidgetDefinition } from '@/widgets/types';

type Props = {
  widget: WidgetDefinition;
  track: TrackMetadata;
  config: WidgetConfig;
  width: number;
  height: number;
  padding?: number;
};

function WidgetPreviewBase({ widget, track, config, width, height, padding = 6 }: Props) {
  const scale = Math.min((width - padding * 2) / widget.width, (height - padding * 2) / widget.height);
  const { Component } = widget;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <View style={{ width: widget.width, height: widget.height, transform: [{ scale }] }}>
        <Component track={track} {...configToProps(config)} />
      </View>
    </View>
  );
}

export const WidgetPreview = memo(WidgetPreviewBase);
