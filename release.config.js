module.exports = {
	branches: [
		'main',
		{
			name: 'beta',
			prerelease: true,
		},
	],
	plugins: [
		'@semantic-release/commit-analyzer',
		'@semantic-release/release-notes-generator',
		[
			'@semantic-release/changelog',
			{
				changelogFile: 'CHANGELOG.md',
			},
		],
		// [
		// 	'@semantic-release/npm',
		// 	{
		// 		npmPublish: true,
		// 		tarballDir: 'dist',
		// 	},
		// ],
		// '@semantic-release/github',
		[
			'@semantic-release/github',
			{
				assets: ['dist/**'],
			},
		],
		[
			'@semantic-release/git',
			{
				assets: ['CHANGELOG.md'],
				message:
					'chore(release): set `package.json` to ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
			},
		],
	],
};
