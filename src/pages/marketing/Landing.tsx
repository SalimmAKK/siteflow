import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import '@/styles/marketing.css';
import { Nav } from '@/components/marketing/Nav';
import { Hero } from '@/components/marketing/Hero';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { PhasesSection } from '@/components/marketing/PhasesSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { WhoItsFor } from '@/components/marketing/WhoItsFor';
import { Testimonial } from '@/components/marketing/Testimonial';
import { CTABand } from '@/components/marketing/CTABand';
import { Footer } from '@/components/marketing/Footer';

export const Landing: React.FC = () => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll('.reveal') ?? [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="marketing-page" ref={containerRef}>
      <Nav />
      <Hero />
      <ProblemSection />
      <ProductPreview />
      <PhasesSection />
      <FeaturesSection />
      <WhoItsFor />
      <Testimonial />
      <CTABand />
      <Footer />
    </div>
  );
};
