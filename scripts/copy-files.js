/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const copydir = require('copy-dir');

const copyAssets = successCallback => {
	if (!fs.existsSync('./src/assets')) {
		successCallback && successCallback();

		return;
	}

	if (!fs.existsSync('./dist')) {
		fs.mkdirSync('./dist');
	}

	copydir(
		'./src/assets/',
		'./dist/assets/',
		{
			utimes: true, // keep add time and modify time
			mode: true, // keep file mode
			cover: true, // cover file when exists, default is true,
			filter: function(stat, filepath, filename) {
				const aux = filename.split('.');
				const fileExtension = aux && aux.length > 0 ? aux[aux.length - 1] : undefined;

				if (
					(stat === 'file' &&
						(fileExtension === 'ts' ||
							fileExtension === 'tsx' ||
							fileExtension === 'js' ||
							fileExtension === 'jsx')) ||
					(stat === 'directory' && filepath.indexOf('__stories__') >= 0)
				) {
					return false;
				}

				return true;
			},
		},
		function(err) {
			if (err) throw err;

			console.log('All assets files copied!');

			successCallback && successCallback();
		}
	);
};

module.exports = {
	copyAssets,
};
