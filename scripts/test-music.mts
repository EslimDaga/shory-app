import { extractMusicLink, fetchTrackMetadata } from '../src/services/music/musicService';

const inputs = process.argv.slice(2);

if (inputs.length === 0) {
  console.error('Usage: npm run test:music -- "<Spotify | YouTube Music | Apple Music link>"');
  process.exit(1);
}

for (const text of inputs) {
  console.log(`\n▶ ${text}`);
  const link = extractMusicLink(text);
  if (!link) {
    console.log('  ✗ No supported music link found');
    continue;
  }
  try {
    const track = await fetchTrackMetadata(link);
    console.log(`  source:   ${track.source}`);
    console.log(`  title:    ${track.title}`);
    console.log(`  artist:   ${track.artist ?? '—'}`);
    console.log(`  cover:    ${track.coverUrl}`);
    console.log(`  accent:   ${track.accentColor ?? '—'}`);
    console.log(`  duration: ${track.durationMs ? `${Math.round(track.durationMs / 1000)}s` : '—'}`);
  } catch (error) {
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
