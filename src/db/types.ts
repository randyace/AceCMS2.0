export interface Blog {
  id: number;
  blog_category_id: number | null;
  slug: string;
  title: string;
  author: string;
  youtube_link: string | null;
  content: string;
  post_date: Date;
  is_published: number;
  summary: string;
  is_member_only: number;
  featured: number;
  views: number;
}

export interface BlogLang {
  id: number;
  blogid: number;
  lang: string;
  title: string;
  location: string;
  content: Buffer | null;
  subcontent: Buffer | null;
  meta_keywords: string | null;
  meta_description: string | null;
}

export interface BlogImage {
  id: number;
  blogid: number;
  image_id: number;
  ordering: number;
  is_published: number;
  timestamp: Date;
}

export interface CmsImage {
  id: number;
  filename: string | null;
}

export interface BlogCategory {
  id: number;
  slug: string;
  display_order: number;
  active: number;
  name_en: string | null;
  name_zh: string | null;
  name_cn: string | null;
}

export interface BlogWithLang extends Blog {
  lang_data?: Record<string, {
    title: string;
    content: string;
    subcontent: string;
    meta_keywords: string;
    meta_description: string;
  }>;
  images?: BlogImage[];
  category?: BlogCategory;
}

export interface Document {
  id: number;
  parent_menuid: number;
  footer_group_id: number;
  is_published: number;
  in_header: number;
  in_footer: number;
  slug: string;
  ordering: number;
  footer_ordering: number | null;
}

export interface DocumentLang {
  id: number;
  docid: number;
  lang: string;
  title: string;
  subtitle: string;
  content: string;
  subcontent: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
}

export interface DocumentImage {
  id: number;
  docid: number;
  image_id: number;
  ordering: number;
  is_published: number;
}

export interface DocumentWithLang extends Document {
  lang_data?: Record<string, {
    title: string;
    subtitle: string;
    content: string;
    subcontent: string;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
  }>;
  images?: DocumentImage[];
}
