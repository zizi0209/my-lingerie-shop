'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Leaf, Package, Heart, Shield, Scissors, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { sanitizeForPublic } from "@/lib/sanitize";

interface AboutSection {
  id: number;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  order: number;
  isActive: boolean;
}

export default function AboutPage() {
  const [sections, setSections] = useState<Record<string, AboutSection>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        // Thêm timestamp để bypass cache và luôn fetch dữ liệu mới
        const timestamp = Date.now();
        const response = await api.get<{ success: boolean; data: AboutSection[] }>(
          `/about-sections?_t=${timestamp}`,
          false // không cần auth cho public endpoint
        );
        if (response.success) {
          const sectionsMap = response.data.reduce((acc, section) => {
            acc[section.sectionKey] = section;
            return acc;
          }, {} as Record<string, AboutSection>);
          setSections(sectionsMap);
        }
      } catch (error) {
        console.error('Error fetching about sections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const hero = sections.hero;
  const story = sections.story;
  const craftsmanship = sections.craftsmanship;
  const values = sections.values;
  const stats = sections.stats;
  const team = sections.team;
  const socialproof = sections.socialproof;
  const cta = sections.cta;

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* ===== PHẦN 1: HERO SECTION ===== */}
      {hero?.isActive && (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={hero.imageUrl || "https://images.unsplash.com/photo-1616002411355-49593fd89721?q=80&w=1920&auto=format&fit=crop"}
              alt={hero.title || "Lingerie Shop - Nâng niu vẻ đẹp"}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/50 to-black/70" />
          </div>

          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            {hero.subtitle && (
              <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-white/70 mb-4 md:mb-6">
                {hero.subtitle}
              </p>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light mb-6 md:mb-8 leading-tight whitespace-pre-line">
              {hero.title || "Về Chúng Tôi"}
            </h1>
            {hero.content && (
              <div 
                className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-8 md:mb-10 font-light leading-relaxed prose prose-lg dark:prose-invert prose-p:text-white/80"
                dangerouslySetInnerHTML={{ __html: sanitizeForPublic(hero.content) }}
              />
            )}
            <Link
              href="/san-pham"
              className="ck-button inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 md:px-8 md:py-4 rounded-full font-medium hover:bg-gray-100 transition group"
            >
              Khám phá bộ sưu tập
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-0.5 h-10 bg-white/50 mx-auto" />
          </div>
        </section>
      )}

      {/* ===== PHẦN 2: BRAND STORY ===== */}
      {story?.isActive && (
        <section className="py-20 md:py-28 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
              {/* Image */}
              {story.imageUrl && (
                <div className="relative">
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden">
                    <Image
                      src={story.imageUrl}
                      alt={story.title || "Câu chuyện thương hiệu"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* Decorative element */}
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-2xl -z-10" />
                </div>
              )}

              {/* Content */}
              <div>
                {story.subtitle && (
                  <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
                    {story.subtitle}
                  </p>
                )}
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6 text-gray-900 dark:text-white leading-tight whitespace-pre-line">
                  {story.title || "Câu chuyện thương hiệu"}
                </h2>
                
                {story.content && (
                  <div 
                    className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeForPublic(story.content) }}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== PHẦN 3: CRAFTSMANSHIP ===== */}
      {craftsmanship?.isActive && (
      <section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            {craftsmanship.subtitle && (
              <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
                {craftsmanship.subtitle}
              </p>
            )}
            {craftsmanship.title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6 text-gray-900 dark:text-white">
                {craftsmanship.title}
              </h2>
            )}
            {craftsmanship.content && (
              <div 
                className="text-gray-600 dark:text-gray-400 leading-relaxed prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-400"
                dangerouslySetInnerHTML={{ __html: sanitizeForPublic(craftsmanship.content) }}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
            {((craftsmanship.metadata as { items?: Array<{ icon: string; title: string; description: string }> })?.items || []).map((item, index) => {
              // Map icon string to Icon component
              const IconComponent = 
                item.icon === 'sparkles' ? Sparkles :
                item.icon === 'heart' ? Heart :
                item.icon === 'scissors' ? Scissors :
                item.icon === 'shield' ? Shield :
                Package; // fallback
              
              return (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center hover:shadow-lg transition-shadow w-full sm:w-80 md:w-64 lg:w-72"
              >
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <IconComponent className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ===== PHẦN 4: CORE VALUES ===== */}
      {values?.isActive && (
      <section className="py-20 md:py-28 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            {values.subtitle && (
              <p className="text-sm uppercase tracking-[0.2em] text-primary-400 mb-4">
                {values.subtitle}
              </p>
            )}
            {values.title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6">
                {values.title}
              </h2>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-6xl mx-auto">
            {((values.metadata as { values?: Array<{ icon: string; title: string; description: string }> })?.values || []).map((item, index) => (
              <div 
                key={index} 
                className="text-center p-8 w-full sm:w-80 md:w-64 lg:w-72"
              >
                <div className="text-5xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-medium mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ===== PHẦN 5: STATS & TEAM ===== */}
      <section className="py-20 md:py-28 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          {/* Stats */}
          {stats?.isActive && (
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-6xl mx-auto mb-20">
            {((stats.metadata as { stats?: Array<{ number: number; suffix: string; label: string; decimals?: number }> })?.stats || []).map((stat, index) => (
              <div key={index} className="text-center w-40 sm:w-48 md:w-56">
                <div className="text-3xl md:text-4xl lg:text-5xl font-light mb-2 text-gray-900 dark:text-white">
                  {stat.decimals ? stat.number.toFixed(stat.decimals) : stat.number.toLocaleString()}{stat.suffix}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          )}

          {/* Team */}
          {team?.isActive && (
          <>
          <div className="text-center mb-12">
            {team.subtitle && (
              <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
                {team.subtitle}
              </p>
            )}
            {team.title && (
              <h2 className="text-3xl md:text-4xl font-serif font-light mb-6 text-gray-900 dark:text-white">
                {team.title}
              </h2>
            )}
            {team.content && (
              <div 
                className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-400"
                dangerouslySetInnerHTML={{ __html: sanitizeForPublic(team.content) }}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-6xl mx-auto">
            {((team.metadata as { members?: Array<{ name: string; role: string; image: string }> })?.members || []).map((member, index) => (
              <div key={index} className="text-center group w-full sm:w-80 md:w-64 lg:w-72">
                <div className="relative w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
          </>
          )}
        </div>
      </section>

      {/* ===== PHẦN 6: SOCIAL PROOF ===== */}
      {socialproof?.isActive && (
      <section className="py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            {socialproof.subtitle && (
              <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
                {socialproof.subtitle}
              </p>
            )}
            {socialproof.title && (
              <h2 className="text-2xl md:text-3xl font-serif font-light text-gray-900 dark:text-white">
                {socialproof.title}
              </h2>
            )}
          </div>

          {/* Media logos */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-16 opacity-60">
            {((socialproof.metadata as { partners?: string[] })?.partners || []).map((name, index) => (
              <span 
                key={index} 
                className="text-xl md:text-2xl font-serif text-gray-400 dark:text-gray-500"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Testimonial */}
          {(socialproof.metadata as { testimonial?: { quote: string; author: string; date: string } })?.testimonial && (
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl font-serif font-light text-gray-700 dark:text-gray-300 italic mb-6">
              "{((socialproof.metadata as { testimonial?: { quote: string; author: string; date: string } })?.testimonial?.quote)}"
            </blockquote>
            <p className="text-gray-500 dark:text-gray-400">
              — <span className="font-medium">
                {((socialproof.metadata as { testimonial?: { quote: string; author: string; date: string } })?.testimonial?.author)}
              </span>, {((socialproof.metadata as { testimonial?: { quote: string; author: string; date: string } })?.testimonial?.date)}
            </p>
          </div>
          )}
        </div>
      </section>
      )}

      {/* ===== PHẦN 7: CTA ===== */}
      {cta?.isActive && (
        <section className="py-20 md:py-28 bg-gray-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6 whitespace-pre-line">
              {cta.title || "Bạn đã sẵn sàng?"}
            </h2>
            {cta.content && (
              <div 
                className="text-gray-400 max-w-xl mx-auto mb-10 prose dark:prose-invert prose-p:text-gray-400"
                dangerouslySetInnerHTML={{ __html: sanitizeForPublic(cta.content) }}
              />
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/san-pham"
                className="ck-button inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition group"
              >
                Khám phá bộ sưu tập
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition"
              >
                Tư vấn chọn Size
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
