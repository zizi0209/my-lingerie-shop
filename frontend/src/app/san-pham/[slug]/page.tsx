"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Heart, Star, Truck, Shield, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";

interface ProductImage {
  id: number;
  url: string;
}

interface ProductVariant {
  id: number;
  sku: string;
  size: string;
  colorName: string;
  stock: number;
  price: number | null;
  salePrice: number | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
}

interface RelatedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: ProductImage[];
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch product by slug
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${baseUrl}/products/slug/${resolvedParams.slug}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Không tìm thấy sản phẩm");
          return;
        }

        setProduct(data.data);

        // Set default color from variants
        if (data.data.variants?.length > 0) {
          const colors = [...new Set(data.data.variants.map((v: ProductVariant) => v.colorName))];
          if (colors.length > 0) {
            setSelectedColor(colors[0] as string);
          }
        }

        // Fetch related products from same category
        const relatedRes = await fetch(
          `${baseUrl}/products?categoryId=${data.data.categoryId}&limit=4`
        );
        const relatedData = await relatedRes.json();
        if (relatedData.success) {
          setRelatedProducts(
            relatedData.data
              .filter((p: RelatedProduct) => p.id !== data.data.id)
              .slice(0, 3)
          );
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Có lỗi xảy ra khi tải sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [baseUrl, resolvedParams.slug]);

  // Tính các màu và size từ variants
  const colors = product?.variants
    ? [...new Set(product.variants.map(v => v.colorName))].filter(Boolean)
    : [];

  const sizes = product?.variants
    ? [...new Set(product.variants.filter(v => v.colorName === selectedColor).map(v => v.size))]
    : [];

  // Kiểm tra size có còn hàng không
  const isSizeAvailable = (size: string) => {
    const variant = product?.variants.find(
      v => v.colorName === selectedColor && v.size === size
    );
    return variant && variant.stock > 0;
  };

  // Lấy stock của variant được chọn
  const selectedVariant = product?.variants.find(
    v => v.colorName === selectedColor && v.size === selectedSize
  );

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Vui lòng chọn kích cỡ");
      return;
    }
    console.log("Added to cart:", {
      productId: product?.id,
      variantId: selectedVariant?.id,
      size: selectedSize,
      color: selectedColor,
      quantity
    });
  };

  const discount = product?.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const displayPrice = product?.salePrice || product?.price || 0;
  const originalPrice = product?.salePrice ? product.price : null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 text-lg mb-4">{error || "Không tìm thấy sản phẩm"}</p>
        <Link
          href="/san-pham"
          className="text-black underline hover:no-underline"
        >
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const productImages = product.images.length > 0
    ? product.images.map(img => img.url)
    : ["https://via.placeholder.com/600x800"];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-black">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/san-pham" className="hover:text-black">Sản phẩm</Link>
        <span className="mx-2">/</span>
        <span className="text-black">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-3/4 bg-gray-50 overflow-hidden rounded-lg">
            <Image
              src={productImages[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-sm px-3 py-1">
                -{discount}%
              </span>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-3/4 bg-gray-50 rounded overflow-hidden border-2 transition-all ${
                    selectedImage === index ? "border-black" : "border-transparent"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
              {product.category.name}
            </p>
            <h1 className="text-3xl lg:text-4xl font-serif font-light mb-4">{product.name}</h1>

            {/* Rating placeholder */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">(0 đánh giá)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-light">{displayPrice.toLocaleString("vi-VN")}₫</span>
              {originalPrice && (
                <span className="text-xl text-gray-400 line-through">
                  {originalPrice.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Color Selection */}
          {colors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Màu sắc: {selectedColor}</h3>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedSize("");
                    }}
                    className={`px-4 py-2 border rounded transition-all ${
                      selectedColor === color
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Kích cỡ</h3>
                <button className="text-sm text-gray-500 hover:text-black underline">
                  Hướng dẫn chọn size
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {sizes.map((size) => {
                  const available = isSizeAvailable(size);
                  return (
                    <button
                      key={size}
                      onClick={() => available && setSelectedSize(size)}
                      disabled={!available}
                      className={`py-3 px-4 border rounded transition-all ${
                        !available
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                          : selectedSize === size
                          ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                          : "border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="text-sm font-medium mb-3">Số lượng</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-100 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-16 text-center border-x border-gray-300 py-3 focus:outline-none"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-gray-100 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {selectedVariant && (
                <span className="text-sm text-gray-500">
                  {selectedVariant.stock} sản phẩm có sẵn
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              className="ck-button flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Thêm vào giỏ hàng
            </button>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="ck-button px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition"
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3 py-6 border-y border-gray-200">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="w-5 h-5 text-gray-600" />
              <span>Miễn phí vận chuyển cho đơn hàng từ 1.000.000₫</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="w-5 h-5 text-gray-600" />
              <span>Đổi trả trong vòng 30 ngày</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-5 h-5 text-gray-600" />
              <span>Bảo hành sản phẩm 6 tháng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mb-20">
        <div className="flex border-b border-gray-200 mb-8">
          {["description", "reviews"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 mr-8 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {tab === "description" && "Mô tả"}
              {tab === "reviews" && "Đánh giá"}
            </button>
          ))}
        </div>

        <div className="max-w-3xl">
          {activeTab === "description" && (
            <div className="prose prose-lg">
              <p className="text-gray-600 leading-relaxed">
                {product.description || "Chưa có mô tả cho sản phẩm này."}
              </p>
            </div>
          )}

          {activeTab === "reviews" && (
            <div>
              <h3 className="text-lg font-medium mb-6">Đánh giá từ khách hàng</h3>
              <p className="text-center text-gray-500 py-8">
                Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-serif font-light mb-8 text-center">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <Link
                key={relatedProduct.id}
                href={`/san-pham/${relatedProduct.slug}`}
                className="group cursor-pointer"
              >
                <div className="relative aspect-3/4 bg-gray-50 overflow-hidden rounded-lg mb-4">
                  <Image
                    src={relatedProduct.images[0]?.url || "https://via.placeholder.com/400x600"}
                    alt={relatedProduct.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors mb-2">
                  {relatedProduct.name}
                </h3>
                <p className="text-lg font-light">{relatedProduct.price.toLocaleString("vi-VN")}₫</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
