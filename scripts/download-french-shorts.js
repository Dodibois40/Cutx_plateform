#!/usr/bin/env node
/**
 * Download French woodworking/furniture shorts from YouTube
 * Usage: node scripts/download-french-shorts.js [--limit=N]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  outputDir: path.join(__dirname, '../cutx-frontend/public/shorts'),
  outputJson: path.join(__dirname, '../cutx-frontend/src/data/local-shorts.json'),
  quality: '720',
  videosPerQuery: 5, // 5 vidéos par requête = ~115 vidéos total
};

// Requêtes optimisées pour du contenu populaire
const QUERIES = [
  // Menuiserie & Bois
  'woodworking satisfying shorts',
  'carpentry amazing shorts',
  'wood carving shorts viral',
  'furniture making shorts',
  'cabinet making shorts',
  'woodturning shorts',
  // Agencement & Design
  'interior design shorts viral',
  'home renovation shorts',
  'kitchen design shorts',
  'closet organization shorts',
  'custom furniture shorts',
  'built-in shelves shorts',
  // Artisanat
  'craftsman woodwork shorts',
  'handmade furniture shorts',
  'wood art shorts',
  'epoxy wood table shorts',
  'live edge table shorts',
  // DIY populaire
  'DIY furniture shorts viral',
  'home improvement shorts',
  'garage workshop shorts',
  'power tools shorts',
  'joinery techniques shorts',
];

// Parse args
const args = process.argv.slice(2);
let totalLimit = 0;
args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    totalLimit = parseInt(arg.split('=')[1], 10);
  }
});

const videosPerQuery = totalLimit > 0
  ? Math.ceil(totalLimit / QUERIES.length)
  : CONFIG.videosPerQuery;

console.log(`\n🎬 Téléchargement de shorts français`);
console.log(`📁 Dossier: ${CONFIG.outputDir}`);
console.log(`🔍 ${QUERIES.length} requêtes, ${videosPerQuery} vidéos/requête\n`);

// Ensure output dir exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Load existing videos
let existingVideos = [];
if (fs.existsSync(CONFIG.outputJson)) {
  try {
    existingVideos = JSON.parse(fs.readFileSync(CONFIG.outputJson, 'utf8'));
  } catch (e) {
    existingVideos = [];
  }
}
const existingIds = new Set(existingVideos.map(v => v.id));

async function downloadFromQuery(query, maxVideos) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Recherche: "${query}"`);

    const searchQuery = `ytsearch${maxVideos}:${query}`;
    const outputTemplate = path.join(CONFIG.outputDir, '%(id)s.%(ext)s');

    const args = [
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '-f', '18/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--no-playlist',
      '--match-filter', 'duration < 120',  // Only shorts (< 2 min)
      '--print-json',
      '--no-simulate',
      '--sleep-interval', '2',
      '--max-sleep-interval', '5',
      searchQuery
    ];

    const proc = spawn('yt-dlp', args);
    const results = [];
    let buffer = '';

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      // Try to parse complete JSON objects
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            const info = JSON.parse(line);
            if (info.id && !existingIds.has(info.id)) {
              const video = {
                id: info.id,
                title: info.title || 'Sans titre',
                author: info.uploader || info.channel || 'Inconnu',
                channelId: info.channel_id || '',
                thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
                views: info.view_count || 0,
                likes: info.like_count || 0,
                duration: info.duration || 0,
                query: query,
                localPath: `/shorts/${info.id}.mp4`
              };
              results.push(video);
              existingIds.add(info.id);
              console.log(`  ✅ ${info.id} - ${video.title.slice(0, 50)}...`);
            }
          } catch (e) {
            // Not valid JSON, ignore
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('error')) {
        console.log(`  ⚠️ ${msg.trim().slice(0, 80)}`);
      }
    });

    proc.on('close', (code) => {
      console.log(`  📦 ${results.length} vidéos téléchargées`);
      resolve(results);
    });

    // Timeout after 2 minutes per query
    setTimeout(() => {
      proc.kill('SIGTERM');
    }, 120000);
  });
}

async function main() {
  const allNewVideos = [];
  let downloaded = 0;
  const maxTotal = totalLimit > 0 ? totalLimit : QUERIES.length * videosPerQuery;

  for (const query of QUERIES) {
    if (totalLimit > 0 && downloaded >= totalLimit) break;

    const remaining = totalLimit > 0 ? totalLimit - downloaded : videosPerQuery;
    const toDownload = Math.min(videosPerQuery, remaining);

    const videos = await downloadFromQuery(query, toDownload);
    allNewVideos.push(...videos);
    downloaded += videos.length;

    // Pause between queries to avoid rate limiting
    if (QUERIES.indexOf(query) < QUERIES.length - 1) {
      console.log('  ⏳ Pause 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Merge with existing and save
  const allVideos = [...existingVideos, ...allNewVideos];
  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(allVideos, null, 2));

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Terminé!`);
  console.log(`   Nouvelles vidéos: ${allNewVideos.length}`);
  console.log(`   Total: ${allVideos.length}`);
  console.log(`   Fichier: ${CONFIG.outputJson}`);

  // List files
  const files = fs.readdirSync(CONFIG.outputDir).filter(f => f.endsWith('.mp4'));
  const totalSize = files.reduce((sum, f) => {
    return sum + fs.statSync(path.join(CONFIG.outputDir, f)).size;
  }, 0);
  console.log(`   Taille totale: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error);
