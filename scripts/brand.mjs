// Renders the brand rasters from the hand-made SVGs in website/public/brand.
// Usage: node scripts/brand.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const dir = new URL('../website/public/brand/', import.meta.url);
const svg = name => readFileSync(new URL(name, dir), 'utf8');

const png = async (browser, markup, width, height) => {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${width}px;height:${height}px}</style>${markup}`);
	const buffer = await page.screenshot({ omitBackground: true });
	await page.close();
	return buffer;
};

// An .ico that wraps PNG images (supported everywhere that matters).
const ico = images => {
	const head = Buffer.alloc(6 + 16 * images.length);
	head.writeUInt16LE(1, 2);
	head.writeUInt16LE(images.length, 4);
	let offset = head.length;
	images.forEach(({ size, data }, i) => {
		const at = 6 + 16 * i;
		head.writeUInt8(size, at);
		head.writeUInt8(size, at + 1);
		head.writeUInt16LE(1, at + 4);
		head.writeUInt16LE(32, at + 6);
		head.writeUInt32LE(data.length, at + 8);
		head.writeUInt32LE(offset, at + 12);
		offset += data.length;
	});
	return Buffer.concat([head, ...images.map(i => i.data)]);
};

const browser = await chromium.launch();
const favicon = svg('favicon.svg');
const sizes = [16, 32, 48];
const icons = await Promise.all(sizes.map(async size => ({ size, data: await png(browser, favicon, size, size) })));
writeFileSync(new URL('favicon.ico', dir), ico(icons));
writeFileSync(new URL('apple-touch-icon.png', dir), await png(browser, favicon, 180, 180));
writeFileSync(new URL('og-image.png', dir), await png(browser, svg('og-image.svg'), 1200, 630));
await browser.close();
