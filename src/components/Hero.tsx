import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HeroBanner } from '../types';

interface HeroProps {
  customBanners?: HeroBanner[];
}

const FALLBACK_BANNERS: HeroBanner[] = [
  {
    id: 'slide-1',
    imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=1200',
    title: 'SNEAKERS PREMIUM EXCLUSIVOS',
    subtitle: 'Os calçados mais cobiçados das maiores marcas globais com estoque limitado e garantia de originalidade.',
    link: '#produtos'
  },
  {
    id: 'slide-2',
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=1200',
    title: 'STREETWEAR HIGH FASHION',
    subtitle: 'Eleve o nível do seu outfit diário com moletons pesados, camisetas de grife e calças cargo utilitárias.',
    link: '#produtos'
  },
  {
    id: 'slide-3',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200',
    title: 'ACESSÓRIOS METALLIC GOLD',
    subtitle: 'Bonés, correntes de prata e itens exclusivos para completar sua identidade com sofisticação.',
    link: '#produtos'
  },
  {
    id: 'slide-4',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200',
    title: 'DROPS E LANÇAMENTOS LIMITADOS',
    subtitle: 'Acesso antecipado aos calçados e coleções raras importadas de alto padrão.',
    link: '#produtos'
  },
  {
    id: 'slide-5',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1200',
    title: 'A MAIOR DO STREETWEAR BRASILEIRO',
    subtitle: 'Navegue pelo maior catálogo multimarcas selecionado a dedo para quem entende de estilo.',
    link: '#produtos'
  },
  {
    id: 'slide-6',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1200',
    title: 'ESTILO EXCLUSIVO MK MULTIMARCAS',
    subtitle: 'Sinônimo de sofisticação e atitude. Parcelamento flexível e envio rápido para todo o país.',
    link: '#produtos'
  }
];

export default function Hero({ customBanners }: HeroProps) {
  const banners = customBanners && customBanners.length >= 2 ? customBanners : FALLBACK_BANNERS;
  
  // Make sure we have at least 6 slides by merging if necessary
  const finalBanners = banners.length >= 6 ? banners : [
    ...banners,
    ...FALLBACK_BANNERS.slice(0, 6 - banners.length)
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slideshow interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % finalBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [finalBanners.length]);

  const scrollToShop = () => {
    const el = document.getElementById('catalogo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero-slideshow" className="relative h-[85vh] w-full bg-zinc-950 overflow-hidden">
      
      {/* Background slide images with AnimatePresence for cross-fade transitions */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* Image background with dark overlay gradient */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-100 transition-transform duration-10000"
              style={{ backgroundImage: `url(${finalBanners[currentIndex].imageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-zinc-950/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/20" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Sparkle Elements / Neon glow filter */}
      <div className="absolute top-1/4 left-10 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-10 h-72 w-72 rounded-full bg-yellow-500/5 blur-3xl" />

      {/* Slide Text Content Container */}
      <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-3xl space-y-6">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-[#d4af37]/30 text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">
                <Sparkles className="h-3 w-3 animate-spin text-[#d4af37]" />
                Premium Experience
              </div>

              <h2 className="font-sans text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
                {finalBanners[currentIndex].title.split(' ').map((word, i) => (
                  <span 
                    key={i} 
                    className={word.toLowerCase().includes('premium') || word.toLowerCase().includes('gold') || word.toLowerCase().includes('exclusivo') || word.toLowerCase().includes('luxo')
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-yellow-400 to-yellow-600 block sm:inline mr-2'
                      : 'block sm:inline mr-2'
                    }
                  >
                    {word}
                  </span>
                ))}
              </h2>

              <p className="text-zinc-300 text-sm sm:text-lg max-w-2xl font-light leading-relaxed">
                {finalBanners[currentIndex].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={scrollToShop}
              className="group flex items-center gap-2 bg-gradient-to-r from-[#d4af37] to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full shadow-lg shadow-yellow-600/20 active:scale-95 transition-all duration-300"
            >
              Ver Catálogo
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </button>
            
            <button
              onClick={scrollToShop}
              className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-semibold uppercase tracking-wider px-8 py-4 rounded-full active:scale-95 transition-all duration-300"
            >
              Coleção Nova
            </button>
          </div>

        </div>
      </div>

      {/* Manual Slide Dot Indicators */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-3 z-30">
        {finalBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2.5 rounded-full transition-all duration-500 ${
              currentIndex === index 
                ? 'w-8 bg-gradient-to-r from-[#d4af37] to-yellow-500 shadow-md shadow-yellow-500/50' 
                : 'w-2.5 bg-zinc-700 hover:bg-zinc-500'
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Curvatura Sutil ou Divisor de Seção inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
