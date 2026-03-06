'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/apiBase';

interface NewsletterVoucherConfig {
  discountValue: number;
  minOrderValue: number;
  expiryDays: number;
}

const DEFAULT_CONFIG: NewsletterVoucherConfig = {
  discountValue: 50000,
  minOrderValue: 399000,
  expiryDays: 30,
};

/**
 * Hook to fetch newsletter voucher settings from page sections
 */
export function useNewsletterVoucher() {
  const [config, setConfig] = useState<NewsletterVoucherConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/newsletter/config`);
        if (!response.ok) {
          throw new Error(`Newsletter config failed: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success && data.data?.content) {
          const content = data.data.content;
          setConfig({
            discountValue: content.discountValue ?? DEFAULT_CONFIG.discountValue,
            minOrderValue: content.minOrderValue ?? DEFAULT_CONFIG.minOrderValue,
            expiryDays: content.expiryDays ?? DEFAULT_CONFIG.expiryDays,
          });
        }
      } catch (error) {
        console.error('Failed to fetch newsletter voucher config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}
