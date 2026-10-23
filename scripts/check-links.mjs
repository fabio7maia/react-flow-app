// Fails on broken internal links (and anchors) in the built docs site.
// Usage: node scripts/check-links.mjs [dir=website/dist]   (yarn docs:build first)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] ?? 'website/dist');

const walk = dir =>
	readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});

const pages = walk(dist).filter(file => file.endsWith('.html'));
const ids = new Map();
const idsOf = file => {
	if (!ids.has(file)) {
		const html = readFileSync(file, 'utf8');
		ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
	}
	return ids.get(file);
};

const target = path => {
	const file = join(dist, path);
	if (existsSync(file) && statSync(file).isFile()) return file;
	const index = join(file, 'index.html');
	return existsSync(index) ? index : undefined;
};

const broken = [];
for (const page of pages) {
	const html = readFileSync(page, 'utf8');
	const here = '/' + page.slice(dist.length + 1).replace(/index\.html$/, '');
	for (const [, raw] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
		if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(raw)) continue;
		const [pathAndQuery, hash] = raw.split('#');
		const path = decodeURIComponent(pathAndQuery.split('?')[0]) || here;
		const file = target(path.startsWith('/') ? path : join(dirname(here + 'x'), path));
		if (!file) broken.push(`${here}: ${raw} (no such page or file)`);
		else if (hash && file.endsWith('.html') && !idsOf(file).has(hash)) broken.push(`${here}: ${raw} (no such anchor)`);
	}
}

if (broken.length) {
	console.error(`${broken.length} broken link(s):\n${[...new Set(broken)].join('\n')}`);
	process.exit(1);
}
console.log(`Links OK: ${pages.length} pages checked.`);
