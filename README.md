# @topaisaas/tokenprune-wasm

> **Deterministic AST Code Context Pruner for LLMs and AI Coding Agents (Claude, Cursor, Copilot, Windsurf).**  
> Reduces API token consumption by 50% to 70% by collapsing internal method implementations into structural interfaces.

[![npm version](https://img.shields.io/npm/v/@topaisaas/tokenprune-wasm.svg)](https://www.npmjs.com/package/@topaisaas/tokenprune-wasm)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-v1-blue.svg)](action.yml)
[![Air-Gapped](https://img.shields.io/badge/Security-Air--Gapped%20Offline-green.svg)](https://topaisaas.dev)

---

## ⚡ The Problem

When developers or agents pass whole files or monorepos into LLMs (Claude 3.5 Sonnet, GPT-4o, DeepSeek), **50% to 70% of tokens are wasted** on private implementation logic, redundant loops, and internal method bodies when the LLM only needs the **public type signatures and interfaces**.

`tokenprune-wasm` operates locally in **under 20 milliseconds**, parsing TypeScript and JavaScript files into high-density structural interfaces.

---

## 🚀 Instant Usage

### 1. In Local Terminal or Pipeline
```bash
npx -y @topaisaas/tokenprune-wasm src/ --stats --output pruned_context.ts
```

### 2. Output Example
```typescript
// --- Original: 1,420 tokens ---
// --- Pruned:     412 tokens (-71% reduction) ---

export interface UserSession {
  userId: string;
  role: 'admin' | 'user';
}

export class SessionService {
  private config: Config;

  constructor(cfg: Config) /* [implementation collapsed for LLM context] */
  public async validateUser(token: string): Promise<UserSession> /* [implementation collapsed for LLM context] */
  public logout(userId: string): void /* [implementation collapsed for LLM context] */
}
```

### 3. In GitHub Actions CI
```yaml
- name: Optimize LLM Context
  uses: topaisaas-dev/tokenprune-wasm@v1
  with:
    path: 'src/'
    output_file: 'context.ts'
```

---

## 🛡️ Offline Ed25519 Commercial Licensing

- **Community Free Tier**: Up to 10 files pruned per execution.
- **Pro Lifetime**: Unlimited files and directories.
- **Instant 1-Click Unblock**: [Purchase License on Polar.sh](https://buy.polar.sh/polar_cl_BeGjZghhPIilCdSBQGhvIFd2o8MyhngRnpZ0F34etCB) ($29 one-time lifetime).
- **Emergency Production Hotfix Bypass**: Append `--emergency-pass-24h` to bypass paywalls for 24 hours during critical hotfixes.

---

## 📄 License

Apache-2.0. Copyright (c) 2026 TopAI Sovereign Studio.
