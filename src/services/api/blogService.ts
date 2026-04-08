import { query, queryOne, execute } from '../../db/database';
import { Blog, BlogLang, BlogImage, BlogWithLang } from '../db/types';

export const blogService = {
  async getAll(): Promise<Blog[]> {
    return query<Blog>('SELECT * FROM blogs ORDER BY post_date DESC');
  },

  async getAllWithLang(): Promise<BlogWithLang[]> {
    const blogs = await this.getAll();
    const result: BlogWithLang[] = [];

    for (const blog of blogs) {
      const langData = await this.getLangByBlogId(blog.id);
      const images = await this.getImagesByBlogId(blog.id);
      
      const langDict: Record<string, any> = {};
      langData.forEach((lang: BlogLang) => {
        langDict[lang.lang] = {
          title: lang.title,
          content: lang.content ? lang.content.toString() : '',
          subcontent: lang.subcontent ? lang.subcontent.toString() : '',
          meta_keywords: lang.meta_keywords || '',
          meta_description: lang.meta_description || '',
        };
      });

      result.push({
        ...blog,
        lang_data: langDict,
        images,
      });
    }

    return result;
  },

  async getById(id: number): Promise<Blog | null> {
    return queryOne<Blog>('SELECT * FROM blogs WHERE id = ?', [id]);
  },

  async getByIdWithLang(id: number): Promise<BlogWithLang | null> {
    const blog = await this.getById(id);
    if (!blog) return null;

    const langData = await this.getLangByBlogId(id);
    const images = await this.getImagesByBlogId(id);

    const langDict: Record<string, any> = {};
    langData.forEach((lang: BlogLang) => {
      langDict[lang.lang] = {
        title: lang.title,
        content: lang.content ? lang.content.toString() : '',
        subcontent: lang.subcontent ? lang.subcontent.toString() : '',
        meta_keywords: lang.meta_keywords || '',
        meta_description: lang.meta_description || '',
      };
    });

    return {
      ...blog,
      lang_data: langDict,
      images,
    };
  },

  async getLangByBlogId(blogId: number): Promise<BlogLang[]> {
    return query<BlogLang>('SELECT * FROM blog_lang WHERE blogid = ?', [blogId]);
  },

  async getImagesByBlogId(blogId: number): Promise<BlogImage[]> {
    return query<BlogImage>('SELECT * FROM blog_images WHERE blogid = ? ORDER BY ordering', [blogId]);
  },

  async create(data: {
    slug: string;
    title: string;
    author: string;
    content: string;
    summary?: string;
    youtube_link?: string;
    blog_category_id?: number;
    is_published?: number;
    is_member_only?: number;
    featured?: number;
    post_date?: Date;
    lang_data?: Record<string, {
      title: string;
      content: string;
      subcontent?: string;
      meta_keywords?: string;
      meta_description?: string;
    }>;
  }): Promise<number> {
    const result = await execute(
      `INSERT INTO blogs (slug, title, author, content, summary, youtube_link, blog_category_id, is_published, is_member_only, featured, post_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.slug,
        data.title,
        data.author,
        data.content,
        data.summary || '',
        data.youtube_link || null,
        data.blog_category_id || null,
        data.is_published || 0,
        data.is_member_only || 0,
        data.featured || 0,
        data.post_date || new Date(),
      ]
    );

    const blogId = result.insertId;

    if (data.lang_data) {
      for (const [lang, langValue] of Object.entries(data.lang_data)) {
        await this.createLang({
          blogid: blogId,
          lang,
          title: langValue.title,
          content: langValue.content,
          subcontent: langValue.subcontent || '',
          meta_keywords: langValue.meta_keywords || '',
          meta_description: langValue.meta_description || '',
        });
      }
    }

    return blogId;
  },

  async createLang(data: {
    blogid: number;
    lang: string;
    title: string;
    location?: string;
    content: string;
    subcontent?: string;
    meta_keywords?: string;
    meta_description?: string;
  }): Promise<number> {
    const result = await execute(
      `INSERT INTO blog_lang (blogid, lang, title, location, content, subcontent, meta_keywords, meta_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.blogid,
        data.lang,
        data.title,
        data.location || '',
        data.content,
        data.subcontent || null,
        data.meta_keywords || null,
        data.meta_description || null,
      ]
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<{
    slug: string;
    title: string;
    author: string;
    content: string;
    summary: string;
    youtube_link: string;
    blog_category_id: number;
    is_published: number;
    is_member_only: number;
    featured: number;
    post_date: Date;
  }>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return false;

    values.push(id);
    await execute(`UPDATE blogs SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async updateLang(blogId: number, lang: string, data: Partial<{
    title: string;
    location: string;
    content: string;
    subcontent: string;
    meta_keywords: string;
    meta_description: string;
  }>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return false;

    values.push(blogId, lang);
    await execute(
      `UPDATE blog_lang SET ${fields.join(', ')} WHERE blogid = ? AND lang = ?`,
      values
    );
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await execute('DELETE FROM blog_lang WHERE blogid = ?', [id]);
    await execute('DELETE FROM blog_images WHERE blogid = ?', [id]);
    await execute('DELETE FROM blogs WHERE id = ?', [id]);
    return true;
  },

  async addImage(blogId: number, imageId: number, ordering: number = 0): Promise<number> {
    const result = await execute(
      'INSERT INTO blog_images (blogid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)',
      [blogId, imageId, ordering]
    );
    return result.insertId;
  },

  async removeImage(id: number): Promise<boolean> {
    await execute('DELETE FROM blog_images WHERE id = ?', [id]);
    return true;
  },

  async updateImageOrder(id: number, ordering: number): Promise<boolean> {
    await execute('UPDATE blog_images SET ordering = ? WHERE id = ?', [ordering, id]);
    return true;
  },
};
