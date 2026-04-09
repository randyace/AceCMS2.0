import { Router } from 'express';
import { documentService } from '../../services/api/documentService';

export const documentRouter = Router();

documentRouter.get('/', async (req, res) => {
  try {
    const documents = await documentService.getAllWithLang();
    res.json({ data: documents, total: documents.length });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

documentRouter.get('/:id', async (req, res) => {
  try {
    const document = await documentService.getByIdWithLang(Number(req.params.id));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ data: document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

documentRouter.post('/', async (req, res) => {
  try {
    const id = await documentService.create(req.body);
    const document = await documentService.getByIdWithLang(id);
    res.status(201).json({ data: document });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

documentRouter.put('/:id', async (req, res) => {
  try {
    await documentService.update(Number(req.params.id), req.body);
    const document = await documentService.getByIdWithLang(Number(req.params.id));
    res.json({ data: document });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

documentRouter.delete('/:id', async (req, res) => {
  try {
    await documentService.delete(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

documentRouter.post('/:id/images', async (req, res) => {
  try {
    const { imageId, ordering } = req.body;
    const id = await documentService.addImage(Number(req.params.id), imageId, ordering || 0);
    res.status(201).json({ data: { id } });
  } catch (error) {
    console.error('Error adding image:', error);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

documentRouter.delete('/images/:imageId', async (req, res) => {
  try {
    await documentService.removeImage(Number(req.params.imageId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Failed to remove image' });
  }
});

documentRouter.put('/images/:imageId/order', async (req, res) => {
  try {
    const { ordering } = req.body;
    await documentService.updateImageOrder(Number(req.params.imageId), ordering);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating image order:', error);
    res.status(500).json({ error: 'Failed to update image order' });
  }
});