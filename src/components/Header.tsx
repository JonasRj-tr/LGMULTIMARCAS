import React, { useState } from 'react';
import { ShoppingBag, Search, User, Menu, X } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  logoUrl?: string;
}

export default function Header({
  cart,
  onOpenCart,
  onOpenAdmin,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  logoUrl,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'Sapatos', name: 'Sapatos' },
    { id: 'Roupas', name: 'Roupas' },
    { id: 'Acessórios', name: 'Acessórios' },
  ];

  return (
    <header id="header-container" className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          
          {/* LOGO: MK dourado com imagem de logo externa */}
          <div id="app-logo" className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black p-[1px] border border-[#d4af37]/30 shadow-lg shadow-[#d4af37]/5 overflow-hidden">
              <img
                src={logoUrl === 'https://i.postimg.cc/ncDXkT6v/Chat-GPT-Image-7-de-jul-de-2026-16-19-45.png' ? 'https://i.postimg.cc/bwt2yn1j/Chat-GPT-Image-7-de-jul-de-2026-19-12-48.png' : (logoUrl || 'https://i.postimg.cc/bwt2yn1j/Chat-GPT-Image-7-de-jul-de-2026-19-12-48.png')}
                alt="Logo MK Multimarcas"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-sans text-lg font-black tracking-widest text-[#d4af37]">
                MK <span className="text-white font-light">MULTIMARCAS</span>
              </h1>
              <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Premium Concept</p>
            </div>
          </div>

          {/* Desktop Category Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 pb-1.5 ${
                  selectedCategory === cat.id
                    ? 'text-white border-b-2 border-[#d4af37]'
                    : 'text-zinc-400 hover:text-white border-b-2 border-transparent'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>

          {/* Search bar */}
          <div className="hidden lg:flex relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Buscar marcas ou produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111]/80 text-white placeholder-zinc-500 text-xs px-4 py-2.5 pl-10 rounded border border-white/10 focus:outline-none focus:border-[#d4af37] transition-all"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-zinc-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Mobile search indicator */}
            <div className="lg:hidden relative">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-28 sm:w-40 bg-[#111] text-white placeholder-zinc-600 text-[11px] px-3 py-1.5 pl-8 rounded border border-white/10 focus:outline-none focus:border-[#d4af37]"
              />
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-zinc-500" />
            </div>

            {/* Shopping Bag Button with nice bouncing state */}
            <button
              id="cart-btn"
              onClick={onOpenCart}
              className="relative p-2.5 rounded bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 hover:border-white/20 active:scale-95 group"
            >
              <ShoppingBag className="h-5 w-5 text-white group-hover:text-[#d4af37] transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[10px] font-bold text-white shadow-lg animate-bounce">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-zinc-800 bg-black/95 px-4 py-4 space-y-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-3 mb-1">Categorias</span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium uppercase tracking-widest rounded-lg transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#d4af37]/10 border-l-2 border-[#d4af37] text-[#d4af37]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
