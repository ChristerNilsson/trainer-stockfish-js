import { Chess, DEFAULT_POSITION } from './node_modules/chess.js/dist/esm/chess.js';
const $ = id => document.getElementById(id);
const names = { k:'kung',q:'dam',r:'torn',b:'löpare',n:'springare',p:'bonde' };
function pieceImage(color, type) {
  const image = document.createElement('img');
  image.className = 'piece';
  image.src = `./assets/pieces/cburnett/${color}${type.toUpperCase()}.svg`;
  image.alt = '';
  image.draggable = false;
  return image;
}
let game = new Chess(), human = 'w', orientation = 'w', selected = null;
let worker, ready = false, thinking = false, failed = false, generation = 0;
let initialFen = DEFAULT_POSITION, uciMoves = [];
let searchStats = {}, lastEngineMove = null;
function renderEngineLog() {
  const log = $('engine-log');
  log.replaceChildren();
  if (!lastEngineMove) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Inget motordrag ännu.';
    log.append(hint);
    return;
  }
  const stats = lastEngineMove;
  const number = value => value == null ? '—' : value.toLocaleString('sv-SE');
  const entries = [
    ['Drag', `${stats.san} (${stats.uci})`],
    ['Sökta noder', number(stats.nodes)],
    ['Nodbudget', number(stats.budget)],
    ['Söktid', stats.time == null ? '—' : `${number(stats.time)} ms`],
    ['Sökdjup', number(stats.depth)],
    ['Noder/sekund', number(stats.nps)],
  ];
  const list = document.createElement('dl');
  list.className = 'engine-stats';
  for (const [label, value] of entries) {
    const term = document.createElement('dt'), description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  }
  log.append(list);
}
$('fen').value = DEFAULT_POSITION;
function nodeLimit() {
  const n = Number($('nodes').value);
  if (![10, 100, 1000, 10000, 100000, 1000000].includes(n)) throw new Error('Välj 10, 100, 1k, 10k, 100k eller 1M noder.');
  return n;
}
function status() {
  if (game.isCheckmate()) return `Schackmatt. ${game.turn() === 'w' ? 'Svart' : 'Vit'} vinner.`;
  if (game.isStalemate()) return 'Remi genom patt.';
  if (game.isThreefoldRepetition()) return 'Remi genom trefaldig upprepning.';
  if (game.isInsufficientMaterial()) return 'Remi: otillräckligt material.';
  if (game.isDraw()) return 'Remi enligt 50-dragsregeln.';
  if (failed) return 'Motorn kunde inte laddas. Starta ett nytt parti för att försöka igen.';
  if (!ready) return 'Laddar Stockfish (cirka 75 MB). Vänta ett ögonblick…';
  if (thinking) return 'Stockfish tänker…';
  return `${game.turn() === human ? 'Din tur' : 'Motorns tur'}${game.isCheck() ? ' – schack!' : '.'}`;
}
function render() {
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  const legal = selected ? game.moves({square:selected,verbose:true}).map(m=>m.to) : [];
  const last = game.history({verbose:true}).at(-1);
  $('board').replaceChildren();
  [...ranks].forEach((rank, row) => [...files].forEach((file, col) => {
    const square = file + rank, piece = game.get(square);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'square';
    el.classList.toggle('dark', (file.charCodeAt(0)-97 + Number(rank)) % 2 === 1);
    el.classList.toggle('selected', selected === square);
    el.classList.toggle('legal', legal.includes(square));
    el.classList.toggle('last', last?.from === square || last?.to === square);
    el.setAttribute('aria-label', `${square}${piece ? ': ' + (piece.color === 'w' ? 'vit ' : 'svart ') + names[piece.type] : ''}`);
    if (piece) el.append(pieceImage(piece.color, piece.type));
    if (col === 0) { const label=document.createElement('span'); label.className='coord rank';label.textContent=rank;el.append(label); }
    if (row === 7) { const label=document.createElement('span'); label.className='coord file';label.textContent=file;el.append(label); }
    el.onclick = () => clickSquare(square);
    $('board').append(el);
  }));
  $('status').textContent = status();
  $('activity').textContent = failed ? 'Motorfel' : !ready ? 'Laddar motor…' : thinking ? 'Beräknar…' : 'Redo';
  $('turn').textContent = `${game.turn() === 'w' ? 'Vit' : 'Svart'} vid draget`;
  $('human-color').textContent = human === 'w' ? 'Vit' : 'Svart';
  $('engine-color').textContent = human === 'w' ? 'Svart' : 'Vit';
  $('current-fen').value = game.fen();
  const rows = new Map();
  for (const m of game.history({verbose:true})) {
    const number = m.before.split(' ')[5];
    if (!rows.has(number)) rows.set(number, {w:'—',b:'—'});
    rows.get(number)[m.color] = m.san;
  }
  $('moves').replaceChildren();
  if (!rows.size) {const p=document.createElement('p');p.className='hint';p.textContent='Partiets drag visas här.';$('moves').append(p);}
  for (const [num, moves] of rows) {
    const row = document.createElement('div'); row.className='move-row';
    for (const [i,value] of [num+'.', moves.w, moves.b].entries()) { const span=document.createElement('span');span.textContent=value;if(!i)span.className='move-number';row.append(span); }
    $('moves').append(row);
  }
  $('moves').scrollTop=$('moves').scrollHeight;
}
async function clickSquare(square) {
  if (!ready || thinking || game.isGameOver() || game.turn() !== human || $('promotion').open) return;
  const options = selected ? game.moves({square:selected,verbose:true}).filter(m=>m.to===square) : [];
  if (options.length) {
    const from = selected, token = generation;
    const promotion = options.some(m=>m.promotion) ? await choosePromotion() : undefined;
    if (token !== generation || promotion === null) return;
    const move = game.move({from,to:square,...(promotion ? {promotion} : {})});
    uciMoves.push(move.from+move.to+(move.promotion || '')); selected=null;
    render(); respond(); return;
  }
  selected = game.get(square)?.color === human && selected !== square ? square : null;
  render();
}
function choosePromotion() {
  return new Promise(resolve => {
    const dialog = $('promotion'), container = dialog.querySelector('.promotion-options');
    container.replaceChildren();
    dialog.oncancel = () => { selected=null;render(); };
    dialog.onclose = () => resolve(dialog.returnValue || null);
    for (const type of ['q','r','b','n']) {
      const button=document.createElement('button');button.append(pieceImage(human,type));button.setAttribute('aria-label',names[type]);
      button.onclick=()=>dialog.close(type);container.append(button);
    }
    dialog.returnValue='';dialog.showModal();
  });
}
function respond() {
  if (!ready || thinking || game.isGameOver() || game.turn() === human) return;
  let nodes;
  try { nodes=nodeLimit(); } catch(e) { $('error').textContent=e.message;return; }
  searchStats = { budget: nodes };
  $('error').textContent=''; thinking=true;render();
  worker.postMessage(`position fen ${initialFen}${uciMoves.length ? ' moves '+uciMoves.join(' ') : ''}`);
  worker.postMessage(`go nodes ${nodes}`);
}
function startEngine() {
  worker?.terminate(); const token=++generation;
  ready=false;thinking=false;failed=false;
  searchStats={};lastEngineMove=null;renderEngineLog();
  const timeout=setTimeout(()=>engineError('Motorn svarar inte. Prova att starta partiet igen.'),120000);
  function engineError(message) {
    if(token!==generation)return;
    clearTimeout(timeout);failed=true;ready=false;thinking=false;worker?.terminate();$('error').textContent=message;render();
  }
  try {
    worker=new Worker('./node_modules/stockfish/src/stockfish-17.1-single-a496a04.js');
    worker.onerror=()=>engineError('Kunde inte köra Stockfish. Öppna sidan via npm start i en modern webbläsare med WebAssembly.');
    worker.onmessage=({data})=>{
      if(token!==generation)return;
      for(const line of String(data).split('\n')) {
        if(line==='uciok') { worker.postMessage('setoption name Hash value 64');worker.postMessage('ucinewgame');worker.postMessage('isready'); }
        if(line==='readyok') {clearTimeout(timeout);ready=true;render();respond();}
        if(line.startsWith('info ') && thinking) {
          for (const field of ['nodes', 'time', 'depth', 'nps']) {
            const match = line.match(new RegExp(`\\b${field} (\\d+)`));
            if (match) searchStats[field] = Number(match[1]);
          }
          const nodes=line.match(/\bnodes (\d+)/), depth=line.match(/\bdepth (\d+)/);
          if(nodes)$('activity').textContent=`${Number(nodes[1]).toLocaleString('sv-SE')} noder${depth ? ' · djup '+depth[1] : ''}`;
        }
        if(line.startsWith('bestmove ') && thinking) {
          thinking=false;
          const uci=line.split(' ')[1];
          try {
            const move=game.move({from:uci.slice(0,2),to:uci.slice(2,4),...(uci.length===5 ? {promotion:uci[4]} : {})});
            lastEngineMove={...searchStats, san:move.san, uci};
            renderEngineLog();
            uciMoves.push(move.from+move.to+(move.promotion || ''));render();
          } catch {engineError('Motorn returnerade ett ogiltigt drag. Starta ett nytt parti.');}
        }
      }
    };
    worker.postMessage('uci');
  } catch {engineError('Webbläsaren kunde inte starta Stockfish.');}
  render();
}
$('settings').onsubmit = e => {
  e.preventDefault();
  try {
    nodeLimit(); const candidate = new Chess($('fen').value.trim());
    game=candidate;initialFen=game.fen();uciMoves=[];human=$('color').value;orientation=human;selected=null;
    $('error').textContent='';startEngine();
  } catch(e) { $('error').textContent=`Kan inte starta: ${e.message}`; }
};
$('nodes').addEventListener('change',()=>{if(ready&&!thinking)respond();});
$('flip').onclick=()=>{orientation=orientation==='w'?'b':'w';render();};
$('standard').onclick=()=>{$('fen').value=DEFAULT_POSITION;};
$('example').onclick=async()=>{
  try {const response=await fetch('./andersson.fen');if(!response.ok)throw new Error();$('fen').value=(await response.text()).trim();$('error').textContent='';}
  catch {$('error').textContent='Kunde inte läsa andersson.fen.';}
};
startEngine();
