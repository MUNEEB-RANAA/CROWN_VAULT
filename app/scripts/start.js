'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');
const port = Number(process.env.PORT || 3000);
const child = spawn(process.execPath, [path.join(__dirname, '../server.js')], {
  cwd: path.join(__dirname, '..'), env: process.env, stdio: ['inherit', 'pipe', 'inherit']
});
let opened = false;
let output = '';
child.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  output = (output + chunk.toString()).slice(-1000);
  if (opened || !output.includes('CrownVault running at')) return;
  opened = true;
  if (process.platform === 'win32') {
    const browser = spawn('cmd.exe', ['/c', 'start', '', `http://localhost:${port}`], { stdio: 'ignore' });
    browser.on('error', () => console.log(`Open http://localhost:${port} in your browser.`));
  }
});
child.on('error', error => { console.error('Unable to start CrownVault:', error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
