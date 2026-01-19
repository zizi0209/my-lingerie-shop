"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Heart, Star, Truck, Shield, RotateCcw, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReviewList from "@/components/product/ReviewList";
import SizeGuideModal from "@/components/product/SizeGuideModal";
import RecommendationSection from "@/components/product/RecommendationSection";
import RelatedPosts from "@/components/product/RelatedPosts";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import type { ProductType } from "@/lib/sizeTemplateApi";
import { trackProductView, trackCartEvent } from "@/lib/tracking";
import { sanitizeForPublic } from "@/lib/sanitize";

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
  productType: ProductType;
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  ratingAverage: number;
  reviewCount: number;
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
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  
  const isLiked = product ? isInWishlist(product.id) : false;
  
  // Get or create session ID
  useEffect(() => {
    let sid = localStorage.getItem('sessionId');
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sid);
    }
    setSessionId(sid);
  }, []);

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
            const firstColor = colors[0] as string;
            setSelectedColor(firstColor);
            
            // Auto-select size nếu chỉ có 1 size hoặc là "Free Size"
            const sizesForColor = [...new Set(
              data.data.variants
                .filter((v: ProductVariant) => v.colorName === firstColor)
                .map((v: ProductVariant) => v.size)
            )];
            
            if (sizesForColor.length === 1) {
              setSelectedSize(sizesForColor[0] as string);
            } else if (sizesForColor.some((s) => String(s).toLowerCase().includes('free'))) {
              const freeSize = sizesForColor.find((s) => String(s).toLowerCase().includes('free'));
              if (freeSize) setSelectedSize(freeSize as string);
            }
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

  // Track product view when product is loaded
  useEffect(() => {
    if (product && sessionId) {
      trackProductView({
        productId: product.id,
        userId: user?.id || null,
        source: 'direct',
      });
    }
  }, [product?.id, sessionId, user?.id]);

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

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Nếu có variants thì bắt buộc chọn size
    if (product.variants.length > 0 && !selectedSize) {
      toast.error("Vui lòng chọn kích cỡ");
      return;
    }

    setAddingToCart(true);
    try {
      const success = await addToCart(product.id, selectedVariant?.id, quantity);
      
      if (success) {
        // Track add to cart event
        trackCartEvent({
          event: 'add_to_cart',
          productId: product.id,
          variantId: selectedVariant?.id,
          quantity,
          userId: user?.id || null,
        });
        
        toast.success(
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium">Đã thêm vào giỏ hàng!</p>
              <p className="text-sm text-gray-500">{product.name}</p>
            </div>
          </div>,
          {
            action: {
              label: "Xem giỏ hàng",
              onClick: () => router.push("/cart"),
            },
          }
        );
      } else {
        toast.error("Không thể thêm sản phẩm vào giỏ hàng");
      }
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setAddingToCart(false);
    }
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
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">{error || "Không tìm thấy sản phẩm"}</p>
        <Link
          href="/san-pham"
          className="text-black dark:text-white underline hover:no-underline transition-colors"
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
      <nav className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/san-pham" className="hover:text-black dark:hover:text-white transition-colors">Sản phẩm</Link>
        <span className="mx-2">/</span>
        <span className="text-black dark:text-white">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-3/4 bg-gray-50 dark:bg-gray-800 overflow-hidden rounded-lg">
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
                  className={`relative aspect-3/4 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden border-2 transition-all ${
                    selectedImage === index ? "border-black dark:border-white" : "border-transparent"
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
            <h1 className="text-3xl lg:text-4xl font-serif font-light mb-4 text-gray-900 dark:text-white">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(product.ratingAverage) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  ({product.reviewCount} đánh giá)
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-light text-gray-900 dark:text-white">{displayPrice.toLocaleString("vi-VN")}₫</span>
              {originalPrice && (
                <span className="text-xl text-gray-400 line-through">
                  {originalPrice.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>

            {product.description && (
              <div 
                className="text-gray-600 dark:text-gray-300 leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeForPublic(product.description) }}
              />
            )}
          </div>

          {/* Color Selection */}
          {colors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">Màu sắc: {selectedColor}</h3>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      // Auto-select size nếu chỉ có 1 size cho màu này
                      const sizesForColor = [...new Set(
                        product?.variants
                          .filter(v => v.colorName === color)
                          .map(v => v.size)
                      )];
                      if (sizesForColor.length === 1) {
                        setSelectedSize(sizesForColor[0]);
                      } else {
                        setSelectedSize("");
                      }
                    }}
                    className={`px-4 py-2 border rounded transition-all ${
                      selectedColor === color
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection - Hide if only 1 size (auto-selected) */}
          {sizes.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Kích cỡ</h3>
                <button 
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline transition-colors"
                >
                  Hướng dẫn chọn size
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {sizes.map((size) => {
                  const available = isSizeAvailable(size);
                  return (
                    <button
                      key={size}
                      onClick={() => available && setSelectedSize(selectedSize === size ? "" : size)}
                      disabled={!available}
                      className={`py-3 px-4 border rounded transition-all ${
                        !available
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed line-through"
                          : selectedSize === size
                          ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white"
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
            <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">Số lượng</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-16 text-center border-x border-gray-300 dark:border-gray-600 py-3 focus:outline-none bg-transparent text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {selectedVariant && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedVariant.stock} sản phẩm có sẵn
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="ck-button flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {addingToCart ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  Thêm vào giỏ hàng
                </>
              )}
            </button>
            <button
              onClick={async () => {
                if (!isAuthenticated) {
                  toast.error("Vui lòng đăng nhập để thêm vào yêu thích");
                  router.push("/login-register");
                  return;
                }
                if (!product) return;
                setTogglingWishlist(true);
                const result = await toggleWishlist(product.id);
                setTogglingWishlist(false);
                
                // Tracking is handled by WishlistContext
                if (result) {
                  toast.success("Đã thêm vào danh sách yêu thích");
                } else {
                  toast.success("Đã xóa khỏi danh sách yêu thích");
                }
              }}
              disabled={togglingWishlist}
              className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition disabled:opacity-50"
              title={isLiked ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
            >
              {togglingWishlist ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              )}
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3 py-6 border-y border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span>Miễn phí vận chuyển cho đơn hàng từ 1.000.000₫</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span>Đổi trả trong vòng 30 ngày</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span>Bảo hành sản phẩm 6 tháng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mb-20">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
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

        <div className={activeTab === "description" ? "max-w-3xl" : ""}>
          {activeTab === "description" && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {product.description ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(product.description) }} />
              ) : (
                <p className="text-gray-600 dark:text-gray-300">Chưa có mô tả cho sản phẩm này.</p>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="max-w-none">
              <ReviewList productSlug={product.slug} />
            </div>
          )}
        </div>
      </div>

      {/* Related Posts - Blog Articles about this Product */}
      {product && (
        <RelatedPosts productId={product.id} className="mb-20" />
      )}

      {/* Similar Products - AI Recommendation */}
      {product && (
        <RecommendationSection
          type="similar"
          productId={product.id}
          userId={user?.id}
          sessionId={sessionId}
          title="Có thể bạn cũng thích"
          limit={8}
        />
      )}
      
      {/* Bought Together */}
      {product && (
        <RecommendationSection
          type="bought-together"
          productId={product.id}
          sessionId={sessionId}
          title="Thường mua cùng"
          limit={4}
        />
      )}
      
      {/* Recently Viewed */}
      {sessionId && product && (
        <RecommendationSection
          type="recently-viewed"
          productId={product.id}
          userId={user?.id}
          sessionId={sessionId}
          title="Đã xem gần đây"
          limit={6}
        />
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        productType={product?.productType}
        productId={product?.id}
        selectedSize={selectedSize}
      />
    </div>
  );
}
