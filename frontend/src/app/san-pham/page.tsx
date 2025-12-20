"use client";

import { useState, useMemo } from "react";
import ProductCard from "@/components/product/ProductCard";
import { Filter, X } from "lucide-react";

// Mock data - sẽ thay bằng API call sau
const mockProducts = [
  {
    id: "1",
    name: "Áo lót ren màu đen",
    price: 890000,
    originalPrice: 1290000,
    image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop",
    category: "Áo lót",
    isNew: true,
    isSale: true,
  },
  {
    id: "2",
    name: "Quần lót ren cao cấp",
    price: 450000,
    image: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop",
    category: "Quần lót",
    isNew: false,
    isSale: false,
  },
  {
    id: "3",
    name: "Đồ ngủ lụa satin",
    price: 1200000,
    originalPrice: 1500000,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=2070&auto=format&fit=crop",
    category: "Đồ ngủ",
    isNew: false,
    isSale: true,
  },
  {
    id: "4",
    name: "Bộ nội y ren trắng",
    price: 1580000,
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop",
    category: "Bộ nội y",
    isNew: true,
    isSale: false,
  },
  {
    id: "5",
    name: "Áo lót không gọng",
    price: 790000,
    image: "https://images.unsplash.com/photo-1578915446522-f40d855e2418?q=80&w=2070&auto=format&fit=crop",
    category: "Áo lót",
    isNew: false,
    isSale: false,
  },
  {
    id: "6",
    name: "Quần lót giấy thun",
    price: 290000,
    originalPrice: 390000,
    image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop",
    category: "Quần lót",
    isNew: false,
    isSale: true,
  },
];

const categories = ["Tất cả", "Áo lót", "Quần lót", "Đồ ngủ", "Bộ nội y", "Áo tắm"];
const sizes = ["S", "M", "L", "XL", "XXL"];
const colors = ["Đen", "Trắng", "Be", "Hồng", "Đỏ", "Tím"];

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000000 });
  const [sortBy, setSortBy] = useState("featured");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = mockProducts;

    // Filter by category
    if (selectedCategory !== "Tất cả") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by price
    filtered = filtered.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case "new":
        filtered = [...filtered].filter(p => p.isNew);
        break;
      case "sale":
        filtered = [...filtered].filter(p => p.isSale);
        break;
    }

    return filtered;
  }, [selectedCategory, priceRange, sortBy]);

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleColorToggle = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange({ min: 0, max: 2000000 });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-gray-900 dark:text-white">Sản phẩm</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Khám phá bộ sưu tập nội y cao cấp với thiết kế tinh tế và chất liệu premium
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className={`${isFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0`}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Bộ lọc</h2>
              <button onClick={clearFilters} className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition">
                Xóa tất cả
              </button>
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Danh mục</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`block w-full text-left py-2 transition-colors ${
                      selectedCategory === category
                        ? 'text-black dark:text-white font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-8">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Kích cỡ</h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => handleSizeToggle(size)}
                    className={`w-12 h-12 rounded border transition-all ${
                      selectedSizes.includes(size)
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="mb-8">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Màu sắc</h3>
              <div className="space-y-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => handleColorToggle(color)}
                    className={`flex items-center gap-3 w-full py-2 transition-colors ${
                      selectedColors.includes(color)
                        ? 'text-black dark:text-white font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border ${
                      color === 'Đen' ? 'bg-black border-gray-400' :
                      color === 'Trắng' ? 'bg-white border-gray-300' :
                      color === 'Be' ? 'bg-stone-300 border-gray-400' :
                      color === 'Hồng' ? 'bg-pink-200 border-gray-400' :
                      color === 'Đỏ' ? 'bg-red-500 border-gray-400' :
                      'bg-purple-500 border-gray-400'
                    }`} />
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Khoảng giá</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Từ</label>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Đến</label>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <p className="text-gray-600 dark:text-gray-400">
              Hiển thị {filteredProducts.length} sản phẩm
            </p>
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="featured">Nổi bật</option>
                <option value="price-low">Giá tăng dần</option>
                <option value="price-high">Giá giảm dần</option>
                <option value="new">Mới nhất</option>
                <option value="sale">Khuyến mãi</option>
              </select>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-900 dark:text-white"
              >
                <Filter className="w-4 h-4" />
                Bộ lọc
                {(selectedSizes.length > 0 || selectedColors.length > 0) && (
                  <span className="w-2 h-2 bg-black dark:bg-white rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">Không tìm thấy sản phẩm phù hợp</p>
              <button
                onClick={clearFilters}
                className="text-black dark:text-white underline hover:no-underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}