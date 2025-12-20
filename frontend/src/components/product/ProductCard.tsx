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
    <div
      className="product-card group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative bg-gray-50 aspect-[3/4] overflow-hidden">
        {/* Product Image */}
        <div className="relative w-full h-full">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}
          />
        </div>

        {/* Overlay Actions */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="ck-button bg-white dark:bg-gray-800 text-black dark:text-white p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className="ck-button bg-white dark:bg-gray-800 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-black dark:text-white'}`} />
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.isNew && (
            <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-3 py-1 uppercase tracking-wider">
              New
            </span>
          )}
          {product.isSale && product.originalPrice && (
            <span className="bg-red-600 text-white text-xs px-3 py-1 uppercase tracking-wider">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</p>
        <Link href={`/san-pham/${product.id}`}>
          <h3 className="font-medium text-gray-900 group-hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg font-light">{product.price.toLocaleString('vi-VN')}₫</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              {product.originalPrice.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </div>
  );
}