const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const repo = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const start = html.indexOf('const SOUND_LAB_SOUNDS = [');
const end = html.indexOf('function SoundLabExplorer()', start);
if (start < 0 || end < 0) throw new Error('Sound lab helpers were not found.');

const helperSource = html.slice(start, end) + '\nthis.soundLabTest = { SOUND_LAB_SOUNDS, soundLabTokenizeIpa, soundLabPickPhonetic };';
const sandbox = {};
vm.runInNewContext(helperSource, sandbox);
const { SOUND_LAB_SOUNDS, soundLabTokenizeIpa, soundLabPickPhonetic } = sandbox.soundLabTest;

if (SOUND_LAB_SOUNDS.length !== 44) throw new Error(`Expected 44 sounds, found ${SOUND_LAB_SOUNDS.length}.`);
if (new Set(SOUND_LAB_SOUNDS.map(sound => sound.audio)).size !== 44) throw new Error('Audio paths are not unique.');

const examples = [
  ['teacher', '/ˈtiː.t͡ʃəː/', ['t','iː','tʃ','ə']],
  ['hello', '/həˈloʊ/', ['h','ə','l','əʊ']],
  ['thought', '/θɔt/', ['θ','ɔː','t']],
];
for (const [word, ipa, expected] of examples) {
  const actual = soundLabTokenizeIpa(ipa).filter(token => token.sound).map(token => token.sound.ipa);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${word}: expected ${expected.join(' ')}, got ${actual.join(' ')}.`);
  }
}

const picked = soundLabPickPhonetic({ entries:[{ pronunciations:[
  { type:'ipa', text:'/təˈtʃɚ/', tags:['General American'] },
  { type:'ipa', text:'/ˈtiː.t͡ʃəː/', tags:['Received Pronunciation'] },
] }] });
if (picked !== '/ˈtiː.t͡ʃəː/') throw new Error('British/RP transcription was not preferred.');

const audioDir = path.join(repo, 'audio', 'phonemes');
const hashes = new Set();
const peaks = [];
for (const sound of SOUND_LAB_SOUNDS) {
  const file = path.join(repo, sound.audio);
  const bytes = fs.readFileSync(file);
  if (bytes.length < 1000 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Invalid WAV file: ${sound.audio}`);
  }
  hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
  const dataChunk = bytes.indexOf(Buffer.from('data'));
  if (dataChunk < 0) throw new Error(`Missing WAV data chunk: ${sound.audio}`);
  const dataSize = bytes.readUInt32LE(dataChunk + 4);
  let peak = 0;
  for (let offset = dataChunk + 8; offset + 1 < dataChunk + 8 + dataSize; offset += 2) {
    peak = Math.max(peak, Math.abs(bytes.readInt16LE(offset)));
  }
  peaks.push(peak);
}
if (hashes.size < 40) throw new Error(`Too many duplicate audio files: ${hashes.size} unique.`);
if (Math.min(...peaks) < 18000) throw new Error(`Phoneme audio is too quiet: minimum peak ${Math.min(...peaks)}.`);

if (!/new Audio\(new URL\(sound\.audio, document\.baseURI\)\.href\)/.test(html)) throw new Error('Phoneme playback is not using isolated audio.');
if (/const playPhoneme[\s\S]{0,500}pronounceEnglish\(active\.words\[0\]/.test(html)) throw new Error('Phoneme playback still speaks the example word.');
if (!/placeholder="Ex\.: teacher"/.test(html) || !/Ouvir todos, som por som/.test(html)) throw new Error('Word analyzer controls are missing.');
if (!/freedictionaryapi\.com[\s\S]+api\.dictionaryapi\.dev/.test(html)) throw new Error('Pronunciation API fallback is missing.');
if (!/useState\(0\.85\)/.test(html) || !/player\.playbackRate = soundSpeed/.test(html)) throw new Error('Slower phoneme playback is missing.');
if (!/audioCacheRef = useRef\(new Map\(\)\)/.test(html)) throw new Error('Preloaded phoneme audio cache is missing.');

console.log(`sound-lab-ok sounds=${SOUND_LAB_SOUNDS.length} wav=${fs.readdirSync(audioDir).filter(name => name.endsWith('.wav')).length} unique-audio=${hashes.size}`);
