const { execSync } = require('child_process');
execSync('npx ts-node test-card.ts', { stdio: 'inherit' });
