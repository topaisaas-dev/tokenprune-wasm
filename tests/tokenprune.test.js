import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AstPruner, verifyOfflineLicenseKey } from '../dist/index.js';

describe('TokenPrune Wasm Standalone Clean-Sheet Venture Test Suite', () => {

  const SAMPLE_TS_FILE = `
// Copyright (c) 2026 Enterprise Corp. All rights reserved.
// Licensed under MIT License.

import { Config } from './config.ts';

export interface UserSession {
  userId: string;
  role: 'admin' | 'user';
  permissions: string[];
}

export type AuthResult = {
  success: boolean;
  token?: string;
};

export class SessionService {
  private config: Config;

  constructor(cfg: Config) {
    this.config = cfg;
  }

  public async validateUser(token: string): Promise<UserSession> {
    const rawData = await fetch('https://api.internal/user');
    const json = await rawData.json();
    if (!json.valid) {
      throw new Error('Invalid authentication credentials');
    }
    const session: UserSession = {
      userId: json.id,
      role: json.role,
      permissions: json.scopes
    };
    return session;
  }

  public logout(userId: string): void {
    console.log('User logged out', userId);
  }
}
`;

  test('1. TypeScript Interface & Type Retention with Body Collapse', () => {
    const result = AstPruner.pruneTypeScript(SAMPLE_TS_FILE, 'user_service.ts');

    assert.ok(result.prunedContent.includes('export interface UserSession'));
    assert.ok(result.prunedContent.includes('export type AuthResult'));
    assert.ok(result.prunedContent.includes('export class SessionService'));
    assert.ok(result.prunedContent.includes('validateUser(token: string): Promise<UserSession>'));

    // Implementation internals should be collapsed!
    assert.ok(!result.prunedContent.includes('https://api.internal/user'));
    assert.ok(!result.prunedContent.includes('throw new Error'));
    assert.ok(result.prunedContent.includes('[implementation collapsed for LLM context]'));
  });

  test('2. Significant Token Savings Ratio (> 40%)', () => {
    const result = AstPruner.pruneTypeScript(SAMPLE_TS_FILE, 'user_service.ts');

    assert.ok(result.originalTokensEstimate > result.prunedTokensEstimate);
    assert.ok(result.tokensSaved > 50);
    assert.ok(result.savingsRatioPercent >= 40);
  });

  test('3. License Header & Boilerplate Stripping', () => {
    const result = AstPruner.pruneTypeScript(SAMPLE_TS_FILE, 'user_service.ts');

    assert.ok(!result.prunedContent.includes('Copyright (c) 2026 Enterprise Corp'));
    assert.ok(!result.prunedContent.includes('Licensed under MIT'));
  });

  test('4. Empty and Edge Case Source Handling', () => {
    const emptyResult = AstPruner.pruneTypeScript('', 'empty.ts');
    assert.equal(emptyResult.tokensSaved, 0);
    assert.equal(emptyResult.savingsRatioPercent, 0);

    const pureTypes = AstPruner.pruneTypeScript('export type ID = string;\n', 'types.ts');
    assert.ok(pureTypes.prunedContent.includes('export type ID = string;'));
  });

  test('5. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    const freeRes = verifyOfflineLicenseKey();
    assert.equal(freeRes.valid, false);
    assert.equal(freeRes.maxFilesPerRun, 10);

    const testRes = verifyOfflineLicenseKey('TOKENPRUNE_TEST_PRO_KEY');
    assert.equal(testRes.valid, true);
    assert.equal(testRes.maxFilesPerRun, Infinity);

    const polarRes = verifyOfflineLicenseKey('TOKENPRUNE-A1B2-C3D4-E5F6');
    assert.equal(polarRes.valid, true);
  });

});
