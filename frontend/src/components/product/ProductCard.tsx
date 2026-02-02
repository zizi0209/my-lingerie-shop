import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Heart, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";

interface ColorGroup {
  colorId: number;
  colorName: string;
  hexCode: string;
  slug: string;
  isDefault: boolean;
  images: { id: number; url: string }[];
  sizes: { variantId: number; size: string; stock: number }[];
  totalStock: number;
}

interface Product {
  id: string | number;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isNew?: boolean;
  isSale?: boolean;
  colorGroups?: ColorGroup[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  
  const [isHovered, setIsHovered] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  
  const productId = typeof product.id === 'string' ? parseInt(product.id, 10) : product.id;
  const isLiked = isInWishlist(productId);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Ưu tiên slug, fallback sang id
  const productUrl = `/san-pham/${product.slug || product.id}`;

  // Get current color and image based on selection
  const { currentImage, availableColors } = useMemo(() => {
    const colors = product.colorGroups || [];
    
    if (colors.length === 0) {
      return { currentImage: product.image, availableColors: [] };
    }

    // Find selected or default color
    const selectedColor = selectedColorId 
      ? colors.find(c => c.colorId === selectedColorId)
      : colors.find(c => c.isDefault) || colors[0];

    const image = selectedColor?.images[0]?.url || product.image;

    return { currentImage: image, availableColors: colors };
  }, [product.colorGroups, product.image, selectedColorId]);

  return (
    <article
      className="group cursor-pointer flex flex-col gap-4 bg-transparent transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-brand-secondary shadow-sm transition-shadow hover:shadow-2xl">
        {/* Product Image */}
        <Link
          href={productUrl}
          className="relative w-full h-full block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Xem chi tiết ${product.name}`}
        >
          <Image
            src={currentImage}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}
            loading="lazy"
          />
        </Link>

        {/* Floating Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10" aria-label="Nhãn sản phẩm">
          {product.isNew && (
            <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] px-3 py-1.5 uppercase tracking-[0.15em] font-bold shadow-xl">
              Mới
            </span>
          )}
          {product.isSale && product.originalPrice && (
            <span className="bg-red-600 text-white text-[9px] px-3 py-1.5 uppercase tracking-[0.15em] font-bold shadow-xl">
              -{discount}%
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button 
          className="absolute top-4 right-4 p-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 z-30 shadow-xl border border-brand-border/20"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isAuthenticated) {
              toast.error("Vui lòng đăng nhập để thêm vào yêu thích");
              router.push("/login-register");
              return;
            }
            setTogglingWishlist(true);
            const result = await toggleWishlist(productId);
            setTogglingWishlist(false);
            if (result) {
              toast.success("Đã thêm vào danh sách yêu thích");
            } else {
              toast.success("Đã xóa khỏi danh sách yêu thích");
            }
          }}
          disabled={togglingWishlist}
          aria-label={isLiked ? `Bỏ thích ${product.name}` : `Yêu thích ${product.name}`}
        >
          {togglingWishlist ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-900 dark:text-white" aria-hidden="true" />
          ) : (
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white'}`} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>

        {/* Hover Actions Overlay */}
        <div className={`absolute inset-0 bg-white/10 dark:bg-black/20 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-all duration-500 flex flex-col justify-end p-4 gap-2 z-20 backdrop-blur-[2px]`}>
          <button 
            className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[10px] uppercase tracking-[0.15em] py-3.5 font-bold hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl border border-brand-border/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(productUrl);
            }}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
          >
            <ShoppingBag size={14} /> Thêm vào giỏ
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-2 px-1 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-bold opacity-80">{product.category}</p>
        <Link
          href={productUrl}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <h3 className="text-[12px] font-bold tracking-[0.05em] uppercase group-hover:text-brand-accent transition-colors text-gray-900 dark:text-white leading-relaxed line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Color Swatches */}
        {availableColors.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-1">
            {availableColors.map((color) => {
              const isSelected = selectedColorId === color.colorId || 
                (!selectedColorId && color.isDefault);
              const isOutOfStock = color.totalStock === 0;
              
              return (
                <button
                  key={color.colorId}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColorId(color.colorId);
                  }}
                  className={`
                    relative w-5 h-5 rounded-full transition-all duration-200
                    ${isSelected 
                      ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white' 
                      : 'hover:scale-110'
                    }
                    ${isOutOfStock ? 'opacity-40' : ''}
                  `}
                  style={{ backgroundColor: color.hexCode }}
                  title={`${color.colorName}${isOutOfStock ? ' (Hết hàng)' : ''}`}
                  aria-label={`Chọn màu ${color.colorName}`}
                >
                  {/* White border for light colors */}
                  {color.hexCode.toLowerCase() === '#ffffff' && (
                    <span className="absolute inset-0 rounded-full border border-gray-300" />
                  )}
                  {/* Out of stock indicator */}
                  {isOutOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-0.5 bg-gray-500 rotate-45 absolute" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium text-gray-900 dark:text-white opacity-70 italic">
            {product.price.toLocaleString('vi-VN')}₫
          </span>
          {product.originalPrice && (
            <span className="text-[12px] text-gray-400 dark:text-gray-500 line-through">
              {product.originalPrice.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </article>
  );
}