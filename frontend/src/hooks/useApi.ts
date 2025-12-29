import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface UseApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// Hook chung cho API calls
export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      apiCall: () => Promise<T>,
      options?: UseApiOptions
    ): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await apiCall();
        setState({ data: result, loading: false, error: null });
        
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ data: null, loading: false, error: err });
        
        if (options?.onError) {
          options.onError(err);
        }
        
        return null;
      }
    },
    []
  );

  return {
    ...state,
    execute,
  };
}

// Hook cho authentication
export function useAuth() {
  const { execute, ...state } = useApi<{ token: string; user: unknown }>();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await execute(() =>
        api.post<{ token: string; user: unknown }>('/users/login', {
          email,
          password,
        }, false)
      );

      if (result?.token) {
        api.setToken(result.token);
      }

      return result;
    },
    [execute]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await execute(() =>
        api.post<{ token: string; user: unknown }>('/users/register', {
          email,
          password,
          name,
        }, false)
      );

      if (result?.token) {
        api.setToken(result.token);
      }

      return result;
    },
    [execute]
  );

  const logout = useCallback(() => {
    api.removeToken();
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    isAuthenticated: api.isAuthenticated(),
  };
}

// Hook cho categories
export function useCategories() {
  const { execute, ...state } = useApi<unknown>();

  const getCategories = useCallback(
    () => execute(() => api.get('/categories')),
    [execute]
  );

  const getCategoryById = useCallback(
    (id: number) => execute(() => api.get(`/categories/${id}`)),
    [execute]
  );

  const createCategory = useCallback(
    (data: unknown) => execute(() => api.post('/categories', data)),
    [execute]
  );

  const updateCategory = useCallback(
    (id: number, data: unknown) => execute(() => api.put(`/categories/${id}`, data)),
    [execute]
  );

  const deleteCategory = useCallback(
    (id: number) => execute(() => api.delete(`/categories/${id}`)),
    [execute]
  );

  return {
    ...state,
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

// Hook cho products
export function useProducts() {
  const { execute, ...state } = useApi<unknown>();

  const getProducts = useCallback(
    () => execute(() => api.get('/products')),
    [execute]
  );

  const getProductById = useCallback(
    (id: number) => execute(() => api.get(`/products/${id}`)),
    [execute]
  );

  const createProduct = useCallback(
    (data: unknown) => execute(() => api.post('/products', data)),
    [execute]
  );

  const updateProduct = useCallback(
    (id: number, data: unknown) => execute(() => api.put(`/products/${id}`, data)),
    [execute]
  );

  const deleteProduct = useCallback(
    (id: number) => execute(() => api.delete(`/products/${id}`)),
    [execute]
  );

  return {
    ...state,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

// Hook cho posts
export function usePosts() {
  const { execute, ...state } = useApi<unknown>();

  const getPosts = useCallback(
    () => execute(() => api.get('/posts')),
    [execute]
  );

  const getPostById = useCallback(
    (id: number) => execute(() => api.get(`/posts/${id}`)),
    [execute]
  );

  const createPost = useCallback(
    (data: unknown) => execute(() => api.post('/posts', data)),
    [execute]
  );

  const updatePost = useCallback(
    (id: number, data: unknown) => execute(() => api.put(`/posts/${id}`, data)),
    [execute]
  );

  const deletePost = useCallback(
    (id: number) => execute(() => api.delete(`/posts/${id}`)),
    [execute]
  );

  return {
    ...state,
    getPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
  };
}

// Hook cho orders
export function useOrders() {
  const { execute, ...state } = useApi<unknown>();

  const getOrders = useCallback(
    () => execute(() => api.get('/orders')),
    [execute]
  );

  const getOrderById = useCallback(
    (id: number) => execute(() => api.get(`/orders/${id}`)),
    [execute]
  );

  const updateOrderStatus = useCallback(
    (id: number, status: string) => execute(() => api.put(`/orders/${id}/status`, { status })),
    [execute]
  );

  return {
    ...state,
    getOrders,
    getOrderById,
    updateOrderStatus,
  };
}

// Hook cho users
export function useUsers() {
  const { execute, ...state } = useApi<unknown>();

  const getUsers = useCallback(
    () => execute(() => api.get('/users')),
    [execute]
  );

  const getUserById = useCallback(
    (id: number) => execute(() => api.get(`/users/${id}`)),
    [execute]
  );

  const updateUser = useCallback(
    (id: number, data: unknown) => execute(() => api.put(`/users/${id}`, data)),
    [execute]
  );

  const deleteUser = useCallback(
    (id: number) => execute(() => api.delete(`/users/${id}`)),
    [execute]
  );

  return {
    ...state,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
  };
}
