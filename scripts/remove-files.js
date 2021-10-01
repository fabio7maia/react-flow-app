/* eslint-disable @typescript-eslint/no-var-requires */
const rimraf = require('rimraf');

const removeDistFolder = successCallback => {
	rimraf('./dist', function() {
		console.log('Dist folder is deleted!');

		successCallback && successCallback();
	});
};

module.exports = { removeDistFolder };
