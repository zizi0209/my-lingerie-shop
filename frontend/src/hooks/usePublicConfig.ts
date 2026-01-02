'use client';

import { useState, useEffect } from 'react';

interface PublicConfig {
  store_name?: string;
  store_logo?: string;
  primary_color?: string;
  store_description?: string;
}

/**
 * Hook to fetch public store config (no auth required)
 * Used for login page and public-facing pages
 */
export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig>({
    primary_color: '#f43f5e',
    store_name: 'Admin Panel'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${baseUrl}/public/config`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setConfig(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch public config:', error);
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}
