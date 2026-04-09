import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { cmsImageService } from '../../services/api/cmsImageService';

export const uploadRouter = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

uploadRouter.post('/image', async (req, res) => {
  try {
    const imageData = req.body.image;
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const extension = getExtensionFromBase64(imageData) || '.jpg';
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}${extension}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    const imageId = await cmsImageService.create({ filename });

    res.json({ data: { id: imageId, filename, url: `/image/${imageId}` } });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

function getExtensionFromBase64(base64: string): string | null {
  const match = base64.match(/^data:image\/(\w+);base64,/);
  if (match) {
    const ext = match[1];
    if (ext === 'jpeg') return '.jpg';
    return `.${ext}`;
  }
  return null;
}