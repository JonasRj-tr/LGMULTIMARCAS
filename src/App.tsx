import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, 
  Facebook, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  SlidersHorizontal,
  X,
  Search
} from 'lucide-react';

import Header from './components/Header';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import CartModal from './components/CartModal';
import AdminDashboard from './components/AdminDashboard';
import SplashIntro from './components/SplashIntro';

import { Product, CartItem, Order, Coupon, StoreSettings } from './types';
import { dbService } from './services/db';
import { auth, isFirebaseEnabled } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const REALTIME_ACTIVITIES = [
  { item: "Yeezy Boost 350 V2", user: "Marcos S.", city: "São Paulo - SP", icon: "🔥" },
  { item: "Corta-Vento Trapstar", user: "Julia M.", city: "Rio de Janeiro - RJ", icon: "✨" },
  { item: "Air Jordan 1 Travis Scott", user: "Pedro H.", city: "Belo Horizonte - MG", icon: "👟" },
  { item: "Moletom Balenciaga", user: "Ana Clara", city: "Curitiba - PR", icon: "💫" },
  { item: "Óculos Oakley Juliet", user: "Thiago F.", city: "Campinas - SP", icon: "🕶️" },
  { item: "Bone New Era NY", user: "Gustavo R.", city: "Porto Alegre - RS", icon: "🧢" }
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  // CORE APP STATES
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    whatsappNumber: '5511999999999',
    instagramUrl: 'https://www.instagram.com/lg_multimarcas_ofc/',
    facebookUrl: 'https://facebook.com/lgmultimarcas',
    defaultShippingCost: 18.00,
    freeShippingThreshold: 250.00,
    banners: []
  });

  // FILTER & SEARCH STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // MODALS TOGGLE
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // NOTIFICATION TOASTS
  const [toasts, setToasts] = useState<Toast[]>([]);

  // FLY-TO-CART ANIMATION STATE
  const [flyingItem, setFlyingItem] = useState<{ x: number; y: number; imageUrl: string } | null>(null);

  // SPLASH INTRO SCREEN STATE
  const [splashActive, setSplashActive] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setSplashActive(false);
  }, []);

  // REAL-TIME ACTIVITY LOOP STATE
  const [activityIndex, setActivityIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % REALTIME_ACTIVITIES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Show customized toasts
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = 'toast-' + Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // REAL-TIME FIRESTORE/LOCAL LISTENERS SYNC
  useEffect(() => {
    const unsubProducts = dbService.getProducts((prods) => {
      setProducts(prods);
      setProductsLoading(false);
    });
    const unsubCoupons = dbService.getCoupons((cps) => setCoupons(cps));
    const unsubSettings = dbService.getSettings((sett) => setStoreSettings(sett));

    let unsubOrders: (() => void) | null = null;

    if (isFirebaseEnabled()) {
      // For Firebase, only subscribe to orders when the user is authenticated (Admin)
      const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          if (unsubOrders) unsubOrders();
          unsubOrders = dbService.getOrders((ords) => setOrders(ords));
        } else {
          if (unsubOrders) {
            unsubOrders();
            unsubOrders = null;
          }
          setOrders([]);
        }
      });

      return () => {
        if (unsubProducts) unsubProducts();
        if (unsubCoupons) unsubCoupons();
        if (unsubSettings) unsubSettings();
        if (unsubOrders) unsubOrders();
        unsubAuth();
      };
    } else {
      // Local fallback
      unsubOrders = dbService.getOrders((ords) => setOrders(ords));

      return () => {
        if (unsubProducts) unsubProducts();
        if (unsubCoupons) unsubCoupons();
        if (unsubSettings) unsubSettings();
        if (unsubOrders) unsubOrders();
      };
    }
  }, []);

  // ADD TO CART ACTION (WITH 3D FLYING BUBBLE PHYSICS)
  const handleAddToCart = (product: Product, size: string, e: React.MouseEvent) => {
    const currentStock = product.sizes[size] || 0;
    const existing = cart.find(
      (item) => item.product.id === product.id && item.selectedSize === size
    );
    const alreadyInCart = existing ? existing.quantity : 0;

    if (currentStock <= alreadyInCart) {
      showToast(`Desculpe, o estoque para tamanho ${size} foi esgotado.`, 'error');
      return;
    }

    // Capture click coordinate for fly-to-cart animation
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyingItem({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      imageUrl: product.images[0],
    });

    // Clear flying animation after 800ms
    setTimeout(() => {
      setFlyingItem(null);
    }, 850);

    // Update cart items
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id && item.selectedSize === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, selectedSize: size, quantity: 1 }]);
    }

    showToast(`Adicionado: ${product.name} (Tamanho ${size})`, 'success');
  };

  const handleUpdateQuantity = (productId: string, size: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId && item.selectedSize === size) {
            const nextQty = item.quantity + delta;
            const maxStock = item.product.sizes[size] || 0;
            if (nextQty <= 0) return null;
            if (nextQty > maxStock) {
              showToast(`Estoque máximo atingido para o tamanho ${size}.`, 'error');
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string, size: string) => {
    setCart(cart.filter((item) => !(item.product.id === productId && item.selectedSize === size)));
    showToast('Produto removido do carrinho.', 'success');
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // CATEGORY & SEARCH FILTERS ENGINE
  const filteredProducts = products.filter((prod) => {
    const matchesCat = selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#d4af37]/30 selection:text-[#d4af37]">
      
      {/* Real-time Header */}
      <Header
        cart={cart}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        logoUrl={storeSettings.logoUrl}
      />

      {/* Hero Slideshow Section */}
      <Hero customBanners={storeSettings.banners} />

      {/* Main Shopping Catalogue Container */}
      <main id="catalogo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-mono tracking-widest uppercase mb-1">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Coleção de Luxo Streetwear
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              {selectedCategory === 'all' ? 'TODOS OS PRODUTOS' : selectedCategory.toUpperCase()}
            </h2>
          </div>

          <p className="text-xs text-zinc-500 font-mono">
            Mostrando {filteredProducts.length} de {products.length} itens premium
          </p>
        </div>

        {/* Catalog grid layout */}
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div 
                key={num} 
                className="flex flex-col rounded bg-[#111] border border-white/5 p-3 space-y-4 animate-pulse"
              >
                <div className="aspect-square w-full rounded bg-zinc-900/60" />
                <div className="space-y-2.5">
                  <div className="h-3.5 bg-zinc-900 rounded w-5/6" />
                  <div className="h-2.5 bg-zinc-900 rounded w-1/2" />
                  <div className="h-6 bg-zinc-900 rounded w-1/4 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center space-y-4 rounded bg-[#111] border border-white/5 p-8">
            <SlidersHorizontal className="h-10 w-10 text-zinc-600 mx-auto animate-bounce" />
            <h3 className="text-zinc-200 font-bold uppercase tracking-widest">Nenhum produto correspondente</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Experimente alterar sua busca ou selecionar outra categoria premium no topo.
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-6 py-2.5 rounded-sm bg-white text-black text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}

        {/* Benefits Grid Banner (Trust Elements) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/10">
          <div className="p-6 bg-[#111]/80 border border-white/5 rounded flex gap-4">
            <div className="p-3 bg-[#d4af37]/10 text-[#d4af37] rounded h-fit">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Originalidade Garantida</h4>
              <p className="text-xs text-zinc-500 mt-1">Trabalhamos exclusivamente com drops de grifes nacionais e importados de procedência atestada.</p>
            </div>
          </div>

          <div className="p-6 bg-[#111]/80 border border-white/5 rounded flex gap-4">
            <div className="p-3 bg-[#d4af37]/10 text-[#d4af37] rounded h-fit">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Envio Seguro e Rápido</h4>
              <p className="text-xs text-zinc-500 mt-1">Embalagens blindadas exclusivas e frete grátis nacional para compras qualificadas.</p>
            </div>
          </div>

          <div className="p-6 bg-[#111]/80 border border-white/5 rounded flex gap-4">
            <div className="p-3 bg-[#d4af37]/10 text-[#d4af37] rounded h-fit">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Suporte Premium 24/7</h4>
              <p className="text-xs text-zinc-500 mt-1">Dúvidas sobre tamanhos ou envio? Fale diretamente com nossa assessoria via WhatsApp.</p>
            </div>
          </div>
        </div>

      </main>

      {/* Elegant Footer */}
      <footer className="bg-black/40 border-t border-white/10 py-16 text-zinc-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Column 1: Brand details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black p-[2px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-yellow-400 opacity-90" />
                <div className="absolute inset-[2px] rounded-full bg-black flex items-center justify-center">
                  <span className="font-sans text-base font-black text-[#d4af37]">LG</span>
                </div>
              </div>
              <h3 className="font-sans text-sm font-black tracking-widest text-white">LG <span className="text-[#d4af37]">MULTIMARCAS</span></h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xs font-light">
              Sua boutique premium online de calçados importados raras, roupas de grife de alta costura e acessórios de luxo urbano. Autenticidade, rapidez e atendimento exclusivo.
            </p>
          </div>

          {/* Column 2: Social media icons and contact info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Nossas Redes Sociais</h4>
            <div className="flex gap-3">
              <a 
                href={storeSettings.instagramUrl} 
                target="_blank" 
                rel="noreferrer"
                className="p-3 rounded bg-white/5 border border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/30 transition-all cursor-pointer"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href={storeSettings.facebookUrl} 
                target="_blank" 
                rel="noreferrer"
                className="p-3 rounded bg-white/5 border border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/30 transition-all cursor-pointer"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href={`https://wa.me/${storeSettings.whatsappNumber.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="p-3 rounded bg-white/5 border border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/30 transition-all cursor-pointer"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">LG Multimarcas CNPJ: 00.000.000/0001-00. © 2026</p>
          </div>

          {/* Column 3: Contacts */}
          <div className="space-y-4 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Atendimento e Localização</h4>
            <div className="space-y-2.5 text-zinc-500 font-light">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#d4af37]" />
                WhatsApp: +{storeSettings.whatsappNumber}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#d4af37]" />
                São Paulo - SP, Brasil (Envios Rápidos)
              </p>
            </div>
            <div className="pt-2">
              {/* Backoffice trigger */}
              <button
                onClick={() => setAdminOpen(true)}
                className="text-[10px] font-mono tracking-widest uppercase hover:text-[#d4af37] underline transition-colors cursor-pointer"
              >
                Gerenciamento / Acesso Administrativo
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* Bottom Bar & Real-time Feeds (Sleek Interface Layout) */}
      <footer className="h-12 bg-black border-t border-white/10 flex items-center justify-between px-6 sm:px-8 text-[9px] uppercase tracking-widest font-mono text-zinc-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-zinc-400">LIVE: 247 ACTIVE USERS</span>
          </div>
          <div className="h-3 w-px bg-white/20 hidden sm:block"></div>
          <span className="text-zinc-400 hidden sm:inline">FRETE GRÁTIS ACIMA DE R$ {storeSettings.freeShippingThreshold.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="text-zinc-400 italic">SIGA-NOS NO INSTAGRAM</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></div>
           </div>
        </div>
      </footer>

      {/* Cart Drawer Modal */}
      <CartModal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        storeSettings={storeSettings}
        coupons={coupons}
        showToast={showToast}
      />

      {/* Admin dashboard fullscreen overlay */}
      {adminOpen && (
        <AdminDashboard
          products={products}
          orders={orders}
          coupons={coupons}
          storeSettings={storeSettings}
          showToast={showToast}
          onClose={() => setAdminOpen(false)}
        />
      )}

      {/* Floating Dynamic Activity Notification (Sleek Interface) */}
      <div className="fixed bottom-16 left-6 z-30 hidden md:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={activityIndex}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="bg-black/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-sm flex items-center gap-3 shadow-2xl"
          >
            <div className="w-6 h-6 rounded-sm bg-gradient-to-tr from-pink-500 via-purple-600 to-yellow-500 flex items-center justify-center text-xs">
              {REALTIME_ACTIVITIES[activityIndex].icon}
            </div>
            <div className="text-[10px] leading-tight font-mono">
              <span className="text-zinc-500 block uppercase font-bold text-[8px] tracking-widest">Recent Activity</span>
              <span className="text-white font-bold uppercase tracking-tight">
                {REALTIME_ACTIVITIES[activityIndex].user} comprou {REALTIME_ACTIVITIES[activityIndex].item} em {REALTIME_ACTIVITIES[activityIndex].city}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3D FLY-TO-CART ANIMATION FLOATER BUBBLE */}
      {flyingItem && (
        <div 
          style={{
            position: 'fixed',
            left: flyingItem.x,
            top: flyingItem.y,
            zIndex: 9999,
            pointerEvents: 'none'
          }}
          className="animate-fly-to-cart h-10 w-10 rounded-full border border-[#d4af37] overflow-hidden shadow-2xl bg-black"
        >
          <img 
            src={flyingItem.imageUrl} 
            alt="Item voando" 
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover" 
          />
        </div>
      )}

      {/* FLOATING ACTION BUTTONS (OFFICIAL INSTAGRAM & WHATSAPP) */}
      <div className="fixed bottom-24 right-5 z-40 flex flex-col gap-3">
        {/* Instagram Float Button */}
        <motion.a
          href={storeSettings.instagramUrl}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg shadow-purple-950/20 hover:shadow-purple-500/30 transition-all cursor-pointer"
          title="Instagram"
        >
          <Instagram className="h-5 w-5 text-white" />
          {/* Tooltip */}
          <span className="absolute right-14 scale-0 group-hover:scale-100 transition-all duration-200 origin-right bg-zinc-950 border border-white/10 text-[9px] font-mono uppercase tracking-widest text-[#d4af37] py-1.5 px-3 rounded whitespace-nowrap shadow-xl">
            Instagram Oficial
          </span>
        </motion.a>

        {/* WhatsApp Float Button */}
        <motion.a
          href={`https://wa.me/${storeSettings.whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-950/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
          title="WhatsApp"
        >
          {/* Official WhatsApp SVG Icon */}
          <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.023-5.091-2.884-6.957C16.59 1.952 14.129.93 11.517.93c-5.44 0-9.866 4.414-9.87 9.831-.001 1.83.479 3.619 1.391 5.183l-.971 3.547 3.65-.958zm12.355-6.388c-.282-.141-1.67-.824-1.928-.918-.258-.094-.446-.141-.634.141-.188.281-.727.918-.891 1.103-.164.185-.328.206-.61.066-.282-.141-1.191-.439-2.27-1.401-.84-.749-1.407-1.673-1.572-1.955-.164-.282-.018-.434.123-.574.127-.127.282-.329.424-.494.141-.164.188-.282.282-.47.094-.188.047-.353-.024-.494-.071-.141-.634-1.528-.868-2.091-.228-.548-.48-.474-.634-.482-.153-.008-.328-.009-.504-.009-.176 0-.462.066-.704.329-.242.263-.925.903-.925 2.201s.945 2.551 1.077 2.727c.132.176 1.86 2.839 4.505 3.98.63.272 1.12.434 1.503.555.633.201 1.21.172 1.666.104.507-.076 1.67-.682 1.905-1.341.235-.658.235-1.222.164-1.341-.07-.118-.258-.185-.54-.326z" />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-14 scale-0 group-hover:scale-100 transition-all duration-200 origin-right bg-zinc-950 border border-white/10 text-[9px] font-mono uppercase tracking-widest text-emerald-400 py-1.5 px-3 rounded whitespace-nowrap shadow-xl">
            Suporte WhatsApp
          </span>
        </motion.a>
      </div>

      {/* GLOWING TOAST NOTIFICATIONS FLOATING LIST */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`p-4 rounded-sm shadow-lg text-[10px] font-bold uppercase tracking-widest border pointer-events-auto min-w-[280px] ${
                toast.type === 'success'
                  ? 'bg-[#111] border-emerald-500/30 text-white shadow-emerald-950/10'
                  : 'bg-[#111] border-red-500/30 text-red-500 shadow-red-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
                {toast.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* LUXURY STREETWEAR SPLASH INTRO ENTRY SCREEN */}
      <AnimatePresence mode="wait">
        {splashActive && (
          <motion.div
            key="splash-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999]"
          >
            <SplashIntro 
              logoUrl={storeSettings.logoUrl} 
              onComplete={handleSplashComplete} 
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
