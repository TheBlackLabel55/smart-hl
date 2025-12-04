/**
 * Helper Script: Normalize Wallet Addresses
 * 
 * Usage: node scripts/normalize-wallets.js
 * 
 * Paste your addresses (one per line) into addresses.txt
 * This script will generate the TypeScript object format
 */

const fs = require('fs');
const path = require('path');

// Read addresses from file (one per line)
const addressesFile = path.join(__dirname, '../addresses.txt');
const outputFile = path.join(__dirname, '../lib/data/static-wallets.ts');

try {
  const addresses = fs.readFileSync(addressesFile, 'utf-8')
    .split('\n')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0 && addr.startsWith('0x'));

  console.log(`Found ${addresses.length} addresses`);

  // Generate TypeScript object
  const entries = addresses.map(addr => {
    const normalized = addr.toLowerCase();
    return `  '${normalized}': createSmartWallet('Manual Smart List'),`;
  }).join('\n');

  const template = `/**
 * Static Smart Money Wallets
 * Auto-generated from addresses.txt
 * Generated: ${new Date().toISOString()}
 */

import type { SmartWalletMap } from '@/types';

function createSmartWallet(label: string = 'Manual Smart List') {
  return {
    isSmartMoney: true,
    labels: [label],
    tier: 'smart' as const,
  };
}

export const STATIC_SMART_WALLETS: SmartWalletMap = {
${entries}
};

export function getStaticWalletCount(): number {
  return Object.keys(STATIC_SMART_WALLETS).length;
}
`;

  fs.writeFileSync(outputFile, template, 'utf-8');
  console.log(`✅ Generated ${addresses.length} wallet entries in ${outputFile}`);
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nUsage:');
  console.log('1. Create addresses.txt in project root');
  console.log('2. Paste addresses (one per line)');
  console.log('3. Run: node scripts/normalize-wallets.js');
}

