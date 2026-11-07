# Stockfish mot människa

Starta med `npm install` (första gången) och `npm start`. Öppna sedan http://localhost:8080 i en modern webbläsare. Node.js 20 eller senare rekommenderas. Sidan behöver servern och kan inte öppnas direkt som file://.

Välj din färg, antal noder och en FEN-position och tryck **Starta parti**. Klicka först på en egen pjäs och sedan på en markerad målruta. Vid bondeförvandling väljer du pjäs. Om motorn står på tur i den valda positionen gör den första draget automatiskt. Färg och FEN tillämpas när ett nytt parti startas; nodantalet kan ändras under partiet och används vid nästa sökning.

**Ladda andersson.fen** fyller i projektets exempelposition. Tryck sedan Starta parti. Aktuell FEN kan kopieras från fältet under draglistan.

Motorn är fullstor Stockfish 17.1 NNUE, enkeltrådad WebAssembly, via stockfish.js. Den läser in cirka 75 MB lokalt vid start. Den spelar sitt bästa hittade drag inom nodbudgeten; nodantalet är ett sökmål och kan överskridas något. Inga schackdata skickas till en extern tjänst och inga CDN-resurser används.

`npm test` provar riktig motorsökning, lagliga svar, FEN-positioner och specialdrag. Gränssnittet är svensk HTML/CSS/JavaScript utan byggsteg.

## GitHub Pages

1. Committa och pusha projektet inklusive `.github/workflows/pages.yml` och `package-lock.json`. `node_modules/`, `.npm-cache/` och `dist/` ska inte committas.
2. Välj **Settings → Pages → Build and deployment → Source → GitHub Actions** i GitHub-repot.
3. Flödet **Publish GitHub Pages** körs vid push till repots standardgren. Efter att Pages aktiverats kan du också starta det via **Actions → Publish GitHub Pages → Run workflow**, med standardgrenen vald.
4. Webbplatsens adress visas i flödets deployment och under **Settings → Pages**.

Flödet installerar låsta beroenden med `npm ci`, kör motortesterna och bygger `dist/` med `npm run build`. Endast webbfilerna och de beroenden som webbläsaren behöver publiceras, inklusive samtliga sex WASM-delar och licensfiler. Relativa sökvägar gör att sidan fungerar även under repots namn, utan en egen Node.js-server. GitHub-körningen och publiceringen sker först när filerna har pushats och Pages är aktiverat.

## Licenser

Stockfish.js / Stockfish: GPLv3. Licens finns i node_modules/stockfish/Copying.txt, källkod och bygginstruktioner på https://github.com/nmrugg/stockfish.js/tree/Stockfish17.1 (npm-paket stockfish@17.1.0). Vid vidare distribution av motorn ska GPLv3 följas, inklusive tillhandahållande av motsvarande källkod. chess.js 1.4.0: BSD-2-Clause, se node_modules/chess.js/LICENSE.

Brädet använder ett Lichess-inspirerat brunt tema och lokala SVG-pjäser ur Cburnett-serien av Colin M. L. Burnett (GPL-2.0-or-later). Original: https://github.com/lichess-org/lila/tree/master/public/piece/cburnett. Pjäserna är oförändrade; licensförteckningen finns i assets/pieces/LICHESS-COPYING.md.
