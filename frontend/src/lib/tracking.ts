/**
 * Tracking utilities for user behavior analytics
 * Connects frontend actions to /api/tracking endpoints
 */

import { getApiBaseUrl } from './apiBase';

const BASE_URL = getApiBaseUrl();
const isDev = process.env.NODE_ENV !== 'production';

// Get or create session ID
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

interface TrackPageViewParams {
  path: string;
  userId?: number | null;
  referer?: string;
}

interface TrackProductViewParams {
  productId: number;
  userId?: number | null;
  source?: string; // 'direct' | 'search' | 'category' | 'recommendation' | 'wishlist'
}

interface TrackCartEventParams {
  event: 'ADD_TO_CART' | 'REMOVE_FROM_CART' | 'UPDATE_QUANTITY' | 'VIEW_CART' | 'BEGIN_CHECKOUT';
  productId?: number;
  variantId?: number;
  quantity?: number;
  cartId?: number;
  userId?: number | null;
}

interface TrackWishlistEventParams {
  event: 'add_to_wishlist' | 'remove_from_wishlist';
  productId: number;
  userId?: number | null;
}

interface TrackSearchParams {
  keyword: string;
  resultsCount: number;
  userId?: number | null;
}

const trackRequest = async (endpoint: string, payload: Record<string, unknown>): Promise<void> => {
  if (!BASE_URL) return;
  if (typeof window !== 'undefined' && navigator.onLine === false) return;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok && isDev) {
      console.warn(`[Tracking] ${endpoint} failed:`, response.status);
    }
  } catch (error) {
    if (isDev) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Tracking] ${endpoint} failed:`, message);
    }
  }
};

/**
 * Track page view
 */
export async function trackPageView(params: TrackPageViewParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    await trackRequest('/tracking/page-views', {
      path: params.path,
      userId: params.userId || null,
      sessionId,
      referer: params.referer || (typeof document !== "undefined" ? document.referrer : null),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (error) {
    if (isDev) {
      console.warn("Track page view error:", error);
    }
  }
}

/**
 * Track product view
 */
export async function trackProductView(params: TrackProductViewParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    await trackRequest('/tracking/product-views', {
      productId: params.productId,
      userId: params.userId || null,
      sessionId,
      source: params.source || 'direct',
    });
  } catch (error) {
    if (isDev) {
      console.warn("Track product view error:", error);
    }
  }
}

/**
 * Track cart events
 */
export async function trackCartEvent(params: TrackCartEventParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    await trackRequest('/tracking/cart-events', {
      event: params.event,
      productId: params.productId || null,
      cartId: params.cartId || null,
      userId: params.userId || null,
      sessionId,
      data: {
        variantId: params.variantId,
        quantity: params.quantity,
      },
    });
  } catch (error) {
    if (isDev) {
      console.warn("Track cart event error:", error);
    }
  }
}

/**
 * Track wishlist events
 */
export async function trackWishlistEvent(params: TrackWishlistEventParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    await trackRequest('/tracking/cart-events', {
      event: params.event,
      productId: params.productId,
      userId: params.userId || null,
      sessionId,
      data: { type: 'wishlist' },
    });
  } catch (error) {
    if (isDev) {
      console.warn("Track wishlist event error:", error);
    }
  }
}

/**
 * Track search
 */
export async function trackSearch(params: TrackSearchParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    await trackRequest('/tracking/page-views', {
      path: `/search?q=${encodeURIComponent(params.keyword)}`,
      userId: params.userId || null,
      sessionId,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (error) {
    if (isDev) {
      console.warn("Track search error:", error);
    }
  }
}

interface TrackContentCommerceParams {
  event: 'product_click_from_post' | 'related_post_click_from_product' | 'add_to_cart_from_post';
  productId?: number;
  postId?: number;
  postSlug?: string;
  productSlug?: string;
  displayType?: 'inline-card' | 'sidebar' | 'end-collection';
  positionIndex?: number;
  userId?: number | null;
}

/**
 * Track content-commerce interaction
 * Used to measure effectiveness of product-post linking feature
 */
export async function trackContentCommerce(params: TrackContentCommerceParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    await trackRequest('/tracking/cart-events', {
      event: params.event,
      productId: params.productId || null,
      userId: params.userId || null,
      sessionId,
      data: {
        type: 'content-commerce',
        postId: params.postId,
        postSlug: params.postSlug,
        productSlug: params.productSlug,
        displayType: params.displayType,
        positionIndex: params.positionIndex,
      },
    });

    // Also send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', params.event, {
        product_id: params.productId,
        post_id: params.postId,
        display_type: params.displayType,
        position_index: params.positionIndex,
      });
    }
  } catch (error) {
    if (isDev) {
      console.warn("Track content-commerce error:", error);
    }
  }
}
