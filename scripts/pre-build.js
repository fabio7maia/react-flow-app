/* eslint-disable @typescript-eslint/no-var-requires */
const copyFiles = require('./copy-files');
const removeFiles = require('./remove-files');

removeFiles.removeDistFolder(copyFiles.copyAssets);
