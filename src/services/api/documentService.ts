import { query, queryOne, execute } from '../../db/database';
import { Document, DocumentLang, DocumentImage, DocumentWithLang } from '../db/types';

export const documentService = {
  async getAll(): Promise<Document[]> {
    return query<Document>('SELECT * FROM documents ORDER BY ordering ASC');
  },

  async getAllWithLang(): Promise<DocumentWithLang[]> {
    const documents = await this.getAll();
    const result: DocumentWithLang[] = [];

    for (const doc of documents) {
      const langData = await this.getLangByDocId(doc.id);
      const images = await this.getImagesByDocId(doc.id);

      const langDict: Record<string, any> = {};
      langData.forEach((lang: DocumentLang) => {
        langDict[lang.lang] = {
          title: lang.title,
          subtitle: lang.subtitle,
          content: lang.content ? lang.content.toString() : '',
          subcontent: lang.subcontent ? lang.subcontent.toString() : '',
          meta_title: lang.meta_title || '',
          meta_description: lang.meta_description || '',
          meta_keywords: lang.meta_keywords || '',
        };
      });

      result.push({
        ...doc,
        lang_data: langDict,
        images,
      });
    }

    return result;
  },

  async getById(id: number): Promise<Document | null> {
    return queryOne<Document>('SELECT * FROM documents WHERE id = ?', [id]);
  },

  async getByIdWithLang(id: number): Promise<DocumentWithLang | null> {
    const doc = await this.getById(id);
    if (!doc) return null;

    const langData = await this.getLangByDocId(id);
    const images = await this.getImagesByDocId(id);

    const langDict: Record<string, any> = {};
    langData.forEach((lang: DocumentLang) => {
      langDict[lang.lang] = {
        title: lang.title,
        subtitle: lang.subtitle,
        content: lang.content ? lang.content.toString() : '',
        subcontent: lang.subcontent ? lang.subcontent.toString() : '',
        meta_title: lang.meta_title || '',
        meta_description: lang.meta_description || '',
        meta_keywords: lang.meta_keywords || '',
      };
    });

    return {
      ...doc,
      lang_data: langDict,
      images,
    };
  },

  async getLangByDocId(docId: number): Promise<DocumentLang[]> {
    return query<DocumentLang>('SELECT * FROM documents_lang WHERE docid = ?', [docId]);
  },

  async getImagesByDocId(docId: number): Promise<DocumentImage[]> {
    return query<DocumentImage>('SELECT * FROM documents_images WHERE docid = ? ORDER BY ordering', [docId]);
  },

  async create(data: {
    slug: string;
    parent_menuid?: number;
    footer_group_id?: number;
    is_published?: number;
    in_header?: number;
    in_footer?: number;
    ordering?: number;
    footer_ordering?: number;
    lang_data?: Record<string, {
      title: string;
      subtitle: string;
      content: string;
      subcontent?: string;
      meta_title?: string;
      meta_description?: string;
      meta_keywords?: string;
    }>;
  }): Promise<number> {
    const result = await execute(
      `INSERT INTO documents (parent_menuid, footer_group_id, is_published, in_header, in_footer, slug, ordering, footer_ordering)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.parent_menuid || 0,
        data.footer_group_id || 0,
        data.is_published || 0,
        data.in_header || 0,
        data.in_footer || 0,
        data.slug,
        data.ordering || 1,
        data.footer_ordering || 10,
      ]
    );

    const docId = result.insertId;

    if (data.lang_data) {
      for (const [lang, langValue] of Object.entries(data.lang_data)) {
        await this.createLang({
          docid: docId,
          lang,
          title: langValue.title,
          subtitle: langValue.subtitle,
          content: langValue.content,
          subcontent: langValue.subcontent || '',
          meta_title: langValue.meta_title || '',
          meta_description: langValue.meta_description || '',
          meta_keywords: langValue.meta_keywords || '',
        });
      }
    }

    return docId;
  },

  async createLang(data: {
    docid: number;
    lang: string;
    title: string;
    subtitle: string;
    content: string;
    subcontent?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
  }): Promise<number> {
    const result = await execute(
      `INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.docid,
        data.lang,
        data.title,
        data.subtitle,
        data.content,
        data.subcontent || null,
        data.meta_title || null,
        data.meta_description || null,
        data.meta_keywords || null,
      ]
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<{
    parent_menuid: number;
    footer_group_id: number;
    is_published: number;
    in_header: number;
    in_footer: number;
    slug: string;
    ordering: number;
    footer_ordering: number;
  }>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return false;

    values.push(id);
    await execute(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async updateLang(docId: number, lang: string, data: Partial<{
    title: string;
    subtitle: string;
    content: string;
    subcontent: string;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
  }>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return false;

    values.push(docId, lang);
    await execute(
      `UPDATE documents_lang SET ${fields.join(', ')} WHERE docid = ? AND lang = ?`,
      values
    );
    return true;
  },

  async delete(id: number): Promise<boolean> {
    await execute('DELETE FROM documents_lang WHERE docid = ?', [id]);
    await execute('DELETE FROM documents_images WHERE docid = ?', [id]);
    await execute('DELETE FROM documents WHERE id = ?', [id]);
    return true;
  },

  async addImage(docId: number, imageId: number, ordering: number = 0): Promise<number> {
    const result = await execute(
      'INSERT INTO documents_images (docid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)',
      [docId, imageId, ordering]
    );
    return result.insertId;
  },

  async removeImage(id: number): Promise<boolean> {
    await execute('DELETE FROM documents_images WHERE id = ?', [id]);
    return true;
  },

  async updateImageOrder(id: number, ordering: number): Promise<boolean> {
    await execute('UPDATE documents_images SET ordering = ? WHERE id = ?', [ordering, id]);
    return true;
  },
};