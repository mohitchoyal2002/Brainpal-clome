/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

test('starts in an honest zero-count preview with a consent screen', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const rendered = JSON.stringify(renderer!.toJSON());
  expect(rendered).toContain('Less scrolling.');
  expect(rendered).toContain('Explore the design');
  expect(rendered).toContain('MONITORING PAUSED');
  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
  jest.useRealTimers();
});
