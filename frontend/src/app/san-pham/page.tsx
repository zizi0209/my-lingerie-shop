"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/product/ProductCard";
import { Filter, Loader2, Search, X } from "lucide-react";
import { trackPageView, trackSearch } from "@/lib/tracking";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isNew?: boolean;
  isSale?: boolean;
  slug?: string;
  colorGroups?: {
    colorId: number;
    colorName: string;
    hexCode: string;
    slug: string;
    isDefault: boolean;
    images: { id: number; url: string }[];
    sizes: { variantId: number; size: string; stock: number }[];
    totalStock: number;
  }[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ColorFilter {
  id: number;
  name: string;
  hexCode: string;
}

interface FiltersData {
  colors: ColorFilter[];
  sizes: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

const PRODUCTS_PER_PAGE = 24;

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FiltersData>({
    colors: [],
    sizes: [],
    priceRange: { min: 0, max: 10000000 },
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchMeta, setSearchMeta] = useState<{ searchType?: string } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });
  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const hasTrackedPageView = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      const path = searchQuery ? `/san-pham?search=${encodeURIComponent(searchQuery)}` : '/san-pham';
      trackPageView({ path });
    }
  }, [searchQuery]);

  // Track search when results are loaded
  useEffect(() => {
    if (searchQuery && total > 0 && !loading) {
      trackSearch({
        keyword: searchQuery,
        resultsCount: total,
      });
    }
  }, [searchQuery, total, loading]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${baseUrl}/categories`);
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, [baseUrl]);

  // Fetch filter options (colors, sizes from API)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") {
          params.append("categoryId", selectedCategory);
        }
        const res = await fetch(`${baseUrl}/filters?${params}`);
        const data = await res.json();
        if (data.success) {
          setFilters(data.data);
        }
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };
    fetchFilters();
  }, [baseUrl, selectedCategory]);

  // Fetch products - use smart search API when there's a search query
  const fetchProducts = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let res: Response;

      if (searchQuery) {
        // Use Smart Search API
        const params = new URLSearchParams({
          q: searchQuery,
          page: pageNum.toString(),
          limit: PRODUCTS_PER_PAGE.toString(),
        });

        if (selectedCategory !== "all") {
          params.append("categoryId", selectedCategory);
        }

        if (priceRange.min > 0) {
          params.append("minPrice", priceRange.min.toString());
        }

        if (priceRange.max < 10000000) {
          params.append("maxPrice", priceRange.max.toString());
        }

        if (selectedColors.length > 0) {
          params.append("colors", selectedColors.join(","));
        }

        if (selectedSizes.length > 0) {
          params.append("sizes", selectedSizes.join(","));
        }

        // Map sortBy to search API format
        if (sortBy === "price-low") {
          params.append("sortBy", "price_asc");
        } else if (sortBy === "price-high") {
          params.append("sortBy", "price_desc");
        } else if (sortBy === "popular") {
          params.append("sortBy", "popular");
        } else {
          params.append("sortBy", "newest");
        }

        res = await fetch(`${baseUrl}/search?${params}`);
      } else {
        // Use regular products API
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PRODUCTS_PER_PAGE.toString(),
          sortBy: sortBy === "price-low" ? "price" : sortBy === "price-high" ? "price" : "createdAt",
          sortOrder: sortBy === "price-low" ? "asc" : "desc",
        });

        if (selectedCategory !== "all") {
          params.append("categoryId", selectedCategory);
        }

        if (priceRange.min > 0) {
          params.append("minPrice", priceRange.min.toString());
        }

        if (priceRange.max < 10000000) {
          params.append("maxPrice", priceRange.max.toString());
        }

        if (selectedColors.length > 0) {
          params.append("colors", selectedColors.join(","));
        }

        if (selectedSizes.length > 0) {
          params.append("sizes", selectedSizes.join(","));
        }

        res = await fetch(`${baseUrl}/products?${params}`);
      }
      const data = await res.json();

      if (data.success) {
        const mappedProducts: Product[] = data.data.map((p: {
          id: number;
          name: string;
          price: number;
          salePrice?: number;
          compareAtPrice?: number;
          image?: string;
          images?: { id: number; url: string; colorId?: number }[];
          category?: { name: string };
          slug?: string;
          createdAt?: string;
          colorGroups?: {
            colorId: number;
            colorName: string;
            hexCode: string;
            slug: string;
            isDefault: boolean;
            images: { id: number; url: string }[];
            sizes: { variantId: number; size: string; stock: number }[];
            totalStock: number;
          }[];
        }) => ({
          id: p.id.toString(),
          name: p.name,
          price: p.salePrice || p.price,
          originalPrice: p.salePrice ? p.price : (p.compareAtPrice || undefined),
          image: p.image || p.images?.[0]?.url || "https://via.placeholder.com/400x600",
          category: p.category?.name || "Chưa phân loại",
          isNew: p.createdAt ? isNewProduct(p.createdAt) : false,
          isSale: p.salePrice ? p.salePrice < p.price : (p.compareAtPrice ? p.compareAtPrice > p.price : false),
          slug: p.slug,
          colorGroups: p.colorGroups,
        }));

        if (reset) {
          setProducts(mappedProducts);
        } else {
          setProducts(prev => [...prev, ...mappedProducts]);
        }

        // Handle both search API and products API response format
        const totalCount = data.meta?.total || data.pagination?.total || mappedProducts.length;
        const totalPages = data.meta?.totalPages || data.pagination?.totalPages || 1;
        
        setTotal(totalCount);
        setHasMore(pageNum < totalPages);
        
        // Store search metadata if available
        if (data.meta) {
          setSearchMeta({ searchType: data.meta.searchType });
        }
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [baseUrl, selectedCategory, sortBy, priceRange, selectedColors, selectedSizes, searchQuery]);

  // Check if product is new (within 30 days)
  const isNewProduct = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  // Initial fetch and when filters change
  useEffect(() => {
    setPage(1);
    fetchProducts(1, true);
  }, [fetchProducts]);

  // Load more handler
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, false);
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleColorToggle = (colorName: string) => {
    setSelectedColors(prev =>
      prev.includes(colorName)
        ? prev.filter(c => c !== colorName)
        : [...prev, colorName]
    );
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange({ min: 0, max: 10000000 });
    setSortBy("newest");
  };

  // Clear search
  const clearSearch = () => {
    window.location.href = "/san-pham";
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        {searchQuery ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Search className="w-6 h-6 text-gray-400" />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-light text-gray-900 dark:text-white">
                Kết quả tìm kiếm
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white">
                &ldquo;{searchQuery}&rdquo;
                <button onClick={clearSearch} className="hover:text-red-500 transition">
                  <X className="w-4 h-4" />
                </button>
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {total} sản phẩm
                {searchMeta?.searchType === "navigation" && " (Khám phá)"}
              </span>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-3 md:mb-4 text-gray-900 dark:text-white">
              Sản phẩm
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
              Khám phá bộ sưu tập nội y cao cấp với thiết kế tinh tế và chất liệu premium
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
        {/* Filters Sidebar */}
        <aside className={`${isFilterOpen ? "block" : "hidden"} lg:block w-full lg:w-64 shrink-0`}>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors sticky top-24">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-medium text-gray-900 dark:text-white">Bộ lọc</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition min-h-[44px] px-2"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Categories */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-sm md:text-base font-medium mb-3 md:mb-4 text-gray-900 dark:text-white">Danh mục</h3>
              <div className="space-y-1 md:space-y-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`block w-full text-left py-2 px-2 rounded transition-colors min-h-[44px] ${
                    selectedCategory === "all"
                      ? "text-primary-600 dark:text-primary-400 font-medium bg-primary-50 dark:bg-primary-900/30"
                      : "text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  Tất cả
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id.toString())}
                    className={`block w-full text-left py-2 px-2 rounded transition-colors min-h-[44px] ${
                      selectedCategory === category.id.toString()
                        ? "text-primary-600 dark:text-primary-400 font-medium bg-primary-50 dark:bg-primary-900/30"
                        : "text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes - Dynamic from API */}
            {filters.sizes.length > 0 && (
              <div className="mb-8">
                <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Kích cỡ</h3>
                <div className="flex flex-wrap gap-2">
                  {filters.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`min-w-[48px] h-12 px-2 rounded border transition-all ${
                        selectedSizes.includes(size)
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors - Dynamic from API */}
            {filters.colors.length > 0 && (
              <div className="mb-8">
                <h3 className="font-medium mb-4 text-gray-900 dark:text-white">Màu sắc</h3>
                <div className="space-y-2">
                  {filters.colors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => handleColorToggle(color.name)}
                      className={`flex items-center gap-3 w-full py-2 transition-colors ${
                        selectedColors.includes(color.name)
                          ? "text-primary-600 dark:text-primary-400 font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300"
                      }`}
                    >
                      <div 
                        className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                        style={{ backgroundColor: color.hexCode }}
                      />
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3 md:gap-4">
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Hiển thị {products.length} / {total} sản phẩm
            </p>
            <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 md:px-4 border border-gray-300 dark:border-gray-600 rounded focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm md:text-base min-h-[44px] flex-1 sm:flex-initial"
              >
                <option value="newest">Mới nhất</option>
                <option value="price-low">Giá tăng dần</option>
                <option value="price-high">Giá giảm dần</option>
              </select>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 md:px-4 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-900 dark:text-white text-sm md:text-base min-h-[44px]"
              >
                <Filter className="w-4 h-4" />
                Bộ lọc
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 aspect-[3/4] rounded-lg mb-4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Products Grid - 4 cols desktop, 3 cols tablet, 2 cols mobile */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white rounded-full font-medium hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      "Xem thêm sản phẩm"
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 md:py-20 px-4">
              <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-4">
                Không tìm thấy sản phẩm phù hợp
              </p>
              <button
                onClick={clearFilters}
                className="text-black dark:text-white underline hover:no-underline min-h-[44px] px-4"
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
