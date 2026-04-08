import { query, queryOne, execute } from '../../db/database';
import { BlogCategory } from '../db/types';

export const blogCategoryService = {
  async getAll(): Promise<BlogCategory[]> {
    return query<BlogCategory>('SELECT * FROM blog_categories ORDER BY display_order, id');
  },

  async getActive(): Promise<BlogCategory[]> {
    return query<BlogCategory>('SELECT * FROM blog_categories WHERE active = 1 ORDER BY display_order, id');
  },

  async getById(id: number): Promise<BlogCategory | null> {
    return queryOne<BlogCategory>('SELECT * FROM blog_categories WHERE id = ?', [id]);
  },

  async create(data: {
    slug: string;
    name_en: string;
    name_zh?: string;
    name_cn?: string;
    display_order?: number;
    active?: number;
  }): Promise<number> {
    const result = await execute(
      `INSERT INTO blog_categories (slug, name_en, name_zh, name_cn, display_order, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.slug,
        data.name_en,
        data.name_zh || null,
        data.name_cn || null,
        data.display_order || 10,
        data.active !== undefined ? data.active : 1,
      ]
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<{
    slug: string;
    name_en: string;
    name_zh: string;
    name_cn: string;
    display_order: number;
    active: number;
  }>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return false;

    values.push(id);
    await execute(`UPDATE blog_categories SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await execute('DELETE FROM blog_categories WHERE id = ?', [id]);
    return true;
  },
};
