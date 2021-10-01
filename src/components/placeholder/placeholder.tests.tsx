import React from 'react';
import { mount } from 'enzyme';
import { Placeholder } from '.';

describe('<Placeholder />', () => {
	it('component should be defined and render', () => {
		const wrapper = mount(<Placeholder loading />);

		expect(wrapper.find(Placeholder)).toBeDefined();
	});
});
