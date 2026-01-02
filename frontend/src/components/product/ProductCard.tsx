import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Heart } from "lucide-react";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isNew?: boolean;
  isSale?: boolean;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <article
      className="product-card group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative bg-gray-50 dark:bg-gray-800 aspect-[3/4] overflow-hidden rounded-lg">
        {/* Product Image */}
        <Link
          href={`/san-pham/${product.id}`}
          className="relative w-full h-full block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Xem chi tiết ${product.name}`}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}
            loading="lazy"
          />
        </Link>

        {/* Overlay Actions - Desktop only */}
        <div className={`hidden md:flex absolute inset-0 bg-black/40 items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className="ck-button bg-white dark:bg-gray-800 text-black dark:text-white p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            <ShoppingBag className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            aria-label={isLiked ? `Bỏ thích ${product.name}` : `Yêu thích ${product.name}`}
            className="ck-button bg-white dark:bg-gray-800 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-black dark:text-white'}`} aria-hidden="true" />
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-col gap-2" aria-label="Nhãn sản phẩm">
          {product.isNew && (
            <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-2 py-1 md:px-3 uppercase tracking-wider rounded">
              New
            </span>
          )}
          {product.isSale && product.originalPrice && (
            <span className="bg-error text-error-foreground text-xs px-2 py-1 md:px-3 uppercase tracking-wider rounded">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-3 md:mt-4 space-y-1 md:space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{product.category}</p>
        <Link
          href={`/san-pham/${product.id}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
        >
          <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base md:text-lg font-light text-gray-900 dark:text-gray-100">
            {product.price.toLocaleString('vi-VN')}₫
          </span>
          {product.originalPrice && (
            <span className="text-xs md:text-sm text-gray-400 dark:text-gray-500 line-through">
              {product.originalPrice.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </article>
  );
}