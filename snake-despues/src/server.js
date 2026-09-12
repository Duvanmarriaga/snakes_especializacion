const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { handleConnection } = require('./ws/connectionHandler');

const PORT = process.env.PORT || 3002;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

const server = http.createServer((req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.url === '/' ? '/index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const contentType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
wss.on('connection', handleConnection);

server.listen(PORT, () => {
  console.log(`snake-despues escuchando en puerto ${PORT}`);
});
