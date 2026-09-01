#!/usr/bin/env node
'use strict';

// One-command demo runner: opens two free Cloudflare Quick Tunnels (no
// account needed) — one to the local backend, one to the Expo dev server —
// so both the API and the QR code work from a phone on any network, not
// just the same Wi-Fi. Nothing here is a persistent cloud deployment; both
// tunnels die with this process and everything still runs on this machine.
//
// Expo's own built-in `--tunnel` flag (ngrok-based, via @expo/ngrok) turned
// out to be unreliable — ngrok's edge now rejects the old anonymous-tunnel
// protocol that bundled binary speaks ("remote gone away"). Cloudflare
// Quick Tunnels don't have that problem, so this tunnels the dev server
// through cloudflared too and points Expo at it via EXPO_PACKAGER_PROXY_URL
// (a documented, if "@deprecated", override Expo CLI reads specifically
// for "custom proxy URLs" — see @expo/cli's UrlCreator.js).

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const BACKEND_PORT = 3002;
const METRO_PORT = 8081;
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const TUNNEL_TIMEOUT_MS = 30000;

// winget-installed cloudflared may not be on PATH until a fresh shell picks
// up the updated system PATH — fall back to its default install location.
const CLOUDFLARED_CANDIDATES = [
  'cloudflared',
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
];

function resolveCloudflaredBin() {
  for (const candidate of CLOUDFLARED_CANDIDATES) {
    if (candidate === 'cloudflared') {
      const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
      if (!result.error) return candidate;
    } else if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function openTunnel(cloudflaredBin, port, label) {
  return new Promise((resolve, reject) => {
    // --edge-ip-version 4: this machine's IPv6 route to Cloudflare's edge is
    // broken ("wsasendto: A socket operation was attempted to an unreachable
    // network"). Forcing IPv4 fixed *that* failure mode, but the QUIC
    // control stream kept flapping anyway ("control stream encountered a
    // failure while serving" / "context canceled", every 15-20s) even over
    // IPv4 — QUIC runs over UDP, and something on this network (firewall,
    // AV, NAT) is killing long-lived UDP flows outright. --protocol http2
    // forces cloudflared onto HTTP/2-over-TCP instead, sidestepping UDP
    // entirely — the standard fix for exactly this class of flapping.
    const child = spawn(cloudflaredBin, [
      'tunnel',
      '--edge-ip-version', '4',
      '--protocol', 'http2',
      '--url', `http://localhost:${port}`,
    ]);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (resolved) return;
      child.kill();
      reject(new Error(`No tunnel URL detected for ${label} after ${TUNNEL_TIMEOUT_MS / 1000}s`));
    }, TUNNEL_TIMEOUT_MS);

    function handleOutput(chunk) {
      const text = chunk.toString();
      process.stderr.write(`[${label}] ${text}`);
      if (resolved) return;
      const match = text.match(TUNNEL_URL_RE);
      if (match) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ url: match[0], process: child });
      }
    }

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function writeBackendUrl(backendUrl) {
  let existing = '';
  try {
    existing = fs.readFileSync(ENV_PATH, 'utf8');
  } catch {
    // no .env yet
  }
  const lines = existing.split('\n').filter((line) => line && !line.startsWith('EXPO_PUBLIC_BACKEND_URL='));
  lines.push(`EXPO_PUBLIC_BACKEND_URL=${backendUrl}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
}

// Running this a second time while a dev server (this script or a plain
// `expo start`) already owns METRO_PORT doesn't queue or fail cleanly — Expo
// CLI prompts "Use port 8082 instead?" and, left unanswered in a
// non-interactive/background terminal, just hangs or skips starting
// entirely, while the tunnels it already opened before that prompt keep
// running and overwrite .env's EXPO_PUBLIC_BACKEND_URL with a second,
// competing tunnel URL — silently breaking whatever was already working.
// Bail out up front instead of walking into that.
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  if (await isPortInUse(METRO_PORT)) {
    console.error(
      `Port ${METRO_PORT} is already in use — a dev server (this script, or a plain "expo start") is already running.`,
    );
    console.error('Stop that one first (or just use it) before running `npm run demo` again.');
    process.exit(1);
  }

  const cloudflaredBin = resolveCloudflaredBin();
  if (!cloudflaredBin) {
    console.error('Could not find cloudflared on PATH or in its default install location.');
    console.error('Install it with: winget install --id Cloudflare.cloudflared');
    process.exit(1);
  }
  console.log(`Using cloudflared: ${cloudflaredBin}\n`);

  console.log(`Opening a tunnel to the backend on http://localhost:${BACKEND_PORT} ...`);
  console.log('(Make sure comficare-backend + its database are already running: npm run start:dev)');
  const backendTunnel = await openTunnel(cloudflaredBin, BACKEND_PORT, 'backend');
  console.log(`Backend tunnel ready: ${backendTunnel.url}\n`);
  writeBackendUrl(backendTunnel.url);

  console.log(`Opening a tunnel to the Expo dev server on http://localhost:${METRO_PORT} ...`);
  const metroTunnel = await openTunnel(cloudflaredBin, METRO_PORT, 'metro');
  console.log(`Dev server tunnel ready: ${metroTunnel.url}\n`);
  console.log('Starting Expo — scan the QR code below with Expo Go.\n');

  const cleanup = () => {
    backendTunnel.process.kill();
    metroTunnel.process.kill();
  };

  // shell: true — spawning the .cmd shim directly on Windows throws EINVAL
  // without it (a long-standing Node/Windows quirk with batch-file shims).
  const expo = spawn('npx', ['expo', 'start', '--port', String(METRO_PORT)], {
    stdio: 'inherit',
    cwd: ROOT,
    shell: true,
    env: { ...process.env, EXPO_PACKAGER_PROXY_URL: metroTunnel.url },
  });

  expo.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
  process.on('SIGINT', () => {
    expo.kill();
    cleanup();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
