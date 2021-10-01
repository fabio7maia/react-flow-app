const enzyme = require('enzyme');
const Adapter = require('@wojtekmaj/enzyme-adapter-react-17');
require('jest-canvas-mock');

enzyme.configure({ adapter: new Adapter() });
