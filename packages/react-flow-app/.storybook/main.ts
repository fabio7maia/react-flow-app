import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(tsx|mdx)"],
	addons: ["@storybook/addon-links"],
	staticDirs: ["../public"],
	framework: "@storybook/react-vite",
	docs: {},
	typescript: {
		reactDocgen: "react-docgen-typescript",
	},
};

export default config;
