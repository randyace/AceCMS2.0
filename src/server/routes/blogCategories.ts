import { Router } from 'express';
import { blogCategoryService } from '../../services/api/blogCategoryService';

export const blogCategoryRouter = Router();

blogCategoryRouter.get('/', async (req, res) => {
  try {
    const categories = await blogCategoryService.getAll();
    res.json({ data: categories, total: categories.length });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

blogCategoryRouter.get('/active', async (req, res) => {
  try {
    const categories = await blogCategoryService.getActive();
    res.json({ data: categories, total: categories.length });
  } catch (error) {
    console.error('Error fetching active categories:', error);
    res.status(500).json({ error: 'Failed to fetch active categories' });
  }
});

blogCategoryRouter.get('/:id', async (req, res) => {
  try {
    const category = await blogCategoryService.getById(Number(req.params.id));
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

blogCategoryRouter.post('/', async (req, res) => {
  try {
    const id = await blogCategoryService.create(req.body);
    const category = await blogCategoryService.getById(id);
    res.status(201).json({ data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

blogCategoryRouter.put('/:id', async (req, res) => {
  try {
    await blogCategoryService.update(Number(req.params.id), req.body);
    const category = await blogCategoryService.getById(Number(req.params.id));
    res.json({ data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

blogCategoryRouter.delete('/:id', async (req, res) => {
  try {
    await blogCategoryService.delete(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
