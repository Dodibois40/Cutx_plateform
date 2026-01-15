#!/usr/bin/env node
/**
 * Simple YouTube Shorts downloader - one query at a time
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../cutx-frontend/public/shorts');
const OUTPUT_JSON = path.join(__dirname, '../cutx-frontend/src/data/local-shorts.json');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load existing
let videos = [];
if (fs.existsSync(OUTPUT_JSON)) {
  try { videos = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8')); } catch(e) {}
}
const existingIds = new Set(videos.map(v => v.id));

// Requêtes FRANÇAISES - agencement, menuiserie, atelier
const QUERIES = [
  'agencement intérieur français',
  'menuiserie chantier france',
  'atelier menuiserie français',
  'cuisine sur mesure montage',
  'placard sur mesure installation',
  'dressing aménagement français',
  'rénovation appartement paris',
  'pose cuisine équipée',
  'agencement magasin boutique',
  'menuisier ébéniste français',
  'fabrication meuble sur mesure',
  'chantier agencement bureau',
  'artisan menuisier france',
  'bricolage menuiserie français',
  // Nouvelles requêtes
  'travaux maison france',
  'décoration intérieure française',
  'rangement maison astuce',
  'meuble bois massif artisan',
  'escalier bois fabrication',
  'parquet pose français',
  'terrasse bois construction',
  'verrière atelier installation',
  'bibliothèque sur mesure',
  'table bois massif fabrication',
];

async function downloadQuery(query, count) {
  return new Promise((resolve) => {
    console.log(`\n🔍 "${query}" (${count} vidéos)...`);

    const results = [];
    const args = [
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '-f', '18/bestvideo[height<=720]+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', path.join(OUTPUT_DIR, '%(id)s.%(ext)s'),
      '--match-filter', 'duration < 90',
      '--print', '%(id)s|||%(title)s|||%(uploader)s|||%(view_count)s|||%(like_count)s|||%(duration)s',
      '--no-simulate',
      '--sleep-interval', '1',
      `ytsearch${count}:${query} shorts`
    ];

    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.includes('|||'));
      for (const line of lines) {
        const [id, title, author, views, likes, duration] = line.split('|||');
        if (id && !existingIds.has(id)) {
          const video = {
            id,
            title: title || 'Sans titre',
            author: author || 'Inconnu',
            channelId: '',
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            views: parseInt(views) || 0,
            likes: parseInt(likes) || 0,
            duration: parseInt(duration) || 0,
            query,
            localPath: `/shorts/${id}.mp4`
          };
          results.push(video);
          existingIds.add(id);
          console.log(`  ✅ ${id}`);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Downloading') && msg.includes('video')) {
        // Progress indicator
      }
    });

    proc.on('close', () => {
      console.log(`  📦 ${results.length} nouvelles`);
      resolve(results);
    });

    // Timeout 3 min per query
    setTimeout(() => proc.kill(), 180000);
  });
}

async function main() {
  const limit = parseInt(process.argv[2]) || 100;
  const perQuery = Math.ceil(limit / QUERIES.length);

  console.log(`🎬 Téléchargement de ${limit} shorts`);
  console.log(`📁 ${OUTPUT_DIR}\n`);

  let total = 0;
  for (const query of QUERIES) {
    if (total >= limit) break;

    const newVideos = await downloadQuery(query, perQuery);
    videos.push(...newVideos);
    total += newVideos.length;

    // Save after each query
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(videos, null, 2));

    // Pause
    await new Promise(r => setTimeout(r, 3000));
  }

  // Final summary
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.mp4'));
  const size = files.reduce((s, f) => s + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);

  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ ${videos.length} vidéos (${(size/1024/1024).toFixed(0)} MB)`);
}

main().catch(console.error);
