'use client';

import { useEffect, useState } from 'react';
import RecommendationSection from '@/components/product/RecommendationSection';
import { useAuth } from '@/context/AuthContext';
import { getSessionId } from '@/lib/tracking';

interface RecommendationsHomeProps {
  content?: {
    showTrending?: boolean;
    showNewArrivals?: boolean;
    showBestSellers?: boolean;
    showPersonalized?: boolean;
    trendingLimit?: number;
    newArrivalsLimit?: number;
    bestSellersLimit?: number;
    personalizedLimit?: number;
  };
}

export default function RecommendationsHome({ content }: RecommendationsHomeProps) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const showTrending = content?.showTrending !== false;
  const showNewArrivals = content?.showNewArrivals !== false;
  const showBestSellers = content?.showBestSellers !== false;
  const showPersonalized = content?.showPersonalized !== false && !!user;

  return (
    <div className="container mx-auto px-4">
      {showTrending && (
        <RecommendationSection
          type="trending"
          sessionId={sessionId}
          limit={content?.trendingLimit || 8}
          showViewAll
        />
      )}

      {showPersonalized && user && (
        <RecommendationSection
          type="personalized"
          userId={user.id}
          sessionId={sessionId}
          limit={content?.personalizedLimit || 8}
        />
      )}

      {showNewArrivals && (
        <RecommendationSection
          type="new-arrivals"
          sessionId={sessionId}
          limit={content?.newArrivalsLimit || 8}
          showViewAll
        />
      )}

      {showBestSellers && (
        <RecommendationSection
          type="best-sellers"
          sessionId={sessionId}
          limit={content?.bestSellersLimit || 8}
          showViewAll
        />
      )}
    </div>
  );
}
