/** @format */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

type Props = React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}> & SafeAreaViewProps;

export default function SafeAreaScreen({
  children,
  style,
  edges = ['top', 'bottom'],
  ...rest
}: Props) {
  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: COLORS.background }, style]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
}
