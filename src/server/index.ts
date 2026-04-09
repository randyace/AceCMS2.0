import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { blogRouter } from './routes/blogs';
import { blogCategoryRouter } from './routes/blogCategories';
import { cmsImageRouter } from './routes/cmsImages';
import { documentRouter } from './routes/documents';
import { uploadRouter } from './routes/upload';
import { testConnection } from '../db/database';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://cms2.acedemos.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/blogs', blogRouter);
app.use('/api/blog-categories', blogCategoryRouter);
app.use('/api/cms-images', cmsImageRouter);
app.use('/api/documents', documentRouter);
app.use('/api/upload', uploadRouter);

app.get('/image/:id', async (req, res) => {
  try {
    const { cmsImageService } = await import('../services/api/cmsImageService');
    const image = await cmsImageService.getById(Number(req.params.id));
    if (!image || !image.filename) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const filepath = path.join(process.cwd(), 'uploads', image.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }
    res.sendFile(filepath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({ status: dbConnected ? 'healthy' : 'unhealthy', database: dbConnected ? 'connected' : 'disconnected' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  testConnection();
});
