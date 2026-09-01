#!/usr/bin/env python3
"""Local server that behaves like Vercel: cleanUrls + trailingSlash false.

Python's plain http.server 404s every extensionless path, so a local preview
reports the whole nav as broken when production serves it fine. Mirror
vercel.json instead of guessing.
"""
import http.server, os, socket, sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class Server(http.server.ThreadingHTTPServer):
    # One keep-alive browser connection wedged every other request on the
    # single-threaded HTTPServer. Daemon threads so Ctrl-C still exits.
    daemon_threads = True
    address_family = socket.AF_INET6      # dual-stack: also serves 127.0.0.1


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def translate_path(self, path):
        p = super().translate_path(path)
        if os.path.isdir(p):
            idx = os.path.join(p, 'index.html')
            if os.path.exists(idx):
                return idx
        if not os.path.exists(p) and not os.path.splitext(p)[1]:
            html = p + '.html'          # cleanUrls: /pricing -> pricing.html
            if os.path.exists(html):
                return html
        return p

    def send_error(self, code, message=None, explain=None):
        # Vercel serves /404.html for any unmatched route. Python's default is
        # a bare "Error response" page, so a local preview cannot show the 404
        # the visitor actually gets.
        page = os.path.join(ROOT, '404.html')
        if code == 404 and os.path.exists(page):
            body = open(page, 'rb').read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def end_headers(self):
        # No caching, ever. Without this the browser serves a stale site.css
        # from memory cache after an edit and the preview shows the previous
        # design — which reads as "the change didn't work" and costs an hour.
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
Server(('', port), Handler).serve_forever()
