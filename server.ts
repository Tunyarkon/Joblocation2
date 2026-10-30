import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Health check endpoints for Cloud Run / GCP load balancers
app.get(['/healthz', '/health', '/api/health', '/ping'], (_req, res) => {
  res.status(200).send('OK');
});

const distPath = path.resolve(__dirname, 'dist');
const indexPath = path.resolve(distPath, 'index.html');

// Ensure dist/ directory exists in production
if (!fs.existsSync(distPath) || !fs.existsSync(indexPath)) {
  console.log('[Server] dist directory or index.html not found. Building applet...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('[Server] Build completed successfully.');
  } catch (err) {
    console.error('[Server] Automatic build attempt failed:', err);
  }
}

// Serve static assets from dist under root and /cranesystem
if (fs.existsSync(distPath)) {
  app.use('/cranesystem', express.static(distPath, {
    maxAge: '1d',
    index: false
  }));
  app.use(express.static(distPath, {
    maxAge: '1d',
    index: false
  }));
}

// Catch-all route to serve SPA index.html for root, /cranesystem, and fallback
app.get(['/', '/cranesystem', '/cranesystem/*', '*'], (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Failsafe response so container health checks do not crash
    res.status(200).send(`<!DOCTYPE html>
<html>
  <head>
    <title>Crane Management System</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 2rem; text-align: center; background: #0f172a; color: #f8fafc;">
    <h2>Crane Management System</h2>
    <p>Application is initializing...</p>
    <script>setTimeout(() => window.location.reload(), 2000);</script>
  </body>
</html>`);
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[Server] Crane Management System running at http://${HOST}:${PORT}`);
});

// Graceful shutdown handling for Cloud Run container lifecycle
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly');
    process.exit(0);
  });
});
