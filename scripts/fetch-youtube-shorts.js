/**
 * Script de récupération de YouTube Shorts menuiserie/agencement
 * Usage: node scripts/fetch-youtube-shorts.js
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyApZi27ntCKZ5pJ6kzNOC6NU9PROV1hkAo';
const OUTPUT_FILE = path.join(__dirname, '../cutx-frontend/src/data/youtube-shorts.json');

// Mots-clés de recherche (multi-langues)
const SEARCH_QUERIES = [
  // Français
  'menuiserie shorts',
  'ébénisterie shorts',
  'travail du bois shorts',
  'agencement cuisine shorts',
  'pose cuisine shorts',
  'assemblage bois shorts',
  'finition bois shorts',

  // Anglais
  'woodworking shorts',
  'cabinet making shorts',
  'carpentry shorts',
  'joinery shorts',
  'wood finishing shorts',
  'dovetail joint shorts',
  'furniture making shorts',

  // Allemand
  'Tischlerei shorts',
  'Holzarbeit shorts',

  // Espagnol
  'carpintería shorts',
  'ebanistería shorts',
];

// Nombre de résultats par recherche (max 50)
const RESULTS_PER_QUERY = 50;

async function searchYouTube(query) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoDuration', 'short'); // Vidéos courtes uniquement
  url.searchParams.set('maxResults', RESULTS_PER_QUERY.toString());
  url.searchParams.set('order', 'viewCount'); // Les plus vues d'abord
  url.searchParams.set('key', API_KEY);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      console.error(`❌ Erreur pour "${query}":`, data.error.message);
      return [];
    }

    const videos = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      query: query, // Pour savoir d'où vient la vidéo
    }));

    console.log(`✅ "${query}" → ${videos.length} vidéos`);
    return videos;

  } catch (error) {
    console.error(`❌ Erreur réseau pour "${query}":`, error.message);
    return [];
  }
}

async function getVideoStats(videoIds) {
  // Récupère les stats (vues, likes) pour un lot de vidéos
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'statistics');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', API_KEY);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      console.error('❌ Erreur stats:', data.error.message);
      return {};
    }

    const stats = {};
    for (const item of data.items || []) {
      stats[item.id] = {
        views: parseInt(item.statistics.viewCount || '0'),
        likes: parseInt(item.statistics.likeCount || '0'),
      };
    }
    return stats;

  } catch (error) {
    console.error('❌ Erreur réseau stats:', error.message);
    return {};
  }
}

async function main() {
  console.log('🎬 Récupération des YouTube Shorts menuiserie...\n');

  let allVideos = [];

  // Recherche pour chaque mot-clé
  for (const query of SEARCH_QUERIES) {
    const videos = await searchYouTube(query);
    allVideos.push(...videos);

    // Pause pour respecter les quotas API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Dédupliquer par ID
  const uniqueVideos = [];
  const seenIds = new Set();

  for (const video of allVideos) {
    if (!seenIds.has(video.id)) {
      seenIds.add(video.id);
      uniqueVideos.push(video);
    }
  }

  console.log(`\n📊 Total: ${allVideos.length} → ${uniqueVideos.length} uniques\n`);

  // Récupérer les stats par lots de 50
  console.log('📈 Récupération des statistiques...');

  for (let i = 0; i < uniqueVideos.length; i += 50) {
    const batch = uniqueVideos.slice(i, i + 50);
    const ids = batch.map(v => v.id);
    const stats = await getVideoStats(ids);

    for (const video of batch) {
      if (stats[video.id]) {
        video.views = stats[video.id].views;
        video.likes = stats[video.id].likes;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Trier par vues décroissantes
  uniqueVideos.sort((a, b) => (b.views || 0) - (a.views || 0));

  // Créer le dossier data si nécessaire
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Sauvegarder
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueVideos, null, 2));

  console.log(`\n✅ ${uniqueVideos.length} shorts sauvegardés dans:`);
  console.log(`   ${OUTPUT_FILE}`);

  // Afficher le top 10
  console.log('\n🏆 Top 10 par vues:');
  uniqueVideos.slice(0, 10).forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.title.slice(0, 50)}... (${(v.views || 0).toLocaleString()} vues)`);
  });
}

main().catch(console.error);
