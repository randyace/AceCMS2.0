import express from 'express';
import cors from 'cors';
import { blogRouter } from './routes/blogs';
import { blogCategoryRouter } from './routes/blogCategories';
import { cmsImageRouter } from './routes/cmsImages';
import { testConnection } from '../db/database';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/blogs', blogRouter);
app.use('/api/blog-categories', blogCategoryRouter);
app.use('/api/cms-images', cmsImageRouter);

app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({ status: dbConnected ? 'healthy' : 'unhealthy', database: dbConnected ? 'connected' : 'disconnected' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  testConnection();
});
