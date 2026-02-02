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
// Size System V2 Components
import SisterSizeAlert from "@/components/product/SisterSizeAlert";
import BrandFitNotice from "@/components/product/BrandFitNotice";
import RegionSwitcher from "@/components/product/RegionSwitcher";
import type { RegionCode } from "@/types/size-system-v2";
// End Size System V2
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import type { ProductType } from "@/lib/sizeTemplateApi";
import { trackProductView, trackCartEvent } from "@/lib/tracking";
import { sanitizeForPublic } from "@/lib/sanitize";

interface ProductImage {
  id: number;
  url: string;
  colorId: number | null;
}

interface ProductVariant {
  id: number;
  sku: string;
  size: string;
  colorId: number;
  stock: number;
  price: number | null;
  salePrice: number | null;
}

interface ColorGroup {
  colorId: number;
  colorName: string;
  hexCode: string;
  slug: string;
  isDefault: boolean;
  images: { id: number; url: string }[];
  sizes: { variantId: number; size: string; stock: number; price?: number | null; salePrice?: number | null }[];
  totalStock: number;
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
  brandId?: string; // Size System V2
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  colorGroups?: ColorGroup[];
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
  const [_relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  // Size System V2 state
  const [regionCode, setRegionCode] = useState<RegionCode>('US');

  const isLiked = product ? isInWishlist(product.id) : false;

  // Load region preference from localStorage
  useEffect(() => {
    const savedRegion = localStorage.getItem('preferredRegion') as RegionCode;
    if (savedRegion) {
      setRegionCode(savedRegion);
    }
  }, []);

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

        // Set default color from colorGroups
        const colorGroups = data.data.colorGroups as ColorGroup[] | undefined;
        if (colorGroups && colorGroups.length > 0) {
          const defaultColor = colorGroups.find(cg => cg.isDefault) || colorGroups[0];
          setSelectedColorId(defaultColor.colorId);
          
          // Auto-select size if only 1 size or "Free Size"
          const sizesForColor = defaultColor.sizes.map(s => s.size);
          if (sizesForColor.length === 1) {
            setSelectedSize(sizesForColor[0]);
          } else if (sizesForColor.some(s => s.toLowerCase().includes('free'))) {
            const freeSize = sizesForColor.find(s => s.toLowerCase().includes('free'));
            if (freeSize) setSelectedSize(freeSize);
          }
        } else if (data.data.variants?.length > 0) {
          // Fallback for single-color products (no colorGroups)
          const sizes = [...new Set(data.data.variants.map((v: ProductVariant) => v.size))];
          if (sizes.length === 1) {
            setSelectedSize(sizes[0] as string);
          } else if (sizes.some((s) => String(s).toLowerCase().includes('free'))) {
            const freeSize = sizes.find((s) => String(s).toLowerCase().includes('free'));
            if (freeSize) setSelectedSize(freeSize as string);
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

  // Get color groups and selected color
  const colorGroups = product?.colorGroups || [];
  const selectedColorGroup = colorGroups.find(cg => cg.colorId === selectedColorId) || colorGroups[0];

  // Get sizes for selected color
  const sizes = selectedColorGroup
    ? selectedColorGroup.sizes.map(s => s.size)
    : product?.variants
      ? [...new Set(product.variants.map(v => v.size))]
      : [];

   // Kiểm tra xem có phải là freesize không (không cần hiển thị sister size cho freesize)
   const isFreeSize = (size: string, allSizes: string[]) => {
     const lowerSize = size.toLowerCase();
     // Nếu size chứa "free" hoặc chỉ có 1 size và không phải là size bra/panty thông thường
     if (lowerSize.includes('free') || lowerSize.includes('one size')) {
       return true;
     }
     // Nếu chỉ có 1 size và không match pattern bra size (như 32A, 34B, 75C, etc.)
     if (allSizes.length === 1) {
       const braPattern = /^\d{2}[a-zA-Z]+$/; // 34C, 75D
       const pantyPattern = /^(XS|S|M|L|XL|XXL|XXXL)$/i;
       if (!braPattern.test(size) && !pantyPattern.test(size)) {
         return true;
       }
     }
     return false;
   };
 
  // Kiểm tra size có còn hàng không
  const isSizeAvailable = (size: string) => {
    if (selectedColorGroup) {
      const sizeInfo = selectedColorGroup.sizes.find(s => s.size === size);
      return sizeInfo && sizeInfo.stock > 0;
    }
    // Fallback for single-color products
    const variant = product?.variants.find(v => v.size === size);
    return variant && variant.stock > 0;
  };

  // Lấy stock của variant được chọn
  const selectedVariant = (() => {
    if (selectedColorGroup && selectedSize) {
      const sizeInfo = selectedColorGroup.sizes.find(s => s.size === selectedSize);
      if (sizeInfo) {
        return {
          id: sizeInfo.variantId,
          stock: sizeInfo.stock,
          price: sizeInfo.price,
          salePrice: sizeInfo.salePrice,
        };
      }
    }
    // Fallback
    return product?.variants.find(v => v.size === selectedSize);
  })();

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
          event: 'ADD_TO_CART',
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

  // Get images for selected color, or all images if no color selected
  const productImages = (() => {
    if (selectedColorGroup && selectedColorGroup.images.length > 0) {
      return selectedColorGroup.images.map(img => img.url);
    }
    // Fallback: show images with colorId = null or all images
    const generalImages = product.images.filter(img => img.colorId === null);
    if (generalImages.length > 0) {
      return generalImages.map(img => img.url);
    }
    return product.images.length > 0
      ? product.images.map(img => img.url)
      : ["https://via.placeholder.com/600x800"];
  })();

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

          {/* Size System V2: Region Switcher & Brand Fit Notice */}
          <div className="space-y-4 py-4 border-y border-gray-200 dark:border-gray-700">
            {/* Region Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Size Region:
              </span>
              <RegionSwitcher
                currentRegion={regionCode}
                onRegionChange={(region) => {
                  setRegionCode(region);
                  localStorage.setItem('preferredRegion', region);
                }}
              />
            </div>

            {/* Brand Fit Notice - shows if brand runs small/large */}
            {product?.brandId && selectedSize && (
              <BrandFitNotice
                brandId={product.brandId}
                userNormalSize={selectedSize}
                regionCode={regionCode}
                onSizeRecommended={(recommendedSize) => {
                  console.log('Brand recommends:', recommendedSize);
                  // Optionally auto-select recommended size
                  // setSelectedSize(recommendedSize);
                }}
              />
            )}
          </div>

          {/* Color Selection */}
          {colorGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">Màu sắc: {selectedColorGroup?.colorName}</h3>
              <div className="flex flex-wrap gap-2">
                {colorGroups.map((colorGroup) => {
                  const isSelected = selectedColorId === colorGroup.colorId;
                  return (
                    <button
                      key={colorGroup.colorId}
                      onClick={() => {
                        setSelectedColorId(colorGroup.colorId);
                        const sizesForColor = colorGroup.sizes.map((s) => s.size);
                        if (sizesForColor.length === 1) {
                          setSelectedSize(sizesForColor[0]);
                        } else {
                          setSelectedSize("");
                        }
                      }}
                      className={`relative px-4 py-2 border rounded transition-all flex items-center gap-2 ${
                        isSelected
                          ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: colorGroup.hexCode }}
                        aria-hidden
                      />
                      {colorGroup.colorName}
                    </button>
                  );
                })}
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

          {/* Size System V2: Sister Size Alert - shows when selected size is out of stock */}
           {product && selectedSize && selectedColorId && !isFreeSize(selectedSize, sizes) && (
            <SisterSizeAlert
              productId={product.id}
              requestedSize={selectedSize}
              regionCode={regionCode}
              onSizeSelect={(size, universalCode) => {
                setSelectedSize(size);
                toast.success(`Đã chọn size thay thế: ${size}`);
                console.log('Selected sister size:', size, 'UIC:', universalCode);
              }}
            />
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
