"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { trackWishlistEvent } from "@/lib/tracking";

interface WishlistProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  category: {
    name: string;
    slug: string;
  };
  isVisible: boolean;
}

export interface WishlistItem {
  id: number;
  productId: number;
  addedAt: string;
  product: WishlistProduct;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  itemCount: number;
  isInWishlist: (productId: number) => boolean;
  toggleWishlist: (productId: number) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/wishlist`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Chỉ xử lý nếu response OK
      if (!res.ok) {
        // Không log lỗi 401/403 - đây là trường hợp bình thường khi chưa auth
        if (res.status !== 401 && res.status !== 403) {
          console.error("Fetch wishlist error:", res.status);
        }
        setItems([]);
        return;
      }
      
      const data = await res.json();

      if (data.success) {
        setItems(data.data);
      }
    } catch {
      // Silent fail - không log error
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, isAuthenticated, token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback((productId: number): boolean => {
    return items.some(item => item.productId === productId);
  }, [items]);

  const toggleWishlist = async (productId: number): Promise<boolean> => {
    if (!isAuthenticated || !token) {
      return false;
    }

    // Check current state before API call
    const wasInWishlist = isInWishlist(productId);

    try {
      const res = await fetch(`${baseUrl}/wishlist/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (data.success) {
        const isNowInWishlist = data.data.isInWishlist;
        
        // Track wishlist event
        trackWishlistEvent({
          event: isNowInWishlist ? 'add_to_wishlist' : 'remove_from_wishlist',
          productId,
        });
        
        await fetchWishlist();
        return isNowInWishlist;
      }
      return wasInWishlist;
    } catch (err) {
      console.error("Toggle wishlist error:", err);
      return wasInWishlist;
    }
  };

  const removeFromWishlist = async (productId: number): Promise<void> => {
    if (!isAuthenticated || !token) return;

    try {
      const res = await fetch(`${baseUrl}/wishlist/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        // Track remove from wishlist
        trackWishlistEvent({
          event: 'remove_from_wishlist',
          productId,
        });
        
        setItems(prev => prev.filter(item => item.productId !== productId));
      }
    } catch (err) {
      console.error("Remove from wishlist error:", err);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        itemCount: items.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
