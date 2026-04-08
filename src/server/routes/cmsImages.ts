import { Router } from 'express';
import { cmsImageService } from '../../services/api/cmsImageService';

export const cmsImageRouter = Router();

cmsImageRouter.get('/', async (req, res) => {
  try {
    const images = await cmsImageService.getAll();
    res.json({ data: images, total: images.length });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

cmsImageRouter.get('/:id', async (req, res) => {
  try {
    const image = await cmsImageService.getById(Number(req.params.id));
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json({ data: image });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

cmsImageRouter.post('/', async (req, res) => {
  try {
    const id = await cmsImageService.create(req.body);
    const image = await cmsImageService.getById(id);
    res.status(201).json({ data: image });
  } catch (error) {
    console.error('Error creating image:', error);
    res.status(500).json({ error: 'Failed to create image' });
  }
});

cmsImageRouter.delete('/:id', async (req, res) => {
  try {
    await cmsImageService.delete(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});
