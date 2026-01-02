'use client';

import { useEffect, useState } from 'react';
import HeroSection from './HeroSection';
import FeaturedProducts from './FeaturedProducts';
import NewArrivals from './NewArrivals';
import CategoriesSection from './CategoriesSection';
import PromotionBanner from './PromotionBanner';
import TextBlock from './TextBlock';
import Newsletter from './Newsletter';

interface PageSection {
  id: number;
  code: string;
  name: string;
  isVisible: boolean;
  order: number;
  content: Record<string, unknown> | null;
}

export default function DynamicSections() {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${baseUrl}/page-sections`);
        const data = await res.json();
        if (data.success) {
          // Only show visible sections, sorted by order
          const visibleSections = data.data
            .filter((s: PageSection) => s.isVisible)
            .sort((a: PageSection, b: PageSection) => a.order - b.order);
          console.log('[DynamicSections] Loaded sections:', visibleSections.map((s: PageSection) => s.code));
          setSections(visibleSections);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, []);

  const renderSection = (section: PageSection) => {
    const content = (section.content || {}) as Record<string, unknown>;
    // Get base code: hero_1234567890 -> hero, HERO -> hero
    const rawCode = section.code.includes('_') 
      ? section.code.substring(0, section.code.lastIndexOf('_'))
      : section.code;
    const code = rawCode.toLowerCase();

    console.log('[DynamicSections] Rendering section:', section.code, '-> base code:', code);

    switch (code) {
      case 'hero':
        return <HeroSection key={section.id} content={content} />;
      case 'featured':
        return <FeaturedProducts key={section.id} content={content} />;
      case 'new':
        return <NewArrivals key={section.id} content={content} />;
      case 'categories':
        return <CategoriesSection key={section.id} content={content} />;
      case 'promotion':
        return <PromotionBanner key={section.id} content={content} />;
      case 'text':
        return <TextBlock key={section.id} content={content} />;
      case 'newsletter':
        return <Newsletter key={section.id} content={content} />;
      default:
        console.warn('[DynamicSections] Unknown section code:', code);
        return null;
    }
  };

  // Show default content while loading or if no sections configured
  if (loading) {
    return <DefaultHomePage />;
  }

  if (sections.length === 0) {
    return <DefaultHomePage />;
  }

  return (
    <div className="pb-12 md:pb-20">
      {sections.map(renderSection)}
    </div>
  );
}

// Default homepage when no sections are configured
function DefaultHomePage() {
  return (
    <div className="pb-12 md:pb-20">
      <HeroSection content={{
        title: 'Vẻ đẹp Quyến rũ',
        subtitle: 'Khám phá những thiết kế nội y tinh tế, chất liệu cao cấp',
        buttonText: 'Khám phá ngay',
        buttonLink: '/san-pham',
      }} />
      <FeaturedProducts content={{ title: 'Sản phẩm nổi bật', limit: 8 }} />
      <CategoriesSection content={{ title: 'Danh mục sản phẩm' }} />
      <NewArrivals content={{ title: 'Hàng mới về', limit: 8 }} />
      <Newsletter content={{ title: 'Đăng ký nhận tin', subtitle: 'Nhận ưu đãi độc quyền' }} />
    </div>
  );
}
