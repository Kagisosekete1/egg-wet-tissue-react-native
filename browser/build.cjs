const fs=require('fs'),path=require('path'),crypto=require('crypto');
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist',{recursive:true});fs.cpSync('public','dist',{recursive:true});
const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:['src/web/main.jsx'],bundle:true,minify:true,sourcemap:false,outfile:'dist/game.js',loader:{'.js':'jsx'},external:['./fonts/*'],alias:{'react-native':require('path').resolve('src/web/native-adapter.jsx'),'react-native-svg':require('path').resolve('src/web/svg-adapter.jsx')},define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});

require('fs').cpSync('assets/audio','dist/audio',{recursive:true});

const music=fs.readdirSync('assets/audio/mobile').filter(file=>file.endsWith('.mp3')).map(file=>'/audio/mobile/'+file);
// Keep original masters in source; ship only the smaller progressive streams.
for(const file of fs.readdirSync('dist/audio/game-music'))if(/\.(mp3|m4a)$/.test(file))fs.unlinkSync('dist/audio/game-music/'+file);
const effects=fs.readdirSync('assets/audio').filter(file=>/\.(wav|ogg)$/.test(file)).map(file=>'/audio/'+file);
const fonts=fs.readdirSync('public/fonts').filter(file=>file.endsWith('.woff2')).map(file=>'/fonts/'+file);
const core=['/launch.js','/index.html','/game.js','/game.css','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-180.png','/icons/maskable-512.png',...effects,...fonts];
const template=fs.readFileSync('scripts/sw-template.js','utf8');const digest=crypto.createHash('sha256').update(template);for(const file of core)digest.update(file).update(fs.readFileSync('dist'+file));const hash=digest.digest('hex').slice(0,16);
fs.writeFileSync('dist/sw.js',template.replace('__VERSION__',hash).replace('__CORE__',JSON.stringify(core)).replace('__MUSIC__',JSON.stringify(music)));

fs.copyFileSync('dist/sw.js','dist/offline-sw.js');
// Include the release marker so a deliberate refresh gets fresh browser asset URLs.
const release=fs.existsSync('dist/release.json')?fs.readFileSync('dist/release.json'):Buffer.alloc(0);
// Online release: fingerprint scripts so an old offline shell cannot supply stale code.
const onlineHash=crypto.createHash('sha256').update(fs.readFileSync('dist/game.js')).update(fs.readFileSync('dist/game.css')).update(fs.readFileSync('dist/launch.js')).update(release).digest('hex').slice(0,12);
let onlineHtml=fs.readFileSync('dist/index.html','utf8');
for(const file of ['game.js','game.css','launch.js']){const name=file.replace('.', '-online-'+onlineHash+'.');fs.copyFileSync('dist/'+file,'dist/'+name);onlineHtml=onlineHtml.replace('./'+file,'./'+name);}
fs.writeFileSync('dist/index.html',onlineHtml);fs.writeFileSync('dist/online.html',onlineHtml);fs.writeFileSync('dist/motion.html',onlineHtml);
// Existing installs can update to a worker which stops intercepting network requests.
fs.writeFileSync('dist/sw.js',`self.addEventListener('install',()=>self.skipWaiting());\nself.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();await self.registration.unregister();for(const client of await self.clients.matchAll({type:'window'})){const url=new URL(client.url);if(url.searchParams.get('motion-repair')==='1'){const next=new URL('motion?motion=on&recovered=15#/home',self.registration.scope);await client.navigate(next.href);}}})()));\n`);
