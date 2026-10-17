export interface PruneResult {
  filePath: string;
  originalBytes: number;
  prunedBytes: number;
  originalTokensEstimate: number;
  prunedTokensEstimate: number;
  tokensSaved: number;
  savingsRatioPercent: number;
  prunedContent: string;
}

export class AstPruner {
  /**
   * Estimates tokens from character count using standard OpenAI/Anthropic ratio (~3.8 chars/token).
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.8);
  }

  /**
   * Prunes TypeScript / JavaScript source code by collapsing internal function bodies,
   * retaining exports, type declarations, interfaces, class structures and method signatures.
   */
  public static pruneTypeScript(source: string, filePath = 'snippet.ts'): PruneResult {
    const originalBytes = Buffer.byteLength(source, 'utf8');
    const originalTokens = this.estimateTokens(source);

    let output = '';
    const lines = source.split('\n');

    let inBlockComment = false;
    let braceDepth = 0;
    let inFunctionBody = false;
    let functionBodyStartDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      // Skip large block comment headers
      if (trimmed.startsWith('/*') && !trimmed.endsWith('*/')) {
        inBlockComment = true;
        continue;
      }
      if (inBlockComment) {
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }

      // Skip single line comments if they are pure boilerplate/license
      if (trimmed.startsWith('//') && /(copyright|license|author|eslint-disable|prettier-ignore)/i.test(trimmed)) {
        continue;
      }

      // Track brace depth
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      // Identify function / method declaration starts
      const isFunctionStart = /(function\s+\w+|class\s+\w+|interface\s+\w+|type\s+\w+|enum\s+\w+|public\s+|private\s+|protected\s+|const\s+\w+\s*=\s*\(|=>\s*{)/.test(line);

      if (!inFunctionBody && isFunctionStart && line.includes('{') && !line.includes('class ') && !line.includes('interface ') && !line.includes('type ') && !line.includes('enum ')) {
        // Line starts a function/method body
        const openIdx = line.indexOf('{');
        const signature = line.slice(0, openIdx + 1);
        
        // If braces close on same line, keep or collapse
        if (openBraces === closeBraces) {
          output += `${signature} /* [collapsed] */ }\n`;
          continue;
        } else {
          inFunctionBody = true;
          functionBodyStartDepth = braceDepth;
          output += `${signature} /* [implementation collapsed for LLM context] */\n`;
          braceDepth += (openBraces - closeBraces);
          continue;
        }
      }

      if (inFunctionBody) {
        braceDepth += (openBraces - closeBraces);
        if (braceDepth <= functionBodyStartDepth) {
          // Reached end of function body
          inFunctionBody = false;
          output += `${' '.repeat(Math.max(0, braceDepth * 2))}}\n`;
        }
        // Skip interior lines of function body!
        continue;
      }

      braceDepth += (openBraces - closeBraces);
      output += line + '\n';
    }

    // Clean up excessive empty lines
    const cleanedContent = output.replace(/\n\s*\n\s*\n/g, '\n\n').trim() + '\n';
    const prunedBytes = Buffer.byteLength(cleanedContent, 'utf8');
    const prunedTokens = this.estimateTokens(cleanedContent);
    const tokensSaved = Math.max(0, originalTokens - prunedTokens);
    const savingsRatioPercent = originalTokens > 0 
      ? Math.round((tokensSaved / originalTokens) * 100) 
      : 0;

    return {
      filePath,
      originalBytes,
      prunedBytes,
      originalTokensEstimate: originalTokens,
      prunedTokensEstimate: prunedTokens,
      tokensSaved,
      savingsRatioPercent,
      prunedContent: cleanedContent
    };
  }
}
