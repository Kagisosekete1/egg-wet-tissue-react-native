const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, 'dist');
let html = fs.readFileSync(path.join(dist, 'online.html'), 'utf8');

function readAsset(pattern) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Expected a built browser asset matching ${pattern}`);
  return fs.readFileSync(path.join(dist, match[1].replace(/^\.\//, '')), 'utf8');
}

const css = readAsset(/<link rel="stylesheet" href="([^"]+)">/);
const launch = readAsset(/<script src="([^"]+)" defer><\/script>/);
const game = readAsset(/<script type="module" src="([^"]+)"><\/script>/);

html = html
  .replace(/<link rel="manifest"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/<link rel="stylesheet" href="[^"]+">/, `<style>${css}</style>`)
  .replace(/<script src="[^"]+" defer><\/script>/, `<script>${launch}</script>`)
  .replace(/<script type="module" src="[^"]+"><\/script>/, `<script type="module">${game}</script>`)
  .replace('Your progress stays saved in this browser.', 'Your progress is saved to your Supabase account.')
  .replace('</head>', '<style>#launch-repair{display:none!important}</style></head>');

fs.writeFileSync(path.join(dist, 'online-native.html'), html);
