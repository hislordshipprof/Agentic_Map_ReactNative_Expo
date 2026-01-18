/**
 * Fixes ESM module resolution issues in expo-sqlite for Node.js 22+
 * This script adds explicit .js extensions to imports which is required for ESM
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  {
    file: 'node_modules/expo-sqlite/build/index.js',
    replacements: [
      { from: "export * from './SQLite';", to: "export * from './SQLite.js';" },
      { from: "export * from './SQLite.types';", to: "export * from './SQLite.types.js';" }
    ]
  },
  {
    file: 'node_modules/expo-sqlite/build/SQLite.js',
    replacements: [
      { from: "import './polyfillNextTick';", to: "import './polyfillNextTick.js';" },
      { from: "import customOpenDatabase from '@expo/websql/custom';", to: "import customOpenDatabase from '@expo/websql/custom/index.js';" }
    ]
  }
];

console.log('Fixing expo-sqlite ESM imports...');

filesToFix.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`ℹ️  No changes needed: ${file}`);
  }
});

console.log('Done!');
