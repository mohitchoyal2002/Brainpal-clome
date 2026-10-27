import React from 'react';
type Props = {
  children?: React.ReactNode;
  accessibilityLabel?: string;
  [key: string]: unknown;
};
export default function Svg({ children, accessibilityLabel, ...props }: Props) {
  return React.createElement(
    'svg',
    { ...props, role: 'img', 'aria-label': accessibilityLabel },
    children,
  );
}
export const Path = (props: Props) => React.createElement('path', props);
export const Circle = (props: Props) => React.createElement('circle', props);
export const G = ({ children, ...props }: Props) =>
  React.createElement('g', props, children);
