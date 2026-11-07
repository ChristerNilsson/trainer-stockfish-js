import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
const engine=spawn(process.execPath,['node_modules/stockfish/src/stockfish-17.1-single-a496a04.js']);
let buffer='', lines=[];
engine.stdout.on('data',data=>{buffer+=data;const parts=buffer.split('\n');buffer=parts.pop();lines.push(...parts.map(s=>s.trim()));});
engine.stderr.on('data',data=>process.stderr.write(data));
function send(command){engine.stdin.write(command+'\n');}
async function wait(prefix){
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){const i=lines.findIndex(s=>s.startsWith(prefix));if(i>=0)return lines.splice(i,1)[0];await new Promise(r=>setTimeout(r,20));}
  throw new Error('Timeout: '+prefix);
}
try {
  send('uci');await wait('uciok');send('isready');await wait('readyok');
  for(const fen of [new Chess().fen(),(await readFile('andersson.fen','utf8')).trim()]){
    const game=new Chess(fen);
    if(game.turn()==='w')game.move('e4');
    send('ucinewgame');send('position fen '+game.fen());send('go nodes 1000');
    const reply=(await wait('bestmove ')).split(' ')[1];
    assert.ok(game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]}));
    console.log('Lagligt motorsvar:',reply);
  }
  const castle=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert.ok(castle.move('O-O').isKingsideCastle());
  const ep=new Chess();for(const move of ['e4','a6','e5','d5'])ep.move(move);assert.ok(ep.move('exd6').isEnPassant());
  const promo=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.equal(promo.moves({square:'a7',verbose:true}).filter(m=>m.to==='a8').length,4);
  const mate=new Chess();for(const move of ['f3','e5','g4','Qh4#'])mate.move(move);assert.ok(mate.isCheckmate());
  assert.throws(()=>new Chess('ogiltig FEN'));
  console.log('OK: riktig Stockfish-sökning, FEN, rockad, en passant, förvandling, schackmatt och ogiltig FEN.');
} finally {engine.kill();}
