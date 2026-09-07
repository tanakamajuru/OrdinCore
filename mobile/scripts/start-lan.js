#!/usr/bin/env node
/*
 * Starts Expo in LAN mode with the CORRECT host IP advertised to Expo Go.
 *
 * On this machine Expo tends to pick a non-reachable adapter (VirtualBox host-only 192.168.56.x,
 * a McAfee VPN adapter, or a 169.254.x link-local address), so the phone shows "could not connect".
 * This picks the real Wi-Fi/Ethernet LAN address and sets REACT_NATIVE_PACKAGER_HOSTNAME, then runs
 * `expo start --clear`. It auto-adapts when your DHCP address changes — no hardcoded IP.
 *
 * Any extra args are passed through, e.g. `npm run start:lan -- --android`.
 */
const os = require('os');
const { spawn } = require('child_process');

function pickHost() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (a.address.startsWith('169.254.')) continue;     // APIPA / link-local
      if (a.address.startsWith('192.168.56.')) continue;  // VirtualBox host-only default
      if (/virtualbox|vmware|vethernet|hyper-v|loopback|vpn|bluetooth/i.test(name)) continue;
      const isPrivate =
        /^10\./.test(a.address) ||
        /^192\.168\./.test(a.address) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(a.address);
      if (!isPrivate) continue;
      const score = /wi-?fi|wireless|wlan/i.test(name) ? 3 : /ethernet|lan/i.test(name) ? 2 : 1;
      candidates.push({ address: a.address, name, score });
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  return candidates[0];
}

const host = pickHost();
const env = { ...process.env };
if (host) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = host.address;
  console.log(`\n[start:lan] Advertising Metro on ${host.address}:8081  (via "${host.name}")`);
  console.log('[start:lan] Your phone must be on the SAME Wi-Fi. Scan the QR in Expo Go.\n');
} else {
  console.log('\n[start:lan] Could not auto-detect a LAN IP — falling back to Expo default.');
  console.log('[start:lan] If the phone can\'t connect, use: npm run start:tunnel\n');
}

const child = spawn('npx', ['expo', 'start', '--clear', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32', // npx is npx.cmd on Windows
});
child.on('exit', (code) => process.exit(code ?? 0));
