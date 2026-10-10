#!/usr/bin/env node
// Builds the design-system publish bundle from client/src/styles.scss.
//
//   node design-system/build.mjs               regenerate tokens + assemble .dist/project
//   node design-system/build.mjs --check       exit 1 if styles.scss drifted since the last sync
//   node design-system/build.mjs --mark-synced record the current state as synced (run after publishing)
//
// Tokens are generated from the :root custom properties. Guidelines, previews and
// the type scale are hand-written in design-system/src and copied as is.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dsDir, '..');
const stylesPath = path.join(root, 'client/src/styles.scss');
const srcDir = path.join(dsDir, 'src');
const distDir = path.join(dsDir, '.dist', 'project');
const generatedPath = path.join(dsDir, 'generated', 'tokens.json');
const statePath = path.join(dsDir, 'sync-state.json');

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);

// ---------------------------------------------------------------- parse :root

function splitStyles(scss) {
    const start = scss.indexOf(':root {');
    if (start < 0) throw new Error('No :root block found in styles.scss');
    let depth = 0;
    let end = -1;
    for (let i = scss.indexOf('{', start); i < scss.length; i++) {
        if (scss[i] === '{') depth++;
        if (scss[i] === '}' && --depth === 0) {
            end = i + 1;
            break;
        }
    }
    return { rootBlock: scss.slice(start, end), rest: scss.slice(0, start) + scss.slice(end) };
}

function parseRoot(block) {
    const vars = [];
    const skipped = [];
    for (const line of block.split('\n')) {
        const m = line.match(/^\s*--([\w-]+):\s*([^;]+);\s*(?:\/\/\s*(.*))?$/);
        if (!m) continue;
        const [, name, value, comment] = m;
        // rgb triplets feed rgba(var(--x-rgb), a); derived values reference other vars
        if (name.endsWith('-rgb') || value.includes('var(')) {
            skipped.push(name);
            continue;
        }
        vars.push({ name, value: value.trim(), comment: comment?.trim() });
    }
    return { vars, skipped };
}

// ---------------------------------------------------------------- tokens

const usage = readJson(path.join(srcDir, 'usage.json'), {});
const usageFor = (name, comment, fallback) => {
    if (usage[name]) return usage[name];
    if (comment && !/^[\d.]+(px|rem)\b/.test(comment) && !/^\d+px$/.test(comment)) return comment;
    return fallback;
};

const FAMILIES = [
    // [prefix, family key, usage fallback]
    ['color-', 'color', 'Colour scale step.'],
    ['spacing-', 'spacing', 'Spacing scale step.'],
    ['radius-', 'radius', 'Corner radius step.'],
    ['shadow-', 'shadow', 'Elevation.'],
    ['font-size-', 'fontSize', 'Font size step.'],
    ['font-weight-', 'fontWeight', 'Font weight.'],
    ['line-height-', 'lineHeight', 'Line height.'],
    ['letter-spacing-', 'letterSpacing', 'Letter spacing.'],
    ['z-', 'zIndex', 'Stacking layer.'],
    ['layout-', 'layout', 'Layout constant.'],
];

function buildTokens(vars) {
    const type = readJson(path.join(srcDir, 'type.json'), { groups: [] });
    const tokens = {
        name: 'HR Platform',
        version: 1,
        color: { themes: [{ id: 'light', name: 'Light' }], tokens: [] },
        type: { fonts: [], families: { sans: 'Roboto, "Helvetica Neue", sans-serif' }, groups: type.groups },
    };
    const unplaced = [];
    for (const v of vars) {
        const fam = FAMILIES.find(([prefix]) => v.name.startsWith(prefix));
        if (!fam) {
            unplaced.push(v.name);
            continue;
        }
        const [, key, fallback] = fam;
        const entry = { name: v.name, usage: usageFor(v.name, v.comment, fallback) };
        if (key === 'color') {
            entry.value = { light: v.value };
            tokens.color.tokens.push(entry);
        } else {
            entry.value = key === 'shadow' ? { light: v.value } : v.value;
            (tokens[key] ??= { tokens: [] }).tokens.push(entry);
        }
    }
    return { tokens, unplaced };
}

// ---------------------------------------------------------------- run

const scss = fs.readFileSync(stylesPath, 'utf8');
const { rootBlock, rest } = splitStyles(scss);
const { vars, skipped } = parseRoot(rootBlock);
const { tokens, unplaced } = buildTokens(vars);
const tokensText = JSON.stringify(tokens, null, 2) + '\n';
const stylesHash = sha(rest);
const state = readJson(statePath, {});
const mode = process.argv[2];

if (mode === '--check') {
    // Compare parsed JSON so Prettier reformatting of the committed file is not drift.
    const committed = readJson(generatedPath, null);
    const tokenDrift = JSON.stringify(committed) !== JSON.stringify(tokens);
    const styleDrift = state.stylesHash !== stylesHash;
    if (tokenDrift) console.log('Tokens differ from design-system/generated/tokens.json. Run: npm run ds:build');
    if (styleDrift) console.log('styles.scss component rules changed since the last sync. Review design-system/src/components, rebuild, republish.');
    if (!tokenDrift && !styleDrift) console.log('Design system is in sync with styles.scss.');
    process.exit(tokenDrift || styleDrift ? 1 : 0);
}

if (mode === '--mark-synced') {
    fs.writeFileSync(
        statePath,
        JSON.stringify({ stylesHash, tokensHash: sha(tokensText), syncedAt: new Date().toISOString() }, null, 2) + '\n',
    );
    console.log('Recorded current styles.scss as synced.');
    process.exit(0);
}

// Assemble the publish bundle: src/** + generated tokens + preview base CSS.
fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
fs.writeFileSync(generatedPath, tokensText);
fs.rmSync(path.join(dsDir, '.dist'), { recursive: true, force: true });

const baseCss = fs.readFileSync(path.join(srcDir, 'preview-base.css'), 'utf8');
const BASE_TAG = '<!-- ds:base -->';
const skip = new Set(['usage.json', 'type.json', 'preview-base.css']);
let copied = 0;
(function copy(dir, rel = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const relPath = path.join(rel, entry.name);
        if (entry.isDirectory()) {
            copy(path.join(dir, entry.name), relPath);
            continue;
        }
        if (skip.has(relPath.replaceAll('\\', '/'))) continue;
        let text = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        if (entry.name === 'preview.html') text = text.replace(BASE_TAG, `<style>${baseCss}</style>`);
        const out = path.join(distDir, relPath);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, text);
        copied++;
    }
})(srcDir);
fs.writeFileSync(path.join(distDir, 'tokens.json'), tokensText);

const count = (k) => tokens[k]?.tokens?.length ?? 0;
console.log(`Tokens: ${tokens.color.tokens.length} colors, ${count('spacing')} spacing, ${count('radius')} radius, ${count('shadow')} shadow, ${count('fontSize')} font sizes, ${count('zIndex')} z-index.`);
console.log(`Bundle: ${copied + 1} files in design-system/.dist/project`);
if (skipped.length) console.log(`Skipped (derived or rgb helpers): ${skipped.join(', ')}`);
if (unplaced.length) console.log(`Not placed in a token family: ${unplaced.join(', ')}`);
