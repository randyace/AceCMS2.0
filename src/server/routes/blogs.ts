import { Router } from 'express';
import { blogService } from '../../services/api/blogService';

export const blogRouter = Router();

blogRouter.get('/', async (req, res) => {
  try {
    const blogs = await blogService.getAllWithLang();
    res.json({ data: blogs, total: blogs.length });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

blogRouter.get('/:id', async (req, res) => {
  try {
    const blog = await blogService.getByIdWithLang(Number(req.params.id));
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json({ data: blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

blogRouter.post('/', async (req, res) => {
  try {
    const id = await blogService.create(req.body);
    const blog = await blogService.getByIdWithLang(id);
    res.status(201).json({ data: blog });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

blogRouter.put('/:id', async (req, res) => {
  try {
    await blogService.update(Number(req.params.id), req.body);
    const blog = await blogService.getByIdWithLang(Number(req.params.id));
    res.json({ data: blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

blogRouter.delete('/:id', async (req, res) => {
  try {
    await blogService.delete(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

blogRouter.post('/:id/images', async (req, res) => {
  try {
    const { imageId, ordering } = req.body;
    const id = await blogService.addImage(Number(req.params.id), imageId, ordering || 0);
    res.status(201).json({ data: { id } });
  } catch (error) {
    console.error('Error adding image:', error);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

blogRouter.delete('/images/:imageId', async (req, res) => {
  try {
    await blogService.removeImage(Number(req.params.imageId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Failed to remove image' });
  }
});

blogRouter.put('/images/:imageId/order', async (req, res) => {
  try {
    const { ordering } = req.body;
    await blogService.updateImageOrder(Number(req.params.imageId), ordering);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating image order:', error);
    res.status(500).json({ error: 'Failed to update image order' });
  }
});
