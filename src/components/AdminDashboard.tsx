import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Plus, 
  Minus,
  Trash, 
  Settings, 
  ShoppingCart, 
  Package, 
  Ticket, 
  Check, 
  X, 
  LogOut, 
  AlertTriangle, 
  DollarSign, 
  Smartphone, 
  Database,
  Lock,
  Search,
  PlusCircle,
  Clock,
  ArrowRight,
  Edit,
  Save,
  Link2
} from 'lucide-react';
import { Product, Order, Coupon, StoreSettings, CartItem, HeroBanner } from '../types';
import { dbService } from '../services/db';
import { isFirebaseEnabled, saveFirebaseConfig, auth } from '../firebase';
import { signInAnonymously, signOut } from 'firebase/auth';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  storeSettings: StoreSettings;
  showToast: (message: string, type: 'success' | 'error') => void;
  onClose: () => void;
}

type AdminTab = 'overview' | 'pos' | 'products' | 'coupons' | 'settings';

export default function AdminDashboard({
  products,
  orders,
  coupons,
  storeSettings,
  showToast,
  onClose,
}: AdminDashboardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // -------------------------------------------------------------
  // POS STATE
  // -------------------------------------------------------------
  const [posSearch, setPosSearch] = useState('');
  const [posCart, setPosCart] = useState<{ product: Product; size: string; quantity: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCouponCode, setPosCouponCode] = useState('');
  const [posAppliedCoupon, setPosAppliedCoupon] = useState<Coupon | null>(null);

  // -------------------------------------------------------------
  // PRODUCTS STATE (ADD/EDIT FORM)
  // -------------------------------------------------------------
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pCategory, setPCategory] = useState<'Sapatos' | 'Roupas' | 'Acessórios'>('Sapatos');
  const [pPrice, setPPrice] = useState('');
  const [pCompareAtPrice, setPCompareAtPrice] = useState('');
  const [pImagesText, setPImagesText] = useState('');
  const [pFeatured, setPFeatured] = useState(false);
  const [pSizes, setPSizes] = useState<{ [size: string]: string }>({}); // temporary string fields

  // Available size presets
  const SHOE_SIZES = Array.from({ length: 21 }, (_, i) => String(30 + i)); // 30 to 50
  const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'];

  // -------------------------------------------------------------
  // COUPON STATE
  // -------------------------------------------------------------
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponMin, setNewCouponMin] = useState('');

  // -------------------------------------------------------------
  // SETTINGS STATE
  // -------------------------------------------------------------
  const [sWhatsapp, setSWhatsapp] = useState(storeSettings.whatsappNumber);
  const [sInstagram, setSInstagram] = useState(storeSettings.instagramUrl);
  const [sFacebook, setSFacebook] = useState(storeSettings.facebookUrl);
  const [sShipCost, setSShipCost] = useState(String(storeSettings.defaultShippingCost));
  const [sShipThreshold, setSShipThreshold] = useState(String(storeSettings.freeShippingThreshold));
  const [sBanners, setSBanners] = useState<HeroBanner[]>([...storeSettings.banners]);
  const [sLogoUrl, setSLogoUrl] = useState(storeSettings.logoUrl || '');

  // Handle default initializers
  useEffect(() => {
    setSWhatsapp(storeSettings.whatsappNumber);
    setSInstagram(storeSettings.instagramUrl);
    setSFacebook(storeSettings.facebookUrl);
    setSShipCost(String(storeSettings.defaultShippingCost));
    setSShipThreshold(String(storeSettings.freeShippingThreshold));
    setSBanners([...storeSettings.banners]);
    setSLogoUrl(storeSettings.logoUrl || '');
  }, [storeSettings]);

  // Auto-login on mount if already authenticated in Firebase
  useEffect(() => {
    if (isFirebaseEnabled() && auth?.currentUser) {
      setIsLoggedIn(true);
    }
  }, []);

  // LOGIN VALIDATOR
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() === 'lgmultimarcas@x.com' && password === 'lgmultimarcas4321') {
      if (isFirebaseEnabled()) {
        try {
          await signInAnonymously(auth);
          setIsLoggedIn(true);
          showToast('Bem-vindo ao Painel LG Multimarcas (Firebase Autenticado)!', 'success');
        } catch (err: any) {
          console.error("Firebase auth login error:", err);
          showToast('Falha ao conectar com o Firebase Auth. Entrando em modo leitura local...', 'error');
          setIsLoggedIn(true);
        }
      } else {
        setIsLoggedIn(true);
        showToast('Bem-vindo ao Painel LG Multimarcas (Modo Local)!', 'success');
      }
    } else {
      showToast('E-mail ou senha administrativa incorretos.', 'error');
    }
  };

  const handleLogout = async () => {
    if (isFirebaseEnabled()) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Firebase auth logout error:", err);
      }
    }
    setIsLoggedIn(false);
    showToast('Sessão encerrada com sucesso.', 'success');
  };

  // -------------------------------------------------------------
  // METRICS & STATS
  // -------------------------------------------------------------
  const totalRevenue = orders
    .filter(o => o.status === 'Aprovado' || o.status === 'Enviado')
    .reduce((acc, o) => acc + o.total, 0);

  const pendingOrders = orders.filter(o => o.status === 'Pendente');
  
  // Find low stock products (where any active size stock is <= 2 and totalStock > 0, or size stock is low)
  const lowStockItems = products.filter(p => {
    return Object.entries(p.sizes).some(([_, qty]) => qty > 0 && qty <= 2);
  });

  // Calculate monthly sales for custom chart (grouped by last 7 days for precision)
  const getSalesTimelineData = () => {
    const dailyMap: { [dateStr: string]: number } = {};
    // Last 7 days labels
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyMap[label] = 0;
    }

    orders
      .filter(o => o.status === 'Aprovado' || o.status === 'Enviado')
      .forEach(o => {
        const orderDate = new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (dailyMap[orderDate] !== undefined) {
          dailyMap[orderDate] += o.total;
        }
      });

    return Object.entries(dailyMap).map(([day, val]) => ({ day, value: val }));
  };

  const chartData = getSalesTimelineData();
  const maxChartValue = Math.max(...chartData.map(d => d.value), 500);

  // -------------------------------------------------------------
  // POS IMPLEMENTATION
  // -------------------------------------------------------------
  const handleAddToPosCart = (product: Product, size: string) => {
    const currentStock = product.sizes[size] || 0;
    const existing = posCart.find(item => item.product.id === product.id && item.size === size);
    const alreadyInCartQty = existing ? existing.quantity : 0;

    if (currentStock <= alreadyInCartQty) {
      showToast(`Estoque esgotado para o tamanho ${size}.`, 'error');
      return;
    }

    if (existing) {
      setPosCart(posCart.map(item => 
        item.product.id === product.id && item.size === size
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setPosCart([...posCart, { product, size, quantity: 1 }]);
    }
    showToast('Adicionado ao PDV!', 'success');
  };

  const handleUpdatePosQty = (prodId: string, size: string, delta: number) => {
    setPosCart(posCart.map(item => {
      if (item.product.id === prodId && item.size === size) {
        const nextQty = item.quantity + delta;
        const currentStock = item.product.sizes[size] || 0;
        if (nextQty <= 0) return null;
        if (nextQty > currentStock) {
          showToast(`Estoque máximo atingido.`, 'error');
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean) as typeof posCart);
  };

  const handlePosApplyCoupon = () => {
    const found = coupons.find(c => c.code.toUpperCase() === posCouponCode.trim().toUpperCase() && c.active);
    if (!found) {
      showToast('Cupom inválido.', 'error');
      return;
    }
    setPosAppliedCoupon(found);
    showToast('Cupom aplicado ao PDV!', 'success');
  };

  const handlePosCheckoutSubmit = async () => {
    if (posCart.length === 0) return;
    if (!posCustomerName.trim()) {
      showToast('Insira o nome do cliente no PDV.', 'error');
      return;
    }

    try {
      const sub = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const disc = posAppliedCoupon 
        ? (posAppliedCoupon.type === 'percentage' ? (sub * (posAppliedCoupon.value / 100)) : posAppliedCoupon.value)
        : 0;
      const totalVal = Math.max(0, sub - disc);

      const items = posCart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        image: item.product.images[0],
        size: item.size,
        quantity: item.quantity,
        price: item.product.price
      }));

      // Direct write order with Approved status representing immediate POS cash register sale
      await dbService.addOrder({
        customerName: `${posCustomerName} (PDV)`,
        customerPhone: posCustomerPhone || 'Não Informado',
        items,
        subtotal: sub,
        discount: disc,
        shipping: 0,
        total: totalVal,
        status: 'Aprovado',
        type: 'PDV',
        couponCode: posAppliedCoupon?.code
      });

      showToast('Venda registrada no PDV com sucesso!', 'success');
      
      // Clear POS state
      setPosCart([]);
      setPosCustomerName('');
      setPosCustomerPhone('');
      setPosCouponCode('');
      setPosAppliedCoupon(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao emitir venda PDV.', 'error');
    }
  };

  // -------------------------------------------------------------
  // PRODUCT CRUD METHODS
  // -------------------------------------------------------------
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPDescription('');
    setPCategory('Sapatos');
    setPPrice('');
    setPCompareAtPrice('');
    setPImagesText('');
    setPFeatured(false);
    
    // reset sizes map
    setPSizes({});
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPDescription(prod.description);
    setPCategory(prod.category);
    setPPrice(String(prod.price));
    setPCompareAtPrice(prod.compareAtPrice ? String(prod.compareAtPrice) : '');
    setPImagesText(prod.images.join('\n'));
    setPFeatured(prod.isFeatured);
    
    // Map existing sizes
    const sizeMap: { [s: string]: string } = {};
    Object.entries(prod.sizes).forEach(([size, qty]) => {
      sizeMap[size] = String(qty);
    });
    setPSizes(sizeMap);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice || !pImagesText) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    // Format sizes object
    const finalSizes: { [size: string]: number } = {};
    const sizeKeys = pCategory === 'Sapatos' ? SHOE_SIZES : CLOTHING_SIZES;
    
    sizeKeys.forEach(size => {
      const qtyStr = pSizes[size] || '';
      const qtyNum = parseInt(qtyStr, 10);
      if (!isNaN(qtyNum) && qtyNum >= 0) {
        finalSizes[size] = qtyNum;
      }
    });

    // Parse image URLs
    const images = pImagesText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 1);

    const productPayload = {
      name: pName,
      description: pDescription,
      category: pCategory,
      price: parseFloat(pPrice),
      compareAtPrice: pCompareAtPrice ? parseFloat(pCompareAtPrice) : undefined,
      images,
      sizes: finalSizes,
      isFeatured: pFeatured,
    };

    try {
      if (editingProduct) {
        await dbService.updateProduct(editingProduct.id, productPayload);
        showToast('Produto atualizado!', 'success');
      } else {
        await dbService.addProduct(productPayload);
        showToast('Produto adicionado ao catálogo!', 'success');
      }
      setEditingProduct(null);
      handleOpenAddProduct();
    } catch (err: any) {
      showToast('Erro ao salvar produto.', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      try {
        await dbService.deleteProduct(id);
        showToast('Produto removido do catálogo.', 'success');
      } catch (err) {
        showToast('Erro ao excluir produto.', 'error');
      }
    }
  };

  // -------------------------------------------------------------
  // COUPON METHODS
  // -------------------------------------------------------------
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue) {
      showToast('Preencha os dados do cupom.', 'error');
      return;
    }

    try {
      await dbService.addCoupon({
        code: newCouponCode.toUpperCase().trim(),
        type: newCouponType,
        value: parseFloat(newCouponValue),
        active: true,
        minPurchase: newCouponMin ? parseFloat(newCouponMin) : undefined
      });
      showToast(`Cupom ${newCouponCode.toUpperCase()} criado!`, 'success');
      setNewCouponCode('');
      setNewCouponValue('');
      setNewCouponMin('');
    } catch (err) {
      showToast('Erro ao salvar cupom.', 'error');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      await dbService.updateCoupon(coupon.id, { active: !coupon.active });
      showToast('Estado do cupom alterado.', 'success');
    } catch (err) {
      showToast('Erro ao atualizar cupom.', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await dbService.deleteCoupon(id);
      showToast('Cupom removido.', 'success');
    } catch (err) {
      showToast('Erro ao remover cupom.', 'error');
    }
  };

  // -------------------------------------------------------------
  // SETTINGS METHODS
  // -------------------------------------------------------------
  const handleSaveSettings = async () => {
    try {
      await dbService.updateSettings({
        whatsappNumber: sWhatsapp,
        instagramUrl: sInstagram,
        facebookUrl: sFacebook,
        defaultShippingCost: parseFloat(sShipCost) || 0,
        freeShippingThreshold: parseFloat(sShipThreshold) || 0,
        banners: sBanners,
        logoUrl: sLogoUrl
      });
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar configurações.', 'error');
    }
  };

  const handleUpdateBannerUrl = (id: string, val: string) => {
    setSBanners(sBanners.map(b => b.id === id ? { ...b, imageUrl: val } : b));
  };
  const handleUpdateBannerTitle = (id: string, val: string) => {
    setSBanners(sBanners.map(b => b.id === id ? { ...b, title: val } : b));
  };
  const handleUpdateBannerSub = (id: string, val: string) => {
    setSBanners(sBanners.map(b => b.id === id ? { ...b, subtitle: val } : b));
  };

  // -------------------------------------------------------------
  // SUB-VIEW: LOGIN VIEW
  // -------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl bg-zinc-900/60 border border-zinc-800 p-8 space-y-6 shadow-2xl relative"
        >
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-black p-[2.5px] border border-zinc-800">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-yellow-400" />
              <div className="absolute inset-[2.5px] rounded-full bg-black flex items-center justify-center">
                <span className="font-sans text-3xl font-black text-[#d4af37]">LG</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-10">
            <h2 className="text-xl font-extrabold tracking-widest text-[#d4af37]">LG MULTIMARCAS</h2>
            <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase mt-1">Área Administrativa Protegida</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">E-mail de Acesso</label>
              <input
                type="email"
                required
                placeholder="lgmultimarcas@x.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black text-white text-xs px-4 py-3 rounded-xl border border-zinc-800 focus:border-[#d4af37] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Senha Secreta</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black text-white text-xs px-4 py-3 rounded-xl border border-zinc-800 focus:border-[#d4af37] outline-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-wider text-black bg-[#d4af37] hover:bg-yellow-500 rounded-xl transition-all shadow-lg shadow-yellow-600/10 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                Acessar
              </button>
            </div>
          </form>

          <p className="text-[10px] text-zinc-600 text-center font-mono select-none">
            Utilize as credenciais homologadas informadas pelo solicitante.
          </p>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PRIMARY DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 flex flex-col">
        {/* Profile */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#d4af37] to-yellow-600 flex items-center justify-center font-black text-black">
              LG
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#d4af37] uppercase tracking-wider">LG Admin</h4>
              <p className="text-[9px] font-mono text-zinc-500">lgmultimarcas@x.com</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Encerrar sessão"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs list */}
        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shrink-0 md:shrink ${
              activeTab === 'overview' ? 'bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Painel Geral
          </button>
          
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shrink-0 md:shrink ${
              activeTab === 'pos' ? 'bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            PDV (Balcão)
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shrink-0 md:shrink ${
              activeTab === 'products' ? 'bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Package className="h-4 w-4" />
            Produtos
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shrink-0 md:shrink ${
              activeTab === 'coupons' ? 'bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Ticket className="h-4 w-4" />
            Cupons
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shrink-0 md:shrink ${
              activeTab === 'settings' ? 'bg-[#d4af37]/10 text-[#d4af37] border-l-2 border-[#d4af37]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </button>
        </nav>

        {/* Back button */}
        <div className="p-6 border-t border-zinc-800 hidden md:block">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-center text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors border border-zinc-800 cursor-pointer"
          >
            Voltar para a Loja
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: VISÃO GERAL (OVERVIEW) */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white uppercase">Painel de Negócios</h2>
                  <p className="text-xs text-zinc-400">Sincronização em tempo real de pedidos, estoque e faturamento geral.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
                  {isFirebaseEnabled() ? (
                    <span className="text-emerald-500 flex items-center gap-1">● FIRESTORE REAL-TIME ATIVO</span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1 animate-pulse">● AMBIENTE LOCAL PERSISTENTE</span>
                  )}
                </div>
              </div>

              {/* Stats bento layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Faturamento Realizado</span>
                    <h3 className="text-xl font-black text-white mt-1">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pedidos Pendentes</span>
                    <h3 className="text-xl font-black text-[#d4af37] mt-1">{pendingOrders.length}</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-500/10 text-[#d4af37]">
                    <Clock className="h-6 w-6 animate-pulse" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total de Pedidos</span>
                    <h3 className="text-xl font-black text-zinc-200 mt-1">{orders.length}</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Alertas Estoque Baixo</span>
                    <h3 className="text-xl font-black text-red-500 mt-1">{lowStockItems.length}</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>

              </div>

              {/* Chart and low stock board */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SVG Revenue Chart */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Desempenho de Vendas (Últimos 7 dias)</h3>
                  
                  {/* Glowing SVG Chart Area */}
                  <div className="h-56 w-full flex flex-col justify-end">
                    <div className="flex-1 w-full flex items-end gap-3 px-2 pt-6 relative">
                      {/* Grid lines */}
                      <div className="absolute inset-x-0 bottom-0 h-[25%] border-b border-zinc-800/40" />
                      <div className="absolute inset-x-0 bottom-0 h-[50%] border-b border-zinc-800/40" />
                      <div className="absolute inset-x-0 bottom-0 h-[75%] border-b border-zinc-800/40" />
                      
                      {chartData.map((d, index) => {
                        const pct = (d.value / maxChartValue) * 100;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group z-10">
                            <div className="relative w-full flex flex-col justify-end h-full">
                              {/* Hover Value Box */}
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black border border-zinc-800 px-2 py-0.5 rounded text-[9px] font-bold text-[#d4af37] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                                R$ {d.value.toFixed(0)}
                              </div>
                              {/* Chart bar */}
                              <div 
                                style={{ height: `${Math.max(4, pct)}%` }}
                                className="w-full bg-gradient-to-t from-yellow-600/30 via-[#d4af37]/60 to-[#d4af37] rounded-t-lg group-hover:brightness-115 transition-all duration-300 shadow-lg shadow-yellow-600/10 border-t border-[#d4af37]/50"
                              />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 mt-2 font-bold">{d.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Low stock alerts panel */}
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4 overflow-y-auto max-h-[300px]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Estoque no Limite
                  </h3>
                  <div className="space-y-2">
                    {lowStockItems.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">Nenhum produto em nível crítico de estoque.</p>
                    ) : (
                      lowStockItems.slice(0, 8).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs">
                          <div className="truncate pr-4">
                            <p className="font-semibold text-zinc-200 truncate">{p.name}</p>
                            <p className="text-[10px] text-zinc-500">Tamanhos críticos: {
                              Object.entries(p.sizes)
                                .filter(([_, qty]) => qty > 0 && qty <= 2)
                                .map(([size, qty]) => `${size} (${qty})`)
                                .join(', ')
                            }</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-400 text-[9px] font-bold uppercase">ALERTA</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Order management table list */}
              <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Pedidos Recentes</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
                        <th className="pb-3 pl-2">Código/Data</th>
                        <th className="pb-3">Cliente / Canal</th>
                        <th className="pb-3">Itens Comprados</th>
                        <th className="pb-3">Valor Total</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500 italic">Nenhum pedido registrado ainda.</td>
                        </tr>
                      ) : (
                        orders.slice(0, 10).map(order => (
                          <tr key={order.id} className="hover:bg-zinc-900/20">
                            <td className="py-4 pl-2">
                              <p className="font-extrabold text-[#d4af37]">{order.code}</p>
                              <p className="text-[10px] text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </td>
                            <td>
                              <p className="font-semibold text-zinc-200">{order.customerName}</p>
                              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest ${
                                order.type === 'PDV' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900' : 'bg-blue-950 text-blue-400 border border-blue-900'
                              }`}>
                                {order.type}
                              </span>
                            </td>
                            <td className="max-w-xs truncate pr-4">
                              <p className="text-zinc-300 truncate">
                                {order.items.map(item => `${item.quantity}x ${item.productName} (${item.size})`).join(', ')}
                              </p>
                            </td>
                            <td className="font-bold text-white">
                              R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                order.status === 'Aprovado' 
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                                  : order.status === 'Enviado'
                                  ? 'bg-blue-950 text-blue-400 border border-blue-900'
                                  : order.status === 'Cancelado'
                                  ? 'bg-red-950 text-red-400 border border-red-900'
                                  : 'bg-yellow-950 text-[#d4af37] border border-yellow-900 animate-pulse'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-2">
                              <select
                                value={order.status}
                                onChange={(e) => {
                                  dbService.updateOrderStatus(order.id, e.target.value as Order['status']);
                                  showToast(`Status do pedido ${order.code} alterado!`, 'success');
                                }}
                                className="bg-zinc-950 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-800 outline-none"
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Aprovado">Aprovado</option>
                                <option value="Enviado">Enviado</option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: PDV (PONTO DE VENDA / CASH REGISTER) */}
          {activeTab === 'pos' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Product selection grid */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-white">PDV (Venda Balcão)</h2>
                    <p className="text-xs text-zinc-400">Lance vendas físicas diretamente no faturamento e dê baixa imediata no estoque.</p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar produto pelo nome..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    className="w-full bg-zinc-900 text-white placeholder-zinc-500 text-xs px-4 py-3 pl-10 rounded-xl border border-zinc-800 outline-none"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                </div>

                {/* Filter list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                  {products
                    .filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()))
                    .map(p => {
                      const totalQty = Object.values(p.sizes).reduce((a, b) => a + b, 0);
                      return (
                        <div key={p.id} className="p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex gap-3">
                          <img 
                            src={p.images[0]} 
                            alt={p.name} 
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 rounded-lg object-cover bg-black border border-zinc-800"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-zinc-200 truncate">{p.name}</h4>
                              <p className="text-xs font-extrabold text-white mt-0.5">R$ {p.price.toFixed(2)}</p>
                            </div>
                            
                            {/* Sizes Quick Add Buttons */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(p.sizes).map(([size, stock]) => {
                                const inCart = posCart.find(item => item.product.id === p.id && item.size === size)?.quantity || 0;
                                const isAvail = stock > inCart;
                                return (
                                  <button
                                    key={size}
                                    disabled={!isAvail}
                                    onClick={() => handleAddToPosCart(p, size)}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all ${
                                      inCart > 0 
                                        ? 'bg-[#d4af37] border-[#d4af37] text-black'
                                        : isAvail 
                                        ? 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                                        : 'bg-zinc-950/20 border-zinc-900 text-zinc-700 line-through'
                                    }`}
                                  >
                                    {size} ({stock})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* PDV Checkout panel */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col h-fit space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                  <ShoppingCart className="h-5 w-5 text-[#d4af37]" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">Carrinho do Caixa</h3>
                </div>

                {/* POS Item Rows */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {posCart.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-6 text-center">Nenhum item adicionado à venda balcão.</p>
                  ) : (
                    posCart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850">
                        <div className="truncate pr-2">
                          <p className="font-semibold text-zinc-200 truncate">{item.product.name}</p>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Tam: {item.size}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-black rounded px-1 border border-zinc-800">
                            <button onClick={() => handleUpdatePosQty(item.product.id, item.size, -1)} className="p-0.5 text-zinc-400 hover:text-white"><Minus className="h-2.5 w-2.5" /></button>
                            <span className="text-[11px] font-bold">{item.quantity}</span>
                            <button onClick={() => handleUpdatePosQty(item.product.id, item.size, 1)} className="p-0.5 text-zinc-400 hover:text-white"><Plus className="h-2.5 w-2.5" /></button>
                          </div>
                          <span className="font-bold text-white whitespace-nowrap">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Customer Details Form */}
                {posCart.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-zinc-900">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Nome do Cliente *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Carlos Santos"
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          className="w-full bg-zinc-900 text-white text-[11px] px-3 py-2 rounded-lg border border-zinc-850 focus:border-[#d4af37] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Telefone Cliente</label>
                        <input
                          type="tel"
                          placeholder="Ex: 11999998888"
                          value={posCustomerPhone}
                          onChange={(e) => setPosCustomerPhone(e.target.value)}
                          className="w-full bg-zinc-900 text-white text-[11px] px-3 py-2 rounded-lg border border-zinc-850 focus:border-[#d4af37] outline-none"
                        />
                      </div>
                    </div>

                    {/* POS Coupon Input */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Cupom Balcão"
                        value={posCouponCode}
                        onChange={(e) => setPosCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-zinc-900 text-white text-[11px] font-bold px-3 py-2 rounded-lg border border-zinc-850 uppercase outline-none"
                      />
                      <button 
                        onClick={handlePosApplyCoupon}
                        className="px-3 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-lg transition-colors border border-zinc-850 cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>

                    {posAppliedCoupon && (
                      <div className="flex justify-between text-[10px] text-emerald-500 bg-emerald-950/20 px-2 py-1.5 rounded border border-emerald-900/30">
                        <span className="font-bold">Cupom "{posAppliedCoupon.code}" Ativo</span>
                        <span>{posAppliedCoupon.type === 'percentage' ? `-${posAppliedCoupon.value}%` : `- R$ ${posAppliedCoupon.value}`}</span>
                      </div>
                    )}

                    {/* Financial details */}
                    <div className="space-y-1 text-[11px] pt-2 border-t border-zinc-900">
                      <div className="flex justify-between text-zinc-500">
                        <span>Subtotal</span>
                        <span>R$ {posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0).toFixed(2)}</span>
                      </div>
                      {posAppliedCoupon && (
                        <div className="flex justify-between text-emerald-500 font-bold">
                          <span>Desconto</span>
                          <span>- R$ {(posAppliedCoupon.type === 'percentage' 
                            ? (posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) * (posAppliedCoupon.value / 100))
                            : posAppliedCoupon.value).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-white pt-1">
                        <span>Total Venda</span>
                        <span className="text-[#d4af37]">R$ {
                          Math.max(0, posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) - 
                          (posAppliedCoupon 
                            ? (posAppliedCoupon.type === 'percentage' 
                              ? (posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) * (posAppliedCoupon.value / 100))
                              : posAppliedCoupon.value)
                            : 0)).toFixed(2)
                        }</span>
                      </div>
                    </div>

                    {/* POS checkout trigger */}
                    <button
                      onClick={handlePosCheckoutSubmit}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      Efetivar Venda à Vista
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: PRODUTOS (PRODUCTS MANAGEMENT) */}
          {activeTab === 'products' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase text-white">Catálogo de Produtos</h2>
                  <p className="text-xs text-zinc-400">Adicione, edite e acompanhe os estoques por tamanho em tempo real.</p>
                </div>
                
                <button
                  onClick={handleOpenAddProduct}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#d4af37] hover:bg-yellow-500 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-600/10 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  Novo Produto
                </button>
              </div>

              {/* Form panel container */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Product Add/Edit Form */}
                <div className="lg:col-span-1 p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 h-fit space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#d4af37] flex items-center gap-1">
                    {editingProduct ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                    {editingProduct ? 'Editar Produto' : 'Cadastrar Produto'}
                  </h3>

                  <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Nome do Produto *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Tênis Nike Air Jordan 1 Retro"
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        className="w-full bg-black text-white px-3 py-2 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Categoria *</label>
                        <select
                          value={pCategory}
                          onChange={(e) => {
                            setPCategory(e.target.value as typeof pCategory);
                            setPSizes({}); // reset sizes when changing category
                          }}
                          className="w-full bg-black text-white px-3 py-2 rounded-lg border border-zinc-800 outline-none"
                        >
                          <option value="Sapatos">Sapatos</option>
                          <option value="Roupas">Roupas</option>
                          <option value="Acessórios">Acessórios</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Destaque na Loja?</label>
                        <select
                          value={pFeatured ? 'sim' : 'nao'}
                          onChange={(e) => setPFeatured(e.target.value === 'sim')}
                          className="w-full bg-black text-[#d4af37] font-bold px-3 py-2 rounded-lg border border-zinc-800 outline-none"
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim (Home)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Preço Venda (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="899.90"
                          value={pPrice}
                          onChange={(e) => setPPrice(e.target.value)}
                          className="w-full bg-black text-white px-3 py-2 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Preço De (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="1199.90 (opcional)"
                          value={pCompareAtPrice}
                          onChange={(e) => setPCompareAtPrice(e.target.value)}
                          className="w-full bg-black text-white px-3 py-2 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Descrição do Produto</label>
                      <textarea
                        rows={2}
                        placeholder="Materiais, detalhes, caimento de luxo..."
                        value={pDescription}
                        onChange={(e) => setPDescription(e.target.value)}
                        className="w-full bg-black text-white px-3 py-2 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">URLs das Imagens (Uma por linha) *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="https://images.unsplash.com/photo-..."
                        value={pImagesText}
                        onChange={(e) => setPImagesText(e.target.value)}
                        className="w-full bg-black text-zinc-300 font-mono text-[10px] px-3 py-2 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none resize-none"
                      />
                    </div>

                    {/* Stock-by-Size Grid Matrix */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1">
                        Grade de Estoque por Tamanho
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto p-1 bg-black rounded-lg border border-zinc-900">
                        {(pCategory === 'Sapatos' ? SHOE_SIZES : CLOTHING_SIZES).map(size => (
                          <div key={size} className="flex flex-col items-center p-1 bg-zinc-900/60 rounded">
                            <span className="text-[9px] font-bold text-zinc-400">{size}</span>
                            <input
                              type="number"
                              placeholder="0"
                              min="0"
                              value={pSizes[size] || ''}
                              onChange={(e) => setPSizes({ ...pSizes, [size]: e.target.value })}
                              className="w-full text-center bg-black border border-zinc-850 rounded text-[10px] text-white py-0.5 outline-none focus:border-[#d4af37]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editingProduct && (
                        <button
                          type="button"
                          onClick={handleOpenAddProduct}
                          className="flex-1 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-900 hover:text-white"
                        >
                          Limpar
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold uppercase tracking-wider cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        {editingProduct ? 'Atualizar' : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Products List Matrix */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Produtos Cadastrados</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                    {products.map(p => {
                      const totalStockCount = Object.values(p.sizes).reduce((a, b) => a + b, 0);
                      return (
                        <div key={p.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex gap-3.5 relative hover:border-zinc-800 transition-all">
                          <img 
                            src={p.images[0]} 
                            alt={p.name} 
                            referrerPolicy="no-referrer"
                            className="h-16 w-16 rounded-xl object-cover bg-black border border-zinc-850"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-zinc-100 truncate pr-16">{p.name}</h4>
                              <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">{p.category} {p.isFeatured && '⭐'}</p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-xs font-black text-[#d4af37]">R$ {p.price.toFixed(2)}</span>
                                {p.compareAtPrice && (
                                  <span className="text-[10px] text-zinc-600 line-through">R$ {p.compareAtPrice.toFixed(2)}</span>
                                )}
                              </div>
                            </div>

                            <p className="text-[10px] text-zinc-400 mt-2 font-semibold">
                              Estoque Total: <strong className={totalStockCount === 0 ? 'text-red-500' : 'text-emerald-500'}>{totalStockCount} un</strong>
                            </p>
                          </div>

                          {/* Float Edit / Delete actions */}
                          <div className="absolute top-4 right-4 flex gap-1">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              title="Editar Produto"
                              className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-[#d4af37] transition-all border border-zinc-850 cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Deletar Produto"
                              className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-red-400 transition-all border border-zinc-850 cursor-pointer"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 4: CUPONS DE DESCONTO */}
          {activeTab === 'coupons' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Add Coupon Form */}
              <div className="lg:col-span-1 p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 h-fit space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                  <Ticket className="h-4 w-4" />
                  Criar Novo Cupom
                </h3>

                <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Código do Cupom *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SPECIAL15"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="w-full bg-black text-white font-bold uppercase px-3 py-2.5 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Tipo de Desconto</label>
                      <select
                        value={newCouponType}
                        onChange={(e) => setNewCouponType(e.target.value as any)}
                        className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Fixo (R$)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Valor Desconto *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder={newCouponType === 'percentage' ? '15' : '50.00'}
                        value={newCouponValue}
                        onChange={(e) => setNewCouponValue(e.target.value)}
                        className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Compra Mínima Exigida (R$)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="Ex: 150.00 (opcional)"
                      value={newCouponMin}
                      onChange={(e) => setNewCouponMin(e.target.value)}
                      className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Gerar Cupom Promocional
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Cupons Cadastrados</h3>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {coupons.map(coupon => (
                    <div key={coupon.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black tracking-wider text-white bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 uppercase">
                            {coupon.code}
                          </span>
                          <span className={`h-2.5 w-2.5 rounded-full ${coupon.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </div>
                        <p className="text-xs text-zinc-300">
                          Desconto: <strong className="text-[#d4af37]">{coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(2)}`}</strong>
                        </p>
                        {coupon.minPurchase && (
                          <p className="text-[10px] text-zinc-500">Compra mínima: R$ {coupon.minPurchase.toFixed(2)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCoupon(coupon)}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            coupon.active 
                              ? 'bg-zinc-900 border-zinc-800 text-amber-500 hover:text-amber-400' 
                              : 'bg-emerald-950/20 border-emerald-900 text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          {coupon.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 text-zinc-500 hover:text-red-400 border border-zinc-850 cursor-pointer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: CONFIGURAÇÕES DA LOJA (STORE SETTINGS) */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black uppercase text-white">Configurações Gerais</h2>
                  <p className="text-xs text-zinc-400">Gerencie contatos, fretes padrões e as imagens do banner rotativo.</p>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 bg-[#d4af37] hover:bg-yellow-500 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact and shipping */}
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4 text-xs">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#d4af37]">Canais e Custos</h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">WhatsApp de Recebimento de Pedidos (Código País + DDD + Número) *</label>
                      <input
                        type="text"
                        placeholder="5511999999999"
                        value={sWhatsapp}
                        onChange={(e) => setSWhatsapp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Instagram URL</label>
                      <input
                        type="url"
                        placeholder="https://instagram.com/lgmultimarcas"
                        value={sInstagram}
                        onChange={(e) => setSInstagram(e.target.value)}
                        className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Facebook URL</label>
                      <input
                        type="url"
                        placeholder="https://facebook.com/lgmultimarcas"
                        value={sFacebook}
                        onChange={(e) => setSFacebook(e.target.value)}
                        className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] font-bold">URL Externo do Logotipo (Logo)</label>
                      <input
                        type="url"
                        placeholder="https://i.postimg.cc/ncDXkT6v/Chat-GPT-Image-7-de-jul-de-2026-16-19-45.png"
                        value={sLogoUrl}
                        onChange={(e) => setSLogoUrl(e.target.value)}
                        className="w-full bg-black text-[#d4af37] font-semibold px-3 py-2.5 rounded-lg border border-zinc-800 focus:border-[#d4af37] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Frete Fixo Padrão (R$)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="20.00"
                          value={sShipCost}
                          onChange={(e) => setSShipCost(e.target.value)}
                          className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Frete Grátis a partir de (R$)</label>
                        <input
                          type="number"
                          step="1"
                          placeholder="350.00"
                          value={sShipThreshold}
                          onChange={(e) => setSShipThreshold(e.target.value)}
                          className="w-full bg-black text-white px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Rotator Banners list */}
                <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 space-y-4 text-xs">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#d4af37]">Slideshow rotativo do Hero (Mínimo 6)</h3>
                  
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {sBanners.map((banner, index) => (
                      <div key={banner.id} className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>SLIDE {index + 1}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <input
                            type="text"
                            placeholder="Título do Slide"
                            value={banner.title}
                            onChange={(e) => handleUpdateBannerTitle(banner.id, e.target.value)}
                            className="w-full bg-black text-white text-[11px] px-2.5 py-1.5 rounded border border-zinc-800 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Subtítulo descritivo"
                            value={banner.subtitle}
                            onChange={(e) => handleUpdateBannerSub(banner.id, e.target.value)}
                            className="w-full bg-black text-white text-[11px] px-2.5 py-1.5 rounded border border-zinc-800 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="URL da imagem (Unsplash/etc)"
                            value={banner.imageUrl}
                            onChange={(e) => handleUpdateBannerUrl(banner.id, e.target.value)}
                            className="w-full bg-black text-zinc-400 text-[10px] font-mono px-2.5 py-1.5 rounded border border-zinc-800 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

    </div>
  );
}
