import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (product: Product, size: string, e: React.MouseEvent) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [hovered, setHovered] = useState(false);

  const discount = product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) 
    : 0;

  // Sizes ordered logically
  const allSizes = Object.keys(product.sizes).sort((a, b) => {
    const isANum = !isNaN(Number(a));
    const isBNum = !isNaN(Number(b));
    if (isANum && isBNum) return Number(a) - Number(b);
    const order = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleSizeClick = (size: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSize(size);
  };

  // Get current stock for selected size
  const stockForSelectedSize = selectedSize ? product.sizes[selectedSize] : 0;
  
  // Total stock across all sizes
  const totalStock = Object.values(product.sizes).reduce((acc, qty) => acc + qty, 0);

  return (
    <motion.div
      id={`product-card-${product.id}`}
      className="group relative flex flex-col rounded bg-[#111] border border-white/5 p-3 hover:border-white/15 transition-all duration-300 hover:shadow-2xl hover:shadow-[#d4af37]/5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      
      {/* Photo Showcase Container */}
      <div className="relative aspect-square w-full rounded overflow-hidden bg-zinc-950 group">
        
        {/* Images */}
        <img
          src={product.images[currentImageIndex]}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Hot / Discount Tags */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-black bg-gradient-to-r from-pink-500 to-yellow-500 rounded-sm shadow-lg">
              <Flame className="h-3 w-3 animate-pulse" />
              {discount}% OFF
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center px-2.5 py-1 text-[9px] font-mono tracking-wider text-[#d4af37] bg-black/90 border border-[#d4af37]/30 rounded-sm">
              DESTAQUE
            </span>
          )}
        </div>

        {/* Real-time Stock status tag (Sleek Interface) */}
        <div className="absolute top-3 right-3 z-10">
          {totalStock > 0 && totalStock <= 3 ? (
            <span className="bg-red-950/80 px-2.5 py-1 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest text-red-400 border border-red-500/30">
              pouco estoque
            </span>
          ) : totalStock > 0 ? (
            <span className="bg-black/85 px-2.5 py-1 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest text-[#d4af37] border border-[#d4af37]/30">
              estoque: {totalStock}
            </span>
          ) : null}
        </div>

        {/* Real-time Out of Stock Badge */}
        {totalStock === 0 && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-xs z-10">
            <span className="px-4 py-2 border border-red-500 text-red-500 text-xs font-bold uppercase tracking-widest rounded-sm transform -rotate-12">
              Esgotado
            </span>
          </div>
        )}

        {/* Image Carousels Overlay Controls */}
        {product.images.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <button
              onClick={prevImage}
              className="p-1.5 rounded-full bg-black/80 border border-zinc-800 hover:bg-zinc-900 text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="p-1.5 rounded-full bg-black/80 border border-zinc-800 hover:bg-zinc-900 text-white transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Dots indicator for multi-photos */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {product.images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentImageIndex === i ? 'w-4 bg-[#d4af37]' : 'w-1.5 bg-zinc-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details Area */}
      <div className="mt-4 flex flex-col flex-1 px-1">
        
        {/* Category & Tags */}
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          {product.category}
        </span>

        {/* Product Title */}
        <h3 className="mt-1 font-sans text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white group-hover:line-clamp-none transition-all duration-300">
          {product.name}
        </h3>

        {/* Pricing Matrix */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-black text-white">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-zinc-500 line-through">
              R$ {product.compareAtPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Interactive Size Selector with Real-time Stock */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Tamanhos Disponíveis:
            </span>
            {selectedSize && (
              <span className={`text-[10px] font-bold ${stockForSelectedSize <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {stockForSelectedSize === 0 ? 'Sem Estoque' : `${stockForSelectedSize} restantes`}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1">
            {allSizes.map((size) => {
              const qty = product.sizes[size] || 0;
              const isAvailable = qty > 0;
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  disabled={!isAvailable}
                  onClick={(e) => handleSizeClick(size, e)}
                  className={`min-w-[34px] px-2 py-1 text-[10px] font-bold rounded-md border transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#d4af37] to-yellow-600 border-[#d4af37] text-black shadow-lg shadow-yellow-500/10'
                      : isAvailable
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
                      : 'bg-zinc-950/20 border-zinc-900 text-zinc-600 line-through cursor-not-allowed'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add to Cart Actions */}
        <div className="mt-auto pt-4">
          <button
            disabled={totalStock === 0 || !selectedSize}
            onClick={(e) => {
              if (selectedSize) {
                onAddToCart(product, selectedSize, e);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-sm text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              totalStock === 0
                ? 'bg-[#111] text-zinc-600 border border-white/5 cursor-not-allowed'
                : !selectedSize
                ? 'bg-black/40 text-[#d4af37]/80 border border-[#d4af37]/30 cursor-default hover:bg-[#111] hover:text-[#d4af37]'
                : 'bg-[#d4af37] text-black hover:bg-yellow-500 shadow-lg hover:shadow-yellow-500/15 cursor-pointer active:scale-98'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            {!selectedSize 
              ? 'Selecione o Tamanho' 
              : `Adicionar ao Carrinho`
            }
          </button>
        </div>

      </div>

    </motion.div>
  );
}
