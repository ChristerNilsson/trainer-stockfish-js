import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const engine = 'node_modules/stockfish/src/stockfish-17.1-single-a496a04';
const files = [
  'index.html', 'app.js', 'engine-worker.js', 'style.css', 'andersson.fen', 'assets',
  'node_modules/chess.js/dist/esm/chess.js',
  'node_modules/chess.js/LICENSE',
  'node_modules/stockfish/Copying.txt',
  `${engine}.js`,
  ...Array.from({ length: 6 }, (_, i) => `${engine}-part-${i}.wasm`),
];

// Preserve relative URLs so the same application works at / and /repository/.
for (const file of files) {
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(root, file), target, { recursive: true });
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log('GitHub Pages-filer skapade i dist/ (inklusive motorns sex WASM-delar).');
