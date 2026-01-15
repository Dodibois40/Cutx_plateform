#!/usr/bin/env node
/**
 * Script de téléchargement des YouTube Shorts pour CutX Tube
 *
 * Usage:
 *   node download-shorts.js [--limit=N] [--quality=720|480|360]
 *
 * Prérequis:
 *   - yt-dlp installé (winget install yt-dlp)
 *   - ffmpeg installé (winget install ffmpeg)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  inputJson: path.join(__dirname, '../cutx-frontend/src/data/youtube-shorts.json'),
  outputDir: path.join(__dirname, '../cutx-frontend/public/shorts'),
  outputJson: path.join(__dirname, '../cutx-frontend/src/data/local-shorts.json'),
  quality: '720', // 720, 480, 360
  limit: 0, // 0 = all
  concurrent: 1, // téléchargements simultanés (1 pour éviter rate limits)
};

// Parse args
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--limit=')) CONFIG.limit = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--quality=')) CONFIG.quality = arg.split('=')[1];
});

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Vérifier que yt-dlp est installé
function checkYtDlp() {
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Télécharger une vidéo
async function downloadVideo(video, index, total) {
  const outputPath = path.join(CONFIG.outputDir, `${video.id}.mp4`);

  // Skip si déjà téléchargé
  if (fs.existsSync(outputPath)) {
    log(`[${index}/${total}] ⏭️  Skip ${video.id} (déjà téléchargé)`, 'dim');
    return { ...video, localPath: `/shorts/${video.id}.mp4`, downloaded: true };
  }

  const url = `https://www.youtube.com/shorts/${video.id}`;

  // Format: préférer format combiné (18=360p), sinon meilleure vidéo + audio
  const format = '18/bestvideo[height<=720]+bestaudio/best';

  const args = [
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '-f', format,
    '--merge-output-format', 'mp4',
    '-o', outputPath,
    '--no-playlist',
    '--sleep-interval', '3',
    url
  ];

  return new Promise((resolve) => {
    log(`[${index}/${total}] ⬇️  Downloading ${video.id}...`, 'blue');

    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    let timeoutId;

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0 && fs.existsSync(outputPath)) {
        const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        log(`[${index}/${total}] ✅ ${video.id} (${size} MB)`, 'green');
        resolve({ ...video, localPath: `/shorts/${video.id}.mp4`, downloaded: true });
      } else {
        // Extraire l'erreur du output
        const errorLine = output.split('\n').find(l => l.includes('ERROR')) || output.split('\n')[0] || 'Unknown error';
        log(`[${index}/${total}] ❌ ${video.id}: ${errorLine.substring(0, 80)}`, 'red');
        resolve({ ...video, localPath: null, downloaded: false, error: errorLine });
      }
    });

    // Timeout après 5 minutes (YouTube impose des délais)
    timeoutId = setTimeout(() => {
      proc.kill();
      log(`[${index}/${total}] ⏱️  ${video.id}: Timeout`, 'yellow');
      resolve({ ...video, localPath: null, downloaded: false, error: 'Timeout' });
    }, 300000);
  });
}

// Télécharger par batch
async function downloadBatch(videos, startIndex, total) {
  const results = await Promise.all(
    videos.map((v, i) => downloadVideo(v, startIndex + i, total))
  );
  return results;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🎬 CutX Shorts Downloader', 'blue');
  console.log('='.repeat(60) + '\n');

  // Vérifier yt-dlp
  if (!checkYtDlp()) {
    log('❌ yt-dlp non trouvé. Installez avec: winget install yt-dlp', 'red');
    process.exit(1);
  }
  log('✅ yt-dlp détecté', 'green');

  // Créer dossier output
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    log(`📁 Dossier créé: ${CONFIG.outputDir}`, 'dim');
  }

  // Lire les vidéos
  if (!fs.existsSync(CONFIG.inputJson)) {
    log(`❌ Fichier non trouvé: ${CONFIG.inputJson}`, 'red');
    process.exit(1);
  }

  let videos = JSON.parse(fs.readFileSync(CONFIG.inputJson, 'utf8'));
  log(`📋 ${videos.length} vidéos trouvées`, 'dim');

  // Appliquer limite
  if (CONFIG.limit > 0) {
    videos = videos.slice(0, CONFIG.limit);
    log(`🔢 Limite: ${CONFIG.limit} vidéos`, 'yellow');
  }

  log(`🎯 Qualité: ${CONFIG.quality}p`, 'dim');
  log(`⚡ Concurrent: ${CONFIG.concurrent}\n`, 'dim');

  // Télécharger par batch
  const results = [];
  for (let i = 0; i < videos.length; i += CONFIG.concurrent) {
    const batch = videos.slice(i, i + CONFIG.concurrent);
    const batchResults = await downloadBatch(batch, i + 1, videos.length);
    results.push(...batchResults);
  }

  // Stats
  const downloaded = results.filter(r => r.downloaded);
  const failed = results.filter(r => !r.downloaded);

  console.log('\n' + '='.repeat(60));
  log(`📊 Résultats:`, 'blue');
  log(`   ✅ Téléchargés: ${downloaded.length}`, 'green');
  log(`   ❌ Échoués: ${failed.length}`, failed.length > 0 ? 'red' : 'dim');

  // Calculer taille totale
  let totalSize = 0;
  downloaded.forEach(v => {
    const filePath = path.join(CONFIG.outputDir, `${v.id}.mp4`);
    if (fs.existsSync(filePath)) {
      totalSize += fs.statSync(filePath).size;
    }
  });
  log(`   💾 Taille totale: ${(totalSize / 1024 / 1024).toFixed(1)} MB`, 'dim');

  // Sauvegarder JSON des vidéos locales
  const localVideos = downloaded.map(v => ({
    id: v.id,
    title: v.title,
    author: v.author,
    channelId: v.channelId,
    thumbnail: v.thumbnail,
    views: v.views,
    likes: v.likes,
    query: v.query,
    localPath: v.localPath,
  }));

  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(localVideos, null, 2));
  log(`\n💾 JSON sauvegardé: ${CONFIG.outputJson}`, 'green');

  // Afficher les erreurs
  if (failed.length > 0) {
    console.log('\n' + '-'.repeat(60));
    log('Vidéos échouées:', 'yellow');
    failed.slice(0, 10).forEach(v => {
      log(`  - ${v.id}: ${v.error || 'Unknown'}`, 'dim');
    });
    if (failed.length > 10) {
      log(`  ... et ${failed.length - 10} autres`, 'dim');
    }
  }

  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
