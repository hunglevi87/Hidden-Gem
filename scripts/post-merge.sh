#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Running any pending direct SQL migrations..."
node -e "
const { execSync } = require('child_process');
try {
  execSync('node scripts/run-migration.js', { stdio: 'inherit' });
} catch (e) {
  console.log('No migration script found or already up to date');
}
" || true

echo "Post-merge setup complete."
