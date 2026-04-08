import { query, queryOne, execute } from '../../db/database';
import { CmsImage } from '../db/types';

export const cmsImageService = {
  async getAll(): Promise<CmsImage[]> {
    return query<CmsImage>('SELECT * FROM cms_images ORDER BY id DESC');
  },

  async getById(id: number): Promise<CmsImage | null> {
    return queryOne<CmsImage>('SELECT * FROM cms_images WHERE id = ?', [id]);
  },

  async findByFilename(filename: string): Promise<CmsImage | null> {
    return queryOne<CmsImage>('SELECT * FROM cms_images WHERE filename = ?', [filename]);
  },

  async create(data: { filename: string }): Promise<number> {
    const result = await execute(
      'INSERT INTO cms_images (filename) VALUES (?)',
      [data.filename]
    );
    return result.insertId;
  },

  async delete(id: number): Promise<boolean> {
    await execute('DELETE FROM cms_images WHERE id = ?', [id]);
    return true;
  },
};
