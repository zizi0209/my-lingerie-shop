'use client';

import React, { useState } from 'react';
import axios from 'axios';
import ImageUpload from '@/components/ImageUpload';

interface ProductFormProps {
  product?: any;
  onSuccess?: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    imageUrl: product?.imageUrl || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (product) {
        // Update
        await axios.put(`/api/products/${product.id}`, formData);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        // Create
        await axios.post('/api/products', formData);
        alert('Thêm sản phẩm thành công!');
      }

      setFormData({ name: '', description: '', price: '', imageUrl: '' });
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Lỗi khi lưu sản phẩm!');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tên sản phẩm
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mô tả
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Giá
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <ImageUpload
        value={formData.imageUrl}
        onChange={(url) => setFormData({ ...formData, imageUrl: url })}
        label="Ảnh sản phẩm"
      />

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Đang lưu...' : (product ? 'Cập nhật' : 'Thêm mới')}
        </button>
        <button
          type="button"
          onClick={() => setFormData({ name: '', description: '', price: '', imageUrl: '' })}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default ProductForm;