#!/usr/bin/env node

/**
 * Crash Analysis Script
 * Identifies potential crash points in the React Native app
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Patterns that commonly cause crashes
const crashPatterns = [
  // Direct property access without null checks
  { pattern: /\.\w+\.\w+/g, type: 'Potential null reference', severity: 'medium' },
  
  // Array access without length check
  { pattern: /\[\d+\]/g, type: 'Direct array access', severity: 'medium' },
  
  // JSON.parse without try-catch
  { pattern: /JSON\.parse\(/g, type: 'Unhandled JSON.parse', severity: 'high' },
  
  // Network calls without error handling
  { pattern: /fetch\(/g, type: 'Fetch without error handling', severity: 'medium' },
  
  // Async operations without await/catch
  { pattern: /\.then\(/g, type: 'Promise without catch', severity: 'medium' },
  
  // Direct navigation without null check
  { pattern: /navigation\.\w+\(/g, type: 'Navigation call', severity: 'low' },
];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = [];
  
  crashPatterns.forEach(({ pattern, type, severity }) => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      results.push({
        file: filePath,
        line: lineNumber,
        type,
        severity,
        code: match[0]
      });
    }
  });
  
  return results;
}

function scanDirectory(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...scanDirectory(filePath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      try {
        results.push(...analyzeFile(filePath));
      } catch (error) {
        console.warn(`Could not analyze ${filePath}: ${error.message}`);
      }
    }
  });
  
  return results;
}

console.log('🔍 Analyzing potential crash points...\n');

const results = scanDirectory(srcDir);

// Group by severity
const grouped = {
  high: results.filter(r => r.severity === 'high'),
  medium: results.filter(r => r.severity === 'medium'),
  low: results.filter(r => r.severity === 'low')
};

// Report results
console.log('📊 CRASH ANALYSIS RESULTS\n');

['high', 'medium', 'low'].forEach(severity => {
  const items = grouped[severity];
  if (items.length > 0) {
    console.log(`🔴 ${severity.toUpperCase()} PRIORITY (${items.length} issues):`);
    
    // Group by type
    const byType = {};
    items.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });
    
    Object.entries(byType).forEach(([type, issues]) => {
      console.log(`  ${type}: ${issues.length} occurrences`);
      // Show first few examples
      issues.slice(0, 3).forEach(issue => {
        const relativePath = issue.file.replace(srcDir, '');
        console.log(`    ${relativePath}:${issue.line} - ${issue.code}`);
      });
      if (issues.length > 3) {
        console.log(`    ... and ${issues.length - 3} more`);
      }
    });
    console.log();
  }
});

console.log(`✅ Analysis complete. Found ${results.length} potential issues.`);
console.log('\n💡 Recommendations:');
console.log('1. Focus on HIGH priority issues first');
console.log('2. Add null checks and error boundaries around risky operations');
console.log('3. Test each identified area manually');
console.log('4. Consider adding unit tests for crash-prone functions');