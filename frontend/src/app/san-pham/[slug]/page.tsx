"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Heart, Star, Truck, Shield, RotateCcw } from "lucide-react";
import Link from "next/link";

// Mock product data
const product = {
  id: "1",
  name: "Áo lót ren đen quyến rũ",
  price: 890000,
  originalPrice: 1290000,
  description: "Thiết kế áo lót ren đen tinh tế với chi tiết hoa văn độc đáo, tôn lên vẻ đẹp nữ tính và quyến rũ. Chất liệu ren cao cấp mềm mại, thoáng khí mang lại cảm giác thoải mái suốt ngày dài.",
  features: [
    "Chất liệu ren cao cấp từ Pháp",
    "Thiết kế không gọng, nâng nhẹ tự nhiên",
    "Khóa cài sau 3 cài chỉnh linh hoạt",
    "Quai áo có thể tháo rời",
    "Có thể giặt máy bằng chế độ nhẹ"
  ],
  images: [
    "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578915446522-f40d855e2418?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop"
  ],
  sizes: [
    { label: "70A", available: true },
    { label: "70B", available: true },
    { label: "75A", available: false },
    { label: "75B", available: true },
    { label: "80A", available: true },
    { label: "80B", available: true },
    { label: "85A", available: false },
    { label: "85B", available: true }
  ],
  colors: [
    { name: "Đen", value: "#000000", active: true },
    { name: "Trắng", value: "#FFFFFF", active: false },
    { name: "Be", value: "#E5D4C1", active: false }
  ],
  category: "Áo lót",
  brand: "Lingerie Shop",
  rating: 4.8,
  reviews: 127,
  stock: 15
};

const relatedProducts = [
  {
    id: "2",
    name: "Quần lót ren matching",
    price: 450000,
    image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "Đồ ngủ lụa satin",
    price: 1200000,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "4",
    name: "Bộ nội y ren trắng",
    price: 1580000,
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop",
  },
];

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("Đen");
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Vui lòng chọn kích cỡ");
      return;
    }
    // Add to cart logic here
    console.log("Added to cart:", {
      productId: product.id,
      size: selectedSize,
      color: selectedColor,
      quantity
    });
  };

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

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
               src={product.images[selectedImage]}
               alt={product.name}
               fill
               className="object-cover"
             />
             {product.originalPrice && (
               <span className="absolute top-4 left-4 bg-red-600 text-white text-sm px-3 py-1">
                 -{discount}%
               </span>
             )}
           </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((image, index) => (
              <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-3/4 bg-gray-50 rounded overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-black' : 'border-transparent'
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
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{product.category}</p>
            <h1 className="text-3xl lg:text-4xl font-serif font-light mb-4">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">({product.reviews} đánh giá)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-light">{product.price.toLocaleString('vi-VN')}₫</span>
              {product.originalPrice && (
                <span className="text-xl text-gray-400 line-through">
                  {product.originalPrice.toLocaleString('vi-VN')}₫
                </span>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Color Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">Màu sắc</h3>
            <div className="flex gap-2">
              {product.colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`relative w-12 h-12 rounded-full border-2 transition-all ${
                    selectedColor === color.name ? 'border-black scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {selectedColor === color.name && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Kích cỡ</h3>
              <button className="text-sm text-gray-500 hover:text-black underline">
                Hướng dẫn chọn size
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size.label}
                  onClick={() => size.available && setSelectedSize(size.label)}
                  disabled={!size.available}
                  className={`py-3 px-4 border rounded transition-all ${
                    !size.available
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : selectedSize === size.label
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-black'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

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
              <span className="text-sm text-gray-500">
                {product.stock} sản phẩm có sẵn
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              className="ck-button flex-1 bg-black text-white py-4 rounded-lg hover:bg-gray-900 transition flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Thêm vào giỏ hàng
            </button>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="p-4 border border-gray-300 rounded-lg hover:border-black transition"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
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
          {["description", "features", "reviews"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 mr-8 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              {tab === "description" && "Mô tả"}
              {tab === "features" && "Đặc điểm"}
              {tab === "reviews" && "Đánh giá"}
            </button>
          ))}
        </div>

        <div className="max-w-3xl">
          {activeTab === "description" && (
            <div className="prose prose-lg">
              <p className="text-gray-600 leading-relaxed mb-6">
                {product.description}
              </p>
              <p className="text-gray-600 leading-relaxed">
                Với thiết kế tinh tế và chất liệu cao cấp, sản phẩm này không chỉ mang lại sự thoải mái
                mà còn giúp bạn tự tin khoe vẻ đẹp quyến rũ của mình. Ren mềm mại ôm trọn cơ thể,
                tạo nên những đường nét nữ tính đầy cuốn hút.
              </p>
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Đặc điểm nổi bật</h3>
              <ul className="space-y-3">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-black rounded-full mt-2"></div>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "reviews" && (
            <div>
              <h3 className="text-lg font-medium mb-6">Đánh giá từ khách hàng</h3>
              <div className="space-y-6">
                {/* Review summary */}
                <div className="flex items-center gap-6 pb-6 border-b">
                  <div className="text-center">
                    <div className="text-4xl font-light">{product.rating}</div>
                    <div className="flex justify-center my-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">{product.reviews} đánh giá</p>
                  </div>
                </div>
                {/* Reviews list - sẽ thêm sau */}
                <p className="text-center text-gray-500 py-8">
                  Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div>
        <h2 className="text-2xl font-serif font-light mb-8 text-center">Sản phẩm liên quan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {relatedProducts.map((relatedProduct) => (
            <div key={relatedProduct.id} className="group cursor-pointer">
              <div className="relative aspect-3/4 bg-gray-50 overflow-hidden rounded-lg mb-4">
                <Image
                  src={relatedProduct.image}
                  alt={relatedProduct.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h3 className="font-medium text-gray-900 group-hover:text-rose-600 transition-colors mb-2">
                {relatedProduct.name}
              </h3>
              <p className="text-lg font-light">{relatedProduct.price.toLocaleString('vi-VN')}₫</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}