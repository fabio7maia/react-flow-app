import type { Preview } from "@storybook/react";

const preview: Preview = {
	globalTypes: {
		language: {
			name: "Language",
			description: "Change the language of component preview",
			defaultValue: "pt",
			toolbar: {
				icon: "globe",
				items: [
					{ value: "pt", title: "PT - Portuguese" },
					{ value: "en", title: "EN - English" },
				],
			},
		},
		platform: {
			name: "Platform",
			description: "Change the platform of component preview",
			defaultValue: "mobile",
			toolbar: {
				icon: "browser",
				items: [
					{ value: "mobile", title: "Mobile - App and browser mobile devices" },
					{ value: "desktop", title: "Desktop - Tablets and PC devices" },
				],
			},
		},
	},
	tags: ["autodocs"],
};

export default preview;
