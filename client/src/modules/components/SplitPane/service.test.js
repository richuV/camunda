import React from 'react';

import {twoNodesPropType} from './service';

describe('SplitPane service', () => {
  describe('twoNodesProp', () => {
    const componentName = 'Foo';
    const propName = 'bar';
    const fooNode = <div>Foo</div>;
    const barNode = <div>Bar</div>;

    test('should fail prop value is not an array of two nodes', () => {
      // given
      let props = {[propName]: null};
      // then
      expect(() => twoNodesPropType(props, propName, componentName)).toThrow();

      // given
      props = {[propName]: fooNode};
      // then
      expect(() => twoNodesPropType(props, propName, componentName)).toThrow();
    });

    test('should return null if prop value is an array of two nodes', () => {
      // given
      let props = {[propName]: [fooNode, barNode]};

      // then
      expect(twoNodesPropType(props, propName, componentName)).toBe(null);
    });
  });
});
