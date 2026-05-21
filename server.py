#!/usr/bin/env python3
"""
Panda'venture × WWF — Serveur tout-en-un
  - Sert les fichiers statiques (port 3001)
  - GET  /api/scores          → classement en direct (JSON)
  - POST /api/score           → soumettre / mettre à jour un score
  - GET  /api/scores/stream   → Server-Sent Events pour live updates
"""

import json, os, time, threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

SCORES_FILE = os.path.join(os.path.dirname(__file__), 'scores.json')
scores_lock = threading.Lock()
sse_clients  = []   # list of (monument_id | 'all', queue-like list)
sse_lock     = threading.Lock()


# ── Scores helpers ────────────────────────────────────────────────────────────

def load_scores():
    if os.path.exists(SCORES_FILE):
        with open(SCORES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}   # { "1": [ {team, members, email, score, ts}, ... ], ... }

def save_scores(data):
    with open(SCORES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def upsert_score(monument_id, team, email, members, score):
    mid = str(monument_id)
    with scores_lock:
        data = load_scores()
        if mid not in data:
            data[mid] = []
        # Mise à jour si l'équipe existe déjà, sinon ajout
        found = False
        for entry in data[mid]:
            if entry['team'].lower() == team.lower():
                entry['score']   = max(entry['score'], score)
                entry['ts']      = int(time.time())
                entry['members'] = members
                found = True
                break
        if not found:
            data[mid].append({
                'team':    team,
                'email':   email,
                'members': members,
                'score':   score,
                'ts':      int(time.time())
            })
        # Tri par score desc
        data[mid].sort(key=lambda x: -x['score'])
        save_scores(data)
        return data[mid]

def broadcast_sse(monument_id, payload):
    msg = f"data: {json.dumps(payload)}\n\n"
    with sse_lock:
        dead = []
        for client in sse_clients:
            cid, queue = client
            if cid == str(monument_id) or cid == 'all':
                try:
                    queue.append(msg)
                except Exception:
                    dead.append(client)
        for d in dead:
            sse_clients.remove(d)


# ── HTTP Handler ──────────────────────────────────────────────────────────────

class PVHandler(SimpleHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # silencieux

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type',  'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')

        # ── GET /api/scores ──────────────────────────────────────────────────
        if path == '/api/scores':
            qs  = parse_qs(parsed.query)
            mid = qs.get('monument', [None])[0]
            with scores_lock:
                data = load_scores()
            if mid:
                self.send_json(200, data.get(str(mid), []))
            else:
                self.send_json(200, data)
            return

        # ── GET /api/scores/stream (SSE) ─────────────────────────────────────
        if path == '/api/scores/stream':
            qs  = parse_qs(parsed.query)
            mid = qs.get('monument', ['all'])[0]
            queue = []
            client = (str(mid), queue)

            with sse_lock:
                sse_clients.append(client)

            self.send_response(200)
            self.send_header('Content-Type',  'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('X-Accel-Buffering', 'no')
            self.end_headers()

            # Envoyer état actuel immédiatement
            with scores_lock:
                data = load_scores()
            init = data.get(str(mid), data) if mid != 'all' else data
            self.wfile.write(f"data: {json.dumps(init)}\n\n".encode())
            self.wfile.flush()

            try:
                while True:
                    if queue:
                        msg = queue.pop(0)
                        self.wfile.write(msg.encode())
                        self.wfile.flush()
                    else:
                        # keepalive
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
                        time.sleep(2)
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with sse_lock:
                    if client in sse_clients:
                        sse_clients.remove(client)
            return

        # ── Fichiers statiques ───────────────────────────────────────────────
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')

        # ── POST /api/score ──────────────────────────────────────────────────
        if path == '/api/score':
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            try:
                payload = json.loads(body)
                mid     = payload['monument']
                team    = payload['team']
                email   = payload.get('email', '')
                members = payload.get('members', '')
                score   = int(payload['score'])
            except Exception as e:
                self.send_json(400, {'error': str(e)})
                return

            ranking = upsert_score(mid, team, email, members, score)
            broadcast_sse(mid, {'monument': mid, 'ranking': ranking})
            self.send_json(200, {'ok': True, 'ranking': ranking})
            return

        self.send_json(404, {'error': 'Not found'})


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port   = 3001
    server = HTTPServer(('', port), PVHandler)
    print(f"Panda'venture server → http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrêté.")
