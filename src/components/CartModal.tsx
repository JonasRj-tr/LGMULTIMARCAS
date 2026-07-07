import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, MapPin, Ticket, Send, Loader2, Sparkles } from 'lucide-react';
import { CartItem, Coupon, StoreSettings, OrderAddress } from '../types';
import { dbService } from '../services/db';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, size: string, delta: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  onClearCart: () => void;
  storeSettings: StoreSettings;
  coupons: Coupon[];
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function CartModal({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  storeSettings,
  coupons,
  showToast,
}: CartModalProps) {
  const [activeTab, setActiveTab] = useState<'cart' | 'shipping' | 'checkout'>('cart');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address State
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Shipping simulation state
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [deliveryDays, setDeliveryDays] = useState<number | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Automatically check free shipping threshold
  const isFreeShipping = subtotal >= storeSettings.freeShippingThreshold;
  const currentShipping = shippingCost !== null ? (isFreeShipping ? 0 : shippingCost) : 0;

  // Coupon calculations
  const discountValue = appliedCoupon 
    ? (appliedCoupon.type === 'percentage' 
        ? Math.round((subtotal * (appliedCoupon.value / 100)) * 100) / 100
        : appliedCoupon.value)
    : 0;

  const total = Math.max(0, subtotal - discountValue + currentShipping);

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('cart');
      setCouponCode('');
      setAppliedCoupon(null);
    }
  }, [isOpen]);

  // Cep auto fetch / mock
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = rawVal;
    if (rawVal.length > 5) {
      formatted = `${rawVal.slice(0, 5)}-${rawVal.slice(5)}`;
    }
    setCep(formatted);

    // Call ViaCEP API for real address lookup! (Zero-mock real engineering constraint)
    if (rawVal.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${rawVal}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
          
          // Realistic freight calculation based on state (North/Northeast is further, SP is closest)
          const stateCode = data.uf;
          let calculatedCost = storeSettings.defaultShippingCost;
          let days = 5;

          if (stateCode === 'SP') {
            calculatedCost = 14.90;
            days = 2;
          } else if (['RJ', 'MG', 'PR', 'SC'].includes(stateCode)) {
            calculatedCost = 19.90;
            days = 4;
          } else if (['RS', 'DF', 'ES', 'GO'].includes(stateCode)) {
            calculatedCost = 24.90;
            days = 5;
          } else {
            calculatedCost = 34.90;
            days = 8;
          }

          setShippingCost(calculatedCost);
          setDeliveryDays(days);
          showToast('Endereço e frete atualizados!', 'success');
        } else {
          showToast('CEP não encontrado.', 'error');
          setShippingCost(storeSettings.defaultShippingCost);
          setDeliveryDays(5);
        }
      } catch (err) {
        // Fallback calculation
        setShippingCost(storeSettings.defaultShippingCost);
        setDeliveryDays(6);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      showToast('Digite um código de cupom.', 'error');
      return;
    }
    const found = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active);
    
    if (!found) {
      showToast('Cupom inválido ou expirado.', 'error');
      return;
    }

    if (found.minPurchase && subtotal < found.minPurchase) {
      showToast(`Este cupom exige compra mínima de R$ ${found.minPurchase.toFixed(2)}`, 'error');
      return;
    }

    setAppliedCoupon(found);
    showToast(`Cupom ${found.code} aplicado com sucesso!`, 'success');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    showToast('Cupom removido.', 'success');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Por favor, preencha seu nome e celular.', 'error');
      return;
    }

    if (activeTab === 'shipping' && (!street || !number || !neighborhood || !city || !state)) {
      showToast('Preencha as informações completas de entrega.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const addressPayload: OrderAddress | undefined = cep ? {
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state
      } : undefined;

      const orderItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        image: item.product.images[0],
        size: item.selectedSize,
        quantity: item.quantity,
        price: item.product.price
      }));

      // 1. Save order to DB (real-time transaction updates stock atomically!)
      const order = await dbService.addOrder({
        customerName,
        customerPhone,
        items: orderItems,
        address: addressPayload,
        subtotal,
        discount: discountValue,
        shipping: currentShipping,
        total,
        status: 'Pendente',
        type: 'Online',
        couponCode: appliedCoupon?.code
      });

      // 2. Generate Beautiful Formatted WhatsApp Message
      const formattedItems = cart.map(item => 
        `• *${item.quantity}x* ${item.product.name} (Tam: *${item.selectedSize}*) - R$ ${(item.product.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join('\n');

      const addressBlock = addressPayload 
        ? `📍 *ENDEREÇO DE ENTREGA*\n${addressPayload.street}, ${addressPayload.number} ${addressPayload.complement ? `- ${addressPayload.complement}` : ''}\nBairro: ${addressPayload.neighborhood}\nCEP: ${addressPayload.cep}\nCidade: ${addressPayload.city} - ${addressPayload.state}`
        : '📍 Retirada na loja física combinada';

      const financialSummary = `💵 *RESUMO DO PEDIDO*\nSubtotal: R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
        (appliedCoupon ? `Cupom: ${appliedCoupon.code} (-${appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `R$ ${appliedCoupon.value}`})\n` : '') +
        `Desconto: R$ ${discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
        `Frete: ${currentShipping === 0 ? 'Grátis' : `R$ ${currentShipping.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}\n` +
        `*TOTAL DO PEDIDO: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;

      const whatsappMessage = `🛒 *NOVO PEDIDO - LG MULTIMARCAS*\n` +
        `-----------------------------------------\n` +
        `📦 Código: *${order.code}*\n` +
        `👤 Cliente: *${customerName}*\n` +
        `📞 Celular: *${customerPhone}*\n\n` +
        `${addressBlock}\n\n` +
        `-----------------------------------------\n` +
        `🛍️ *ITENS DO PEDIDO*\n${formattedItems}\n\n` +
        `-----------------------------------------\n` +
        `${financialSummary}\n\n` +
        `-----------------------------------------\n` +
        `Olá LG Multimarcas! Acabei de realizar o pedido acima. Aguardo os dados para pagamento e envio! 🙏🏼✨`;

      const encodedText = encodeURIComponent(whatsappMessage);
      const cleanedPhone = storeSettings.whatsappNumber.replace(/\D/g, '');
      const waUrl = `https://wa.me/${cleanedPhone}?text=${encodedText}`;

      // Show success toast
      showToast(`Pedido ${order.code} gerado com sucesso! Redirecionando...`, 'success');
      
      // Open WhatsApp in a new tab
      window.open(waUrl, '_blank');

      // 3. Complete and clear
      onClearCart();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Erro ao processar pedido. Verifique estoque.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md bg-[#0a0a0a] border-l border-white/10 text-white flex flex-col h-full shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d4af37]"></span>
              </span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#d4af37] flex items-center gap-1">
                SEU CARRINHO
              </h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Tabs */}
          {cart.length > 0 && (
            <div className="grid grid-cols-3 border-b border-white/10 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <button 
                onClick={() => setActiveTab('cart')}
                className={`py-3.5 border-b-2 transition-all ${activeTab === 'cart' ? 'border-[#d4af37] text-[#d4af37] bg-white/5' : 'border-transparent hover:text-white'}`}
              >
                1. Itens
              </button>
              <button 
                disabled={cart.length === 0}
                onClick={() => setActiveTab('shipping')}
                className={`py-3.5 border-b-2 transition-all ${activeTab === 'shipping' ? 'border-[#d4af37] text-[#d4af37] bg-white/5' : 'border-transparent hover:text-white disabled:opacity-40'}`}
              >
                2. Entrega
              </button>
              <button 
                disabled={cart.length === 0}
                onClick={() => setActiveTab('checkout')}
                className={`py-3.5 border-b-2 transition-all ${activeTab === 'checkout' ? 'border-[#d4af37] text-[#d4af37] bg-white/5' : 'border-transparent hover:text-white disabled:opacity-40'}`}
              >
                3. Concluir
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence mode="wait">
              
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800">
                    <Trash2 className="h-8 w-8 text-zinc-600 animate-pulse" />
                  </div>
                  <h4 className="text-zinc-200 font-bold uppercase tracking-wider">Seu carrinho está vazio</h4>
                  <p className="text-xs text-zinc-500 max-w-xs">Navegue pelas nossas categorias premium e encontre as melhores grifes streetwear do mundo.</p>
                  <button 
                    onClick={onClose}
                    className="px-6 py-3 rounded-sm bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all cursor-pointer"
                  >
                    Ir para as compras
                  </button>
                </motion.div>
              ) : activeTab === 'cart' ? (
                // TAB 1: CART ITEMS LIST
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  {cart.map((item) => (
                    <div 
                      key={`${item.product.id}-${item.selectedSize}`}
                      className="flex items-center gap-4 bg-[#111] border border-white/5 p-3 rounded-sm relative"
                    >
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name} 
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-sm object-cover bg-zinc-950 border border-white/5"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-200 truncate pr-6">{item.product.name}</h4>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-bold tracking-widest uppercase rounded-sm text-zinc-400">
                          TAM: {item.selectedSize}
                        </span>
                        
                        <div className="flex items-center justify-between mt-2.5">
                          {/* Quantity selector */}
                          <div className="flex items-center bg-black/60 rounded-sm p-1 border border-white/5">
                            <button 
                              onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1)}
                              className="p-1 rounded-sm hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-zinc-100">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1)}
                              className="p-1 rounded-sm hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="text-xs font-mono font-bold text-white">
                            R$ {(item.product.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Remove item button */}
                      <button 
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Free shipping banner if progress is on */}
                  <div className="p-4 rounded-sm bg-[#d4af37]/5 border border-[#d4af37]/20 flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      <span>{isFreeShipping ? '🎉 Frete Grátis Ativado!' : '🚚 Frete Grátis acima de:'}</span>
                      <span className="font-mono">R$ {storeSettings.freeShippingThreshold.toFixed(2)}</span>
                    </div>
                    {!isFreeShipping && (
                      <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-pink-500 to-yellow-500 h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (subtotal / storeSettings.freeShippingThreshold) * 100)}%` }}
                        />
                      </div>
                    )}
                    {!isFreeShipping && (
                      <p className="text-[10px] text-zinc-400">
                        Adicione mais <strong>R$ {(storeSettings.freeShippingThreshold - subtotal).toFixed(2)}</strong> para ganhar frete grátis!
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === 'shipping' ? (
                // TAB 2: SHIPPING CALCULATOR & DETAILS
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div className="text-xs text-zinc-400 mb-2 font-light">
                    Digite seu CEP para calcular o frete e as estimativas de entrega. Nós enviamos para todo o Brasil.
                  </div>

                  {/* CEP Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">CEP de Entrega *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={cep}
                        onChange={handleCepChange}
                        className="w-full bg-zinc-900 text-white placeholder-zinc-600 text-xs px-4 py-3 pl-10 rounded-xl border border-zinc-800 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                      />
                      <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-[#d4af37]" />
                      {isLoadingCep && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 text-zinc-500 animate-spin" />}
                    </div>
                  </div>

                  {street && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 pt-2 border-t border-zinc-900"
                    >
                      {/* Address Fields */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Rua</label>
                          <input
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Número *</label>
                          <input
                            type="text"
                            required
                            placeholder="Nº"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg border border-[#d4af37]/40 focus:border-[#d4af37] outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Complemento</label>
                          <input
                            type="text"
                            placeholder="Apt, bloco (opcional)"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Bairro</label>
                          <input
                            type="text"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Cidade</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Estado</label>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg border border-zinc-800 outline-none"
                          />
                        </div>
                      </div>

                      {/* simulated delivery cost */}
                      {shippingCost !== null && (
                        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-zinc-200">Entrega Estimada Correios</p>
                            <p className="text-[10px] text-zinc-500">Prazo: {deliveryDays} dias úteis</p>
                          </div>
                          <span className="font-black text-[#d4af37]">
                            {isFreeShipping ? 'Grátis (Promo)' : `R$ ${shippingCost.toFixed(2)}`}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                // TAB 3: CONTACT FORM & SUBMIT
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Insira seus dados pessoais para registrar o pedido no painel e disparar a mensagem direta para o WhatsApp da LG Multimarcas.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Seu Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-zinc-900 text-white text-xs px-4 py-3 rounded-xl border border-zinc-800 focus:border-[#d4af37] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Número de Celular (WhatsApp) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: (11) 99999-9999"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-zinc-900 text-white text-xs px-4 py-3 rounded-xl border border-zinc-800 focus:border-[#d4af37] outline-none"
                    />
                  </div>

                  {cep ? (
                    <div className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800 text-xs space-y-1">
                      <p className="font-semibold text-zinc-300">Resumo de entrega:</p>
                      <p className="text-zinc-500 text-[11px] leading-snug">
                        {street}, {number} {complement && `(${complement})`}<br />
                        {neighborhood} - {city}/{state} (CEP: {cep})
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800 text-xs text-amber-500 font-medium">
                      ⚠️ Você não calculou o frete. Retirada na loja ou frete a combinar via WhatsApp.
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Cart Footer Summary */}
          {cart.length > 0 && (
            <div className="border-t border-white/10 bg-[#0d0d0d] p-6 space-y-4">
              
              {/* Coupon Row */}
              {activeTab === 'cart' && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="CUPOM DE DESCONTO"
                      disabled={appliedCoupon !== null}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#111] text-white placeholder-zinc-600 text-xs font-bold uppercase px-3 py-2.5 pl-9 rounded-sm border border-white/10 focus:border-[#d4af37] outline-none disabled:opacity-50"
                    />
                    <Ticket className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  </div>
                  {appliedCoupon ? (
                    <button 
                      onClick={handleRemoveCoupon}
                      className="px-3 py-2.5 text-xs font-bold text-red-500 hover:text-red-400 bg-red-950/20 rounded-sm border border-red-900/40 transition-colors"
                    >
                      Remover
                    </button>
                  ) : (
                    <button 
                      onClick={handleApplyCoupon}
                      className="px-4 py-2.5 text-xs font-bold text-black bg-white hover:bg-[#d4af37] hover:text-black rounded-sm transition-all cursor-pointer"
                    >
                      Aplicar
                    </button>
                  )}
                </div>
              )}

              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-500 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-sm">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    Cupom "{appliedCoupon.code}" Ativo
                  </span>
                  <span>
                    {appliedCoupon.type === 'percentage' ? `-${appliedCoupon.value}%` : `- R$ ${appliedCoupon.value.toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Financial calculations breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Desconto</span>
                    <span>- R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {cep && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Frete</span>
                    <span>{isFreeShipping ? 'Grátis' : `R$ ${currentShipping.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span className="uppercase tracking-wider">Total Geral</span>
                  <span className="font-mono">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Action Buttons based on Tab */}
              <div>
                {activeTab === 'cart' ? (
                  <button
                    onClick={() => setActiveTab('shipping')}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-white hover:bg-[#d4af37] text-black font-black text-xs uppercase tracking-widest rounded-sm transition-all duration-300 cursor-pointer"
                  >
                    Prosseguir para Entrega
                  </button>
                ) : activeTab === 'shipping' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('cart')}
                      className="flex-1 py-4 bg-[#111] hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-sm border border-white/5 transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      disabled={!street || !number}
                      onClick={() => setActiveTab('checkout')}
                      className="flex-1 py-4 bg-white hover:bg-[#d4af37] hover:text-black text-black font-black text-xs uppercase tracking-widest rounded-sm transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black cursor-pointer"
                    >
                      Prosseguir
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('shipping')}
                      className="flex-1 py-4 bg-[#111] hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-sm border border-white/5 transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      disabled={isSubmitting || !customerName.trim() || !customerPhone.trim()}
                      onClick={handleCheckoutSubmit}
                      className="flex-[2] flex items-center justify-center gap-2 py-4 bg-[#d4af37] hover:bg-yellow-500 text-black font-black text-xs uppercase tracking-widest rounded-sm shadow-lg shadow-yellow-500/15 transition-all duration-300 cursor-pointer disabled:opacity-40"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Finalizar no WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
