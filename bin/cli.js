#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { AstPruner } from '../src/index.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { InflowPaywall } from '../src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
✂️ TokenPrune Wasm — Deterministic AST Context Pruner for LLMs & AI Coding Agents
Usage:
  tokenprune <fileOrDir> [--output <file>] [--stats] [--json] [--license <KEY>]
  tokenprune bench

Options:
  <fileOrDir>           Source file or directory to prune for LLM prompt context
  --output <file>       Write pruned context to target file (default: stdout)
  --stats               Print token reduction statistics & dollar savings
  --json                Output machine-readable JSON evaluation
  --license <KEY>       Offline Ed25519 commercial license (or TOKENPRUNE_LICENSE_KEY)
  --emergency-pass-24h  24-hour temporary grace period bypass for urgent production CI deploys
`);
  process.exit(0);
}

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const licenseKey = getArgValue('--license') || process.env.TOKENPRUNE_LICENSE_KEY;
const license = verifyOfflineLicenseKey(licenseKey);
const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.TOKENPRUNE_EMERGENCY_GRACE;

const target = args.find(a => !a.startsWith('-'));

if (!target) {
  console.error('Error: Source file or directory path is required.');
  process.exit(1);
}

const filesToProcess = [];

if (fs.existsSync(target)) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const listFiles = (dir) => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) listFiles(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
          filesToProcess.push(full);
        }
      }
    };
    listFiles(target);
  } else {
    filesToProcess.push(target);
  }
} else {
  console.error(`Error: Path not found: ${target}`);
  process.exit(1);
}

// In-Flow Paywall check
const paywallStatus = InflowPaywall.evaluate({
  productName: 'TokenPrune Wasm Pro Context Suite',
  metricName: 'source files pruned',
  currentValue: filesToProcess.length,
  freeLimit: license.maxFilesPerRun,
  checkoutUrl: 'https://buy.polar.sh/polar_cl_BeGjZghhPIilCdSBQGhvIFd2o8MyhngRnpZ0F34etCB',
  priceText: '$29 one-time lifetime'
}, license.valid, hasEmergencyGrace);

if (!paywallStatus.allowed) {
  if (paywallStatus.ansiBanner) {
    process.stderr.write(paywallStatus.ansiBanner);
  }
  process.exit(1);
}

if (paywallStatus.isEmergencyGrace && paywallStatus.ansiBanner) {
  process.stderr.write(paywallStatus.ansiBanner);
}

let totalOriginalTokens = 0;
let totalPrunedTokens = 0;
let aggregatedContent = '';
const results = [];

for (const file of filesToProcess) {
  const content = fs.readFileSync(file, 'utf8');
  const res = AstPruner.pruneTypeScript(content, file);
  results.push(res);
  totalOriginalTokens += res.originalTokensEstimate;
  totalPrunedTokens += res.prunedTokensEstimate;
  aggregatedContent += `// --- File: ${file} (Pruned) ---\n` + res.prunedContent + '\n';
}

const totalSavedTokens = totalOriginalTokens - totalPrunedTokens;
const totalSavedPercent = totalOriginalTokens > 0 ? Math.round((totalSavedTokens / totalOriginalTokens) * 100) : 0;
// Estimated dollar savings per 100k agent runs at $3/1M tokens
const estimatedSavings100k = ((totalSavedTokens * 100000) / 1000000) * 3.0;

const outputPath = getArgValue('--output');
if (outputPath) {
  fs.writeFileSync(outputPath, aggregatedContent, 'utf8');
}

if (args.includes('--json')) {
  console.log(JSON.stringify({
    files: results.map(r => ({
      file: r.filePath,
      originalTokens: r.originalTokensEstimate,
      prunedTokens: r.prunedTokensEstimate,
      savingsPercent: r.savingsRatioPercent
    })),
    summary: {
      totalOriginalTokens,
      totalPrunedTokens,
      totalSavedTokens,
      savingsRatioPercent: totalSavedPercent,
      estimatedSavingsUSD: Number(estimatedSavings100k.toFixed(2))
    },
    license
  }, null, 2));
} else if (args.includes('--stats') || outputPath) {
  console.log(`\n✂️ TokenPrune Wasm Summary:`);
  console.log(`  Files Processed:     ${filesToProcess.length}`);
  console.log(`  Original Context:    ${totalOriginalTokens.toLocaleString()} tokens`);
  console.log(`  Pruned Context:      ${totalPrunedTokens.toLocaleString()} tokens`);
  console.log(`  Tokens Saved:        \x1b[32m-${totalSavedTokens.toLocaleString()} tokens (${totalSavedPercent}% reduction)\x1b[0m`);
  console.log(`  Estimated Savings:   \x1b[32m~$${estimatedSavings100k.toFixed(2)} per 100k agent queries\x1b[0m`);
  if (outputPath) {
    console.log(`\n✅ Pruned context exported to: ${outputPath}`);
  }
} else {
  process.stdout.write(aggregatedContent);
}
