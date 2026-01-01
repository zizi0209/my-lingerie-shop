import { api } from './api';

export interface PostCategory {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  thumbnail: string | null;
  authorId: number;
  categoryId: number;
  isPublished: boolean;
  publishedAt: Date | null;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
  };
  category: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface PostListParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  isPublished?: boolean;
  search?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreatePostData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  authorId: number;
  categoryId: number;
  isPublished?: boolean;
  publishedAt?: string;
}

export interface UpdatePostData {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  thumbnail?: string;
  categoryId?: number;
  isPublished?: boolean;
  publishedAt?: string;
}

export const postApi = {
  async list(params: PostListParams = {}): Promise<PaginatedResponse<Post>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, value.toString());
      }
    });

    return api.get<PaginatedResponse<Post>>(`/posts?${queryParams.toString()}`);
  },

  async getById(id: number): Promise<{ success: boolean; data: Post }> {
    return api.get(`/posts/${id}`);
  },

  async getBySlug(slug: string): Promise<{ success: boolean; data: Post }> {
    return api.get(`/posts/slug/${slug}`);
  },

  async create(data: CreatePostData): Promise<{ success: boolean; data: Post }> {
    return api.post('/posts', data);
  },

  async update(id: number, data: UpdatePostData): Promise<{ success: boolean; data: Post }> {
    return api.put(`/posts/${id}`, data);
  },

  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/posts/${id}`);
  },
};

// Post Categories API
export const postCategoryApi = {
  async list(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<PostCategory>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    return api.get<PaginatedResponse<PostCategory>>(`/post-categories?${queryParams.toString()}`);
  },

  async create(data: { name: string; slug: string }): Promise<{ success: boolean; data: PostCategory }> {
    return api.post('/post-categories', data);
  },

  async update(id: number, data: { name?: string; slug?: string }): Promise<{ success: boolean; data: PostCategory }> {
    return api.put(`/post-categories/${id}`, data);
  },

  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/post-categories/${id}`);
  },
};
