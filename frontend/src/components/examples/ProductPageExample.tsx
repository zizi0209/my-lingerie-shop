"use client";

/**
 * EXAMPLE PRODUCT PAGE WITH SIZE SYSTEM V2
 *
 * This is a complete example showing how to integrate all Size System V2 components
 * into a product detail page.
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Ruler, Heart } from 'lucide-react';
import SisterSizeAlert from '@/components/product/SisterSizeAlert';
import BrandFitNotice from '@/components/product/BrandFitNotice';
import RegionSwitcher from '@/components/product/RegionSwitcher';
import SizeGuideModal from '@/components/product/SizeGuideModal';
import type { RegionCode } from '@/types/size-system-v2';

interface ProductPageExampleProps {
  product: {
    id: number;
    name: string;
    brandId: string;
    brandName: string;
    price: number;
    images: string[];
    description: string;
    productType: 'BRA' | 'PANTY' | 'SET' | 'SLEEPWEAR' | 'SHAPEWEAR';
    availableSizes: string[];
  };
}

export default function ProductPageExample({ product }: ProductPageExampleProps) {
  // State
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [regionCode, setRegionCode] = useState<RegionCode>('US');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Load region preference from localStorage
  useEffect(() => {
    const savedRegion = localStorage.getItem('preferredRegion') as RegionCode;
    if (savedRegion) {
      setRegionCode(savedRegion);
    }
  }, []);

  // Save region preference
  const handleRegionChange = (region: RegionCode) => {
    setRegionCode(region);
    localStorage.setItem('preferredRegion', region);
  };

  // Handle size selection from Sister Size Alert
  const handleSisterSizeSelect = (size: string, universalCode: string) => {
    setSelectedSize(size);
    console.log('Selected sister size:', size, 'UIC:', universalCode);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }

    console.log('Adding to cart:', {
      productId: product.id,
      size: selectedSize,
      quantity,
      regionCode,
    });

    // TODO: Implement actual cart logic
    alert(`Added ${quantity}x ${product.name} (Size ${selectedSize}) to cart!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1).map((img, idx) => (
              <div
                key={idx}
                className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition"
              >
                <img src={img} alt={`${product.name} ${idx + 2}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Product Details */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{product.brandName}</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {product.name}
            </h1>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${product.price.toFixed(2)}
            </p>
          </div>

          {/* Region Switcher */}
          <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Size Region:
              </span>
              <RegionSwitcher
                currentRegion={regionCode}
                onRegionChange={handleRegionChange}
              />
            </div>
          </div>

          {/* Brand Fit Notice */}
          {product.brandId && (
            <BrandFitNotice
              brandId={product.brandId}
              userNormalSize={selectedSize}
              regionCode={regionCode}
              onSizeRecommended={(recommendedSize) => {
                console.log('Brand recommends:', recommendedSize);
              }}
            />
          )}

          {/* Size Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Select Size:
              </label>
              <button
                onClick={() => setShowSizeGuide(true)}
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <Ruler className="w-4 h-4" />
                Size Guide
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {product.availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-3 border rounded-lg text-sm font-medium transition ${
                    selectedSize === size
                      ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                      : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Sister Size Alert */}
          {selectedSize && (
            <SisterSizeAlert
              productId={product.id}
              requestedSize={selectedSize}
              regionCode={regionCode}
              onSizeSelect={handleSisterSizeSelect}
            />
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Quantity:
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                -
              </button>
              <span className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            <button className="px-4 py-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <Heart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Description */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Features */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Sister sizing recommendations when out of stock
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                International size conversions (US/UK/EU)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Brand fit adjustments for perfect fit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Free size exchange within 7 days
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        productType={product.productType}
        productId={product.id}
        selectedSize={selectedSize}
      />
    </div>
  );
}

// ============================================
// EXAMPLE USAGE
// ============================================

/*
// pages/products/[slug].tsx (Next.js Pages Router)

import ProductPageExample from '@/components/examples/ProductPageExample';

export default function ProductDetailPage({ product }) {
  return <ProductPageExample product={product} />;
}

export async function getServerSideProps({ params }) {
  const product = await fetchProduct(params.slug);
  return { props: { product } };
}
*/

/*
// app/products/[slug]/page.tsx (Next.js App Router)

import ProductPageExample from '@/components/examples/ProductPageExample';

export default async function ProductDetailPage({ params }) {
  const product = await fetchProduct(params.slug);
  return <ProductPageExample product={product} />;
}
*/
