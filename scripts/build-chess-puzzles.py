#!/usr/bin/env python3
# Appends tactics-puzzle units to content/courses/chess.json from the Lichess
# puzzle database (CC0, https://database.lichess.org/#puzzles).
#
# Only one-move puzzles: Lichess stores the position BEFORE the opponent's
# move, so Moves[0] is applied here and Moves[1] is the answer. Each puzzle is
# a `chess` exercise: a FEN to draw, and four moves in SAN to pick from.
# Distractors are legal moves (checks and captures first, so they look
# plausible) and never also mate, since Lichess accepts any mate in one.
#
# line=True puzzles also carry `steps`: after the first move the board answers
# with the opponent's reply and asks for the next move, so the learner plays the
# whole combination. Each step is {reply, fen, answer, choices}, built from the
# line in `explain`, so shipped exercises gain steps without new ids.
#
# The 307MB database is streamed and never written to disk; reading stops as
# soon as every theme bucket is full.
#
#   uv run --with chess scripts/build-chess-puzzles.py          build
#   uv run --with chess scripts/build-chess-puzzles.py --check  replay what is in chess.json
import csv, io, json, random, subprocess, sys
from pathlib import Path
import chess

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'content' / 'courses' / 'chess.json'
URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
PREFIX = 'lp'          # unit ids, so a re-run replaces only these
PER_LESSON, LESSONS = 5, 3
PER_UNIT = PER_LESSON * LESSONS

# theme -> (unit title, tip, line). In teaching order. line=False units take
# one-move puzzles only. Forks, skewers and the like almost never finish in one
# move, so line=True units ask for the FIRST move of the combination (Lichess
# puzzles are only-move at every step) and the explanation plays out the rest.
UNITS = [
    ('mateIn1', 'Mate in One', 'Look at every check first. Mate is a check the king cannot escape, block or capture.', False),
    ('hangingPiece', 'Free Pieces', 'Before anything clever, ask what is undefended. A piece nobody protects can just be taken.', False),
    ('backRankMate', 'Back Rank Mates', 'A king boxed in by its own pawns dies to a rook or queen on the last rank.', False),
    ('pin', 'Pins', 'A piece that cannot move without exposing something bigger behind it is pinned. Attack it again.', False),
    ('discoveredAttack', 'Discovered Attacks', 'Move one piece out of the way and the one behind it attacks. Two threats from one move.', False),
    ('promotion', 'Promotion', 'A pawn on the last rank becomes a queen. Sometimes a knight is better, so check both.', False),
    ('fork', 'Forks', 'One piece attacking two at once. Knights are the classic forkers because nothing blocks them.', True),
    ('skewer', 'Skewers', 'A pin in reverse: attack the big piece, and when it moves, take the one behind it.', True),
    ('mateIn2', 'Mate in Two', 'Find the move that leaves every reply losing. Checks first, then quiet moves that take squares away.', True),
    ('deflection', 'Deflection', 'Pull a defender away from the square it has to guard.', True),
    ('attraction', 'Attraction', 'Lure a piece onto a bad square, often with a sacrifice, then hit it there.', True),
    ('capturingDefender', 'Remove the Defender', 'If one piece guards everything, take that piece first and the rest falls.', True),
    ('trappedPiece', 'Trapped Pieces', 'A piece with no safe square is lost. Take away its last escape and win it.', True),
]
LINE = {t: line for t, _, _, line in UNITS}
RATING = (600, 1900)
GLYPH = {'P': 'pawn', 'N': 'knight', 'B': 'bishop', 'R': 'rook', 'Q': 'queen', 'K': 'king'}


def exercise(row, theme, rnd):
    fen, moves = row['FEN'], row['Moves'].split()
    if (len(moves) != 2) if not LINE[theme] else (len(moves) < 4 or len(moves) > 8):
        return None
    board = chess.Board(fen)
    board.push_uci(moves[0])
    best = chess.Move.from_uci(moves[1])
    if best not in board.legal_moves:
        return None
    answer = board.san(best)
    mates = lambda m: (board.push(m), board.is_checkmate(), board.pop())[1]
    if theme == 'mateIn1' and not mates(best):
        return None
    others = [m for m in board.legal_moves if m != best and not mates(m)]
    if len(others) < 3:
        return None
    loud = [m for m in others if board.is_capture(m) or board.gives_check(m)]
    quiet = [m for m in others if m not in loud]
    rnd.shuffle(loud); rnd.shuffle(quiet)
    picks = [board.san(m) for m in (loud + quiet)[:3]]
    side = 'White' if board.turn else 'Black'
    piece = GLYPH[board.piece_at(best.from_square).symbol().upper()]
    start = board.fen()
    if LINE[theme]:
        # Play the line out in SAN for the explanation, then put the board back.
        line, b = [], board.copy()
        for uci in moves[1:]:
            m = chess.Move.from_uci(uci)
            if m not in b.legal_moves:
                return None
            line.append(b.san(m)); b.push(m)
        why = f'{answer} starts it: {" ".join(line)}.'
    else:
        why = f'{answer}: the {piece} move wins here.'
    return {
        'type': 'chess',
        'question': f'{side} to move. Find the best move.' if not LINE[theme] else f'{side} to move. Find the move that starts the combination.',
        'fen': start,
        'answer': answer,
        'choices': [answer] + picks,
        'explain': f'{why} Lichess puzzle {row["PuzzleId"]}, rated {row["Rating"]}.',
        '_rating': int(row['Rating']),
    }


def distractors(board, best, rnd):
    mates = lambda m: (board.push(m), board.is_checkmate(), board.pop())[1]
    others = [m for m in board.legal_moves if m != best and not mates(m)]
    loud = [m for m in others if board.is_capture(m) or board.gives_check(m)]
    quiet = [m for m in others if m not in loud]
    rnd.shuffle(loud); rnd.shuffle(quiet)
    return [board.san(m) for m in (loud + quiet)[:3]]


def steps_for(ex, rnd):
    # The line is stored in SAN in the explanation: "Ne7+ starts it: Ne7+ Kf7 Nxf5."
    if ' starts it: ' not in ex['explain']:
        return []
    line = ex['explain'].split(' starts it: ', 1)[1].split('.', 1)[0].split()
    b = chess.Board(ex['fen'])
    b.push_san(line[0])
    steps = []
    for i in range(1, len(line) - 1, 2):
        reply = line[i]
        b.push_san(reply)
        best = b.parse_san(line[i + 1])
        picks = distractors(b, best, rnd)
        if len(picks) < 3:
            break      # ponytail: a forced step with no real choice ends the exercise early
        answer = b.san(best)
        choices = picks[:]
        choices.insert(rnd.randrange(4), answer)
        steps.append({'reply': reply, 'fen': b.fen(), 'answer': answer, 'choices': choices})
        b.push(best)
    return steps


def add_steps(pack):
    rnd = random.Random(11)
    n = 0
    for u in pack['units']:
        if not str(u['id']).startswith(PREFIX):
            continue
        for l in u['lessons']:
            for ex in l['exercises']:
                if 'steps' not in ex and (st := steps_for(ex, rnd)):
                    ex['steps'] = st; n += 1
    return n


def build():
    rnd = random.Random(7)
    pack = json.loads(PACK.read_text())
    if (n := add_steps(pack)):
        pack['version'] = pack.get('version', 1) + 1
        PACK.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + '\n')
        print(f'added steps to {n} line puzzles', file=sys.stderr)
    # Units already shipped stay exactly as they are (saved progress points at
    # their exercise ids); only themes without a unit yet get built.
    have = {u['title'] for u in pack['units'] if str(u['id']).startswith(PREFIX)}
    want = {t for t, title, _, _ in UNITS if title not in have}
    if not want:
        print('every theme already has a unit', file=sys.stderr); return
    buckets = {t: [] for t in want}
    target = PER_UNIT * 4          # a wider pool, then keep an even spread of ratings
    proc = subprocess.Popen(f'curl -sL {URL} | zstd -dc', shell=True, stdout=subprocess.PIPE)
    for row in csv.DictReader(io.TextIOWrapper(proc.stdout, encoding='utf-8')):
        if not (RATING[0] <= int(row['Rating']) <= RATING[1]) or int(row['Popularity']) < 50:
            continue
        themes = row['Themes'].split()
        # Rarest bucket first, so a puzzle tagged mateIn1 and fork feeds forks.
        for theme in sorted((t for t in themes if t in want and len(buckets[t]) < target), key=lambda t: len(buckets[t])):
            ex = exercise(row, theme, rnd)
            if ex:
                buckets[theme].append(ex); break
        if all(len(b) >= target for b in buckets.values()):
            break
    proc.kill()

    n = max([int(str(u['id'])[len(PREFIX):]) for u in pack['units'] if str(u['id']).startswith(PREFIX)] or [0])
    slot = 0
    for theme, title, tip, _ in UNITS:
        if theme not in want:
            continue
        pool = sorted(buckets[theme], key=lambda e: e['_rating'])
        if len(pool) < PER_UNIT:
            print(f'skip {theme}: only {len(pool)} puzzles', file=sys.stderr); continue
        n += 1
        step = len(pool) / PER_UNIT
        chosen = [pool[int(i * step)] for i in range(PER_UNIT)]   # easiest to hardest, evenly across the pool
        lessons = []
        for l in range(LESSONS):
            exs = []
            for i, ex in enumerate(chosen[l * PER_LESSON:(l + 1) * PER_LESSON]):
                ex = {k: v for k, v in ex.items() if k != '_rating'}
                # Answer slot rotates 0..3 so it never sits in one position.
                c = [x for x in ex['choices'] if x != ex['answer']]
                c.insert(slot % 4, ex['answer']); slot += 1
                ex['choices'] = c
                ex['id'] = f'chess_{PREFIX}{n}l{l + 1}_{i}'
                exs.append(ex)
            lessons.append({'id': f'{PREFIX}{n}l{l + 1}', 'title': f'Puzzles {l + 1}', 'exercises': exs})
        pack['units'].append({'id': f'{PREFIX}{n}', 'title': title, 'tip': tip, 'lessons': lessons})
        print(f'{title}: {PER_UNIT} puzzles, rated {chosen[0]["_rating"]}-{chosen[-1]["_rating"]}', file=sys.stderr)
    add_steps(pack)
    pack['version'] = pack.get('version', 1) + 1
    PACK.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + '\n')


def check():
    pack = json.loads(PACK.read_text())
    n = 0
    for u in pack['units']:
        if not str(u['id']).startswith(PREFIX):
            continue
        for l in u['lessons']:
            for ex in l['exercises']:
                b = chess.Board(ex['fen'])
                legal = {b.san(m): m for m in b.legal_moves}
                assert ex['answer'] in ex['choices'] and len(set(ex['choices'])) == 4, ex['id']
                assert all(c in legal for c in ex['choices']), f"{ex['id']}: illegal choice"
                for c in ex['choices']:
                    b.push(legal[c]); mate = b.is_checkmate(); b.pop()
                    assert not (mate and c != ex['answer']), f"{ex['id']}: distractor {c} also mates"
                    if u['title'] == 'Mate in One' and c == ex['answer']:
                        assert mate, f"{ex['id']}: answer does not mate"
                b2 = b.copy(); b2.push_san(ex['answer'])
                for st in ex.get('steps', []):
                    b2.push_san(st['reply'])
                    assert b2.fen() == st['fen'], f"{ex['id']}: step fen drift"
                    legal2 = {b2.san(m): m for m in b2.legal_moves}
                    assert st['answer'] in st['choices'] and len(set(st['choices'])) == 4, ex['id']
                    assert all(c in legal2 for c in st['choices']), f"{ex['id']}: illegal step choice"
                    for c in st['choices']:
                        b2.push(legal2[c]); mate = b2.is_checkmate(); b2.pop()
                        assert not (mate and c != st['answer']), f"{ex['id']}: step distractor {c} also mates"
                    b2.push(legal2[st['answer']])
                n += 1
    assert n, 'no puzzle exercises found'
    print(f'chess puzzles ok: {n} replayed')


if __name__ == '__main__':
    check() if '--check' in sys.argv else build()
