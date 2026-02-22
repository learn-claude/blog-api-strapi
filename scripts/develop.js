/**
 * Custom develop script for Strapi v5 TypeScript projects.
 *
 * Why this exists:
 * Strapi v5 loads content-type schemas from dist/src/api/ at runtime, but the
 * TypeScript compiler (tsc) only emits .js files — it does NOT copy .json files.
 * This script handles: compile TypeScript → copy JSON schemas → start Strapi.
 *
 * Usage: node scripts/develop.js
 */

'use strict';

const tsUtils = require('@strapi/typescript-utils');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ──────────────────────────────────────────────────────────────────────────────
// JSON schema copy
// ──────────────────────────────────────────────────────────────────────────────

function copyDir(src, dest, filterExt) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    if (item.isDirectory()) {
      copyDir(srcPath, destPath, filterExt);
    } else if (!filterExt || item.name.endsWith(filterExt)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copySchemas() {
  let copied = 0;

  // Copy schema.json files from src/api/*/content-types/ to dist/src/api/*/content-types/
  const srcApi = path.join(ROOT, 'src', 'api');
  const distApi = path.join(ROOT, 'dist', 'src', 'api');

  if (fs.existsSync(srcApi)) {
    for (const apiDir of fs.readdirSync(srcApi, { withFileTypes: true })) {
      if (!apiDir.isDirectory()) continue;
      const ctSrc = path.join(srcApi, apiDir.name, 'content-types');
      const ctDest = path.join(distApi, apiDir.name, 'content-types');
      if (!fs.existsSync(ctSrc)) continue;

      for (const ct of fs.readdirSync(ctSrc, { withFileTypes: true })) {
        if (!ct.isDirectory()) continue;
        const schemaPath = path.join(ctSrc, ct.name, 'schema.json');
        if (!fs.existsSync(schemaPath)) continue;
        const destDir = path.join(ctDest, ct.name);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(schemaPath, path.join(destDir, 'schema.json'));
        copied++;
      }
    }
  }

  // Copy extensions JSON files (e.g. users-permissions content-type overrides)
  const srcExt = path.join(ROOT, 'src', 'extensions');
  const distExt = path.join(ROOT, 'dist', 'src', 'extensions');
  if (fs.existsSync(srcExt)) {
    copyDir(srcExt, distExt, '.json');
  }

  console.log(`[dev] ✓ Copied ${copied} schema file(s) + extensions JSON to dist/`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Compile TypeScript (cleans dist + emits .js)
  console.log('[dev] Compiling TypeScript…');
  await tsUtils.compile(ROOT, { configOptions: { ignoreDiagnostics: false } });
  console.log('[dev] TypeScript compilation done.');

  // 2. Copy JSON schemas that tsc left behind
  copySchemas();

  // 3. Start Strapi (no rebuild — uses the dist we just built)
  console.log('[dev] Starting Strapi…\n');
  const strapiBin = path.join(ROOT, 'node_modules', '.bin', 'strapi');
  const child = spawn(process.execPath, [strapiBin, 'start'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });

  child.on('close', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => { child.kill('SIGINT'); });
  process.on('SIGTERM', () => { child.kill('SIGTERM'); });
}

main().catch((err) => {
  console.error('[dev] Fatal error:', err);
  process.exit(1);
});
