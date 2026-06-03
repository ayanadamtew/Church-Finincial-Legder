// server.js
const path = require('path');

// Set production environment variables
process.env.NODE_ENV = 'production';
const port = process.env.PORT || '3000';

console.log(`Starting server.js on port ${port}`);

try {
  // Next.js standalone mode generates a server.js in .next/standalone/server.js
  console.log('Attempting to load standalone server from .next/standalone/server.js...');
  require('./.next/standalone/server.js');
} catch (error) {
  console.log('Standalone server initialization bypassed or not active. Booting standard Next.js runtime fallback...', error.message);
  
  const { createServer } = require('http');
  const { parse } = require('url');
  const next = require('next');
  
  const app = next({ dev: false, dir: __dirname });
  const handle = app.getRequestHandler();
  
  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, '0.0.0.0', (err) => {
      if (err) {
        console.error('Error starting custom fallback server:', err);
        process.exit(1);
      }
      console.log(`> Live production Next.js backup server listening on http://0.0.0.0:${port}`);
    });
  }).catch((err) => {
    console.error('Next.js server preparation failed:', err);
    process.exit(1);
  });
}
