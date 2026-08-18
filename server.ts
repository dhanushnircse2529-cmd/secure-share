import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.routes';
import fileRoutes from './server/routes/file.routes';
import shareRoutes from './server/routes/share.routes';
import recipientRoutes from './server/routes/recipient.routes';
import logsRoutes from './server/routes/logs.routes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security and parsing middleware
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SecureShare Cryptographic Engine',
      encryption: 'AES-256-GCM',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/shares', shareRoutes);
  app.use('/api/public/share', recipientRoutes);
  app.use('/api', logsRoutes);

  // Vite middleware for development vs Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SecureShare] Server running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start SecureShare server:', err);
  process.exit(1);
});
