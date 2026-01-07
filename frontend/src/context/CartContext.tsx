"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface CartProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  images: { url: string }[];
}

interface CartVariant {
  id: number;
  sku: string;
  size: string;
  colorName: string;
  stock: number;
  price: number | null;
  salePrice: number | null;
}

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  product: CartProduct;
  variant: CartVariant | null;
}

interface Cart {
  id: number;
  userId: number | null;
  sessionId: string | null;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  addToCart: (productId: number, variantId?: number, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  updateVariant: (itemId: number, variantId: number) => Promise<boolean>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  
  let sessionId = localStorage.getItem("cart_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("cart_session_id", sessionId);
  }
  return sessionId;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (isAuthenticated && user?.id) {
        params.set("userId", String(user.id));
      } else {
        params.set("sessionId", getSessionId());
      }

      const res = await fetch(`${baseUrl}/carts?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCart(data.data);
      } else {
        setError(data.error || "Không thể tải giỏ hàng");
      }
    } catch (err) {
      console.error("Fetch cart error:", err);
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, isAuthenticated, user?.id]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: number, variantId?: number, quantity = 1): Promise<boolean> => {
    if (!cart) {
      setError("Giỏ hàng chưa sẵn sàng");
      return false;
    }

    try {
      const res = await fetch(`${baseUrl}/carts/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCart();
        return true;
      } else {
        setError(data.error || "Không thể thêm sản phẩm");
        return false;
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      setError("Lỗi kết nối server");
      return false;
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;

    try {
      const res = await fetch(`${baseUrl}/carts/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCart();
      } else {
        setError(data.error || "Không thể cập nhật số lượng");
      }
    } catch (err) {
      console.error("Update quantity error:", err);
      setError("Lỗi kết nối server");
    }
  };

  const updateVariant = async (itemId: number, variantId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${baseUrl}/carts/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCart();
        return true;
      } else {
        setError(data.error || "Không thể cập nhật phân loại");
        return false;
      }
    } catch (err) {
      console.error("Update variant error:", err);
      setError("Lỗi kết nối server");
      return false;
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      const res = await fetch(`${baseUrl}/carts/items/${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        await fetchCart();
      } else {
        setError(data.error || "Không thể xóa sản phẩm");
      }
    } catch (err) {
      console.error("Remove item error:", err);
      setError("Lỗi kết nối server");
    }
  };

  const clearCart = async () => {
    if (!cart) return;

    try {
      const res = await fetch(`${baseUrl}/carts/${cart.id}/clear`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        await fetchCart();
      } else {
        setError(data.error || "Không thể xóa giỏ hàng");
      }
    } catch (err) {
      console.error("Clear cart error:", err);
      setError("Lỗi kết nối server");
    }
  };

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const subtotal = cart?.items.reduce((sum, item) => {
    const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
    return sum + price * item.quantity;
  }, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        subtotal,
        addToCart,
        updateQuantity,
        updateVariant,
        removeItem,
        clearCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
