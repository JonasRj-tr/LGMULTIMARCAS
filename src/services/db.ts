import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where,
  runTransaction
} from 'firebase/firestore';
import { db, isFirebaseEnabled, auth } from '../firebase';
import { Product, Order, Coupon, StoreSettings, HeroBanner } from '../types';

// Enum for Firestore operations (Error handling constraint)
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Error handling helper required by Firebase Integration Skill
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// SEEDED INITIAL PRODUCTS (High quality fashion images from Unsplash)
const SEEDED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Tênis Nike Air Jordan 1 Retro Metallic Gold',
    description: 'O clássico de basquete que revolucionou a cultura sneakerhead. Acabamento especial dourado premium com detalhes em couro preto nobre e amortecimento Air-Sole ativo.',
    category: 'Sapatos',
    price: 899.90,
    compareAtPrice: 1199.90,
    images: [
      'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=600'
    ],
    sizes: { '38': 4, '39': 8, '40': 12, '41': 6, '42': 5, '43': 2 },
    isFeatured: true,
    createdAt: Date.now() - 500000
  },
  {
    id: 'prod-2',
    name: 'Yeezy Boost 350 V2 Onyx Gold Edition',
    description: 'Minimalismo de alto padrão. Cabedal em Primeknit tecnológico ultra maleável, amortecimento Boost integral com entressola translúcida e detalhes premium.',
    category: 'Sapatos',
    price: 1149.90,
    compareAtPrice: 1499.00,
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600'
    ],
    sizes: { '39': 3, '40': 5, '41': 7, '42': 10, '43': 3 },
    isFeatured: true,
    createdAt: Date.now() - 400000
  },
  {
    id: 'prod-3',
    name: 'Moletom Balenciaga Oversized Gold Logo',
    description: 'Luxo e conforto urbano. Confeccionado em algodão pesado escovado com caimento oversized, capuz anatômico duplo e assinatura Balenciaga bordada em fios dourados.',
    category: 'Roupas',
    price: 450.00,
    compareAtPrice: 599.90,
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=600'
    ],
    sizes: { 'P': 5, 'M': 10, 'G': 12, 'GG': 4 },
    isFeatured: true,
    createdAt: Date.now() - 300000
  },
  {
    id: 'prod-4',
    name: 'Camiseta Off-White Industrial Golden Arrows',
    description: 'Estética industrial icônica de Virgil Abloh. Tecido de alta gramatura de algodão sustentável com a famosa estampa de setas traseiras em tom dourado metálico.',
    category: 'Roupas',
    price: 249.90,
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=600'
    ],
    sizes: { 'PP': 2, 'P': 5, 'M': 8, 'G': 6, 'GG': 3 },
    isFeatured: false,
    createdAt: Date.now() - 200000
  },
  {
    id: 'prod-5',
    name: 'Calça Cargo Streetwear Tech Golden Zipper',
    description: 'Streetwear utilitário levado ao extremo. Bolsos fole cargo com zíperes dourados, fivelas ajustáveis nas pernas e punho elástico adaptativo para destacar os tênis.',
    category: 'Roupas',
    price: 289.90,
    images: [
      'https://images.unsplash.com/photo-1517438476312-10d79c07750d?auto=format&fit=crop&q=80&w=600'
    ],
    sizes: { 'P': 4, 'M': 8, 'G': 8, 'GG': 2 },
    isFeatured: false,
    createdAt: Date.now() - 100000
  },
  {
    id: 'prod-6',
    name: 'Boné New Era NY Yankees Gold Metal Badge',
    description: 'Edição de colecionador. Aba curva estruturada em sarja preta de algodão, fecho de fivela e o escudo dos Yankees em metal dourado polido na parte frontal.',
    category: 'Acessórios',
    price: 159.90,
    compareAtPrice: 199.90,
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600'
    ],
    sizes: { 'Único': 15 },
    isFeatured: true,
    createdAt: Date.now()
  }
];

// SEEDED INITIAL COUPONS
const SEEDED_COUPONS: Coupon[] = [
  { id: 'cp-1', code: 'LG10', type: 'percentage', value: 10, active: true, minPurchase: 100 },
  { id: 'cp-2', code: 'BEMVINDO50', type: 'fixed', value: 50, active: true, minPurchase: 300 },
  { id: 'cp-3', code: 'GOLDVIP', type: 'percentage', value: 15, active: true, minPurchase: 500 }
];

// DEFAULT STORE SETTINGS
const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: '5511999999999', // Default phone number for WhatsApp wa.me link
  instagramUrl: 'https://www.instagram.com/lg_multimarcas_ofc/',
  facebookUrl: 'https://facebook.com/lgmultimarcas',
  defaultShippingCost: 20.00,
  freeShippingThreshold: 350.00,
  logoUrl: 'https://i.postimg.cc/ncDXkT6v/Chat-GPT-Image-7-de-jul-de-2026-16-19-45.png',
  banners: [
    {
      id: 'b-1',
      imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=1200',
      title: 'OUTLET SNEAKERS DE LUXO',
      subtitle: 'Até 30% Off nos sapatos mais disputados das grifes mundiais.',
      link: '#produtos'
    },
    {
      id: 'b-2',
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=1200',
      title: 'COLEÇÃO INVERNO PRESTIGE',
      subtitle: 'Moletons, calças cargo e casacos de alta costura streetwear.',
      link: '#produtos'
    },
    {
      id: 'b-3',
      imageUrl: 'https://images.unsplash.com/photo-1517438476312-10d79c07750d?auto=format&fit=crop&q=80&w=1200',
      title: 'ACESSÓRIOS METALLIC GOLD',
      subtitle: 'O brilho que completa seu outfit. Bonés, joias e correntes importadas.',
      link: '#produtos'
    }
  ]
};

// INITIAL SEEDED ORDERS (For immediate dashboard visual data!)
const SEEDED_ORDERS: Order[] = [
  {
    id: 'ord-1',
    code: '#LG-1001',
    customerName: 'Guilherme Silva',
    customerPhone: '11988887777',
    address: {
      cep: '01310-100',
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP'
    },
    items: [
      {
        productId: 'prod-1',
        productName: 'Tênis Nike Air Jordan 1 Retro Metallic Gold',
        image: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?auto=format&fit=crop&q=80&w=600',
        size: '41',
        quantity: 1,
        price: 899.90
      }
    ],
    subtotal: 899.90,
    discount: 0,
    shipping: 0,
    total: 899.90,
    status: 'Aprovado',
    type: 'Online',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 days ago
  },
  {
    id: 'ord-2',
    code: '#LG-1002',
    customerName: 'Claudio Lima (Balcão)',
    customerPhone: '11977776666',
    items: [
      {
        productId: 'prod-3',
        productName: 'Moletom Balenciaga Oversized Gold Logo',
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
        size: 'G',
        quantity: 1,
        price: 450.00
      }
    ],
    subtotal: 450.00,
    discount: 45.00,
    shipping: 0,
    total: 405.00,
    status: 'Aprovado',
    type: 'PDV',
    couponCode: 'LG10',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000 // 1 day ago
  },
  {
    id: 'ord-3',
    code: '#LG-1003',
    customerName: 'Mariana Costa',
    customerPhone: '21999998888',
    address: {
      cep: '22021-001',
      street: 'Avenida Atlântica',
      number: '150',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ'
    },
    items: [
      {
        productId: 'prod-6',
        productName: 'Boné New Era NY Yankees Gold Metal Badge',
        image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600',
        size: 'Único',
        quantity: 2,
        price: 159.90
      }
    ],
    subtotal: 319.80,
    discount: 0,
    shipping: 20.00,
    total: 339.80,
    status: 'Pendente',
    type: 'Online',
    createdAt: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
  }
];

// Helper to load / save local data for fallback
const getLocalData = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const saveLocalData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Local Storage Error:', e);
  }
};

// IN-MEMORY LISTENERS FOR LOCAL MODE
type ListenerCallback<T> = (data: T) => void;
const listenersMap = new Map<string, Set<ListenerCallback<any>>>();

const registerLocalListener = (key: string, callback: ListenerCallback<any>) => {
  if (!listenersMap.has(key)) {
    listenersMap.set(key, new Set());
  }
  listenersMap.get(key)!.add(callback);
  return () => {
    listenersMap.get(key)?.delete(callback);
  };
};

const triggerLocalListeners = (key: string, data: any) => {
  listenersMap.get(key)?.forEach(callback => callback(data));
};

// DATABASE SERVICE EXPORTS (Supports both Firebase Firestore and LocalStorage fallback)
export const dbService = {
  // PRODUCTS
  getProducts(callback: (products: Product[]) => void) {
    if (isFirebaseEnabled()) {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const products: Product[] = [];
        snapshot.forEach((docSnap) => {
          products.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        
        // Auto-seed if database is empty on first connected launch
        if (products.length === 0) {
          console.log('Seeding initial products to Firestore...');
          SEEDED_PRODUCTS.forEach(async (prod) => {
            const { id, ...prodData } = prod;
            try {
              await setDoc(doc(db, 'products', id), prodData);
            } catch (err) {
              console.error('Error seeding product: ', err);
            }
          });
        }

        callback(products);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      });
    } else {
      const products = getLocalData<Product[]>('LG_PRODUCTS', SEEDED_PRODUCTS);
      callback(products);
      return registerLocalListener('products', callback);
    }
  },

  async addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    const newProduct = {
      ...product,
      createdAt: Date.now()
    };

    if (isFirebaseEnabled()) {
      const collRef = collection(db, 'products');
      try {
        const docRef = await addDoc(collRef, newProduct);
        return docRef.id;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, 'products');
      }
    } else {
      const products = getLocalData<Product[]>('LG_PRODUCTS', SEEDED_PRODUCTS);
      const id = 'prod-' + Date.now();
      const productWithId: Product = { id, ...newProduct };
      products.unshift(productWithId);
      saveLocalData('LG_PRODUCTS', products);
      triggerLocalListeners('products', products);
      return id;
    }
  },

  async updateProduct(id: string, updatedFields: Partial<Product>): Promise<void> {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'products', id);
      try {
        await updateDoc(docRef, updatedFields);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      }
    } else {
      const products = getLocalData<Product[]>('LG_PRODUCTS', SEEDED_PRODUCTS);
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
        products[index] = { ...products[index], ...updatedFields };
        saveLocalData('LG_PRODUCTS', products);
        triggerLocalListeners('products', products);
      }
    }
  },

  async deleteProduct(id: string): Promise<void> {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'products', id);
      try {
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
    } else {
      const products = getLocalData<Product[]>('LG_PRODUCTS', SEEDED_PRODUCTS);
      const filtered = products.filter(p => p.id !== id);
      saveLocalData('LG_PRODUCTS', filtered);
      triggerLocalListeners('products', filtered);
    }
  },

  // ORDERS
  getOrders(callback: (orders: Order[]) => void) {
    if (isFirebaseEnabled()) {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((docSnap) => {
          orders.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });

        // Auto-seed if database has no orders
        if (orders.length === 0) {
          console.log('Seeding initial orders to Firestore...');
          SEEDED_ORDERS.forEach(async (order) => {
            const { id, ...orderData } = order;
            try {
              await setDoc(doc(db, 'orders', id), orderData);
            } catch (err) {
              console.error('Error seeding order: ', err);
            }
          });
        }

        callback(orders);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
    } else {
      const orders = getLocalData<Order[]>('LG_ORDERS', SEEDED_ORDERS);
      callback(orders);
      return registerLocalListener('orders', callback);
    }
  },

  async addOrder(orderData: Omit<Order, 'id' | 'code' | 'createdAt'>): Promise<Order> {
    // Generate order code (sequential or random but branded e.g. #LG-1054)
    const count = isFirebaseEnabled() ? Math.floor(Math.random() * 8999) + 1000 : getLocalData<Order[]>('LG_ORDERS', SEEDED_ORDERS).length + 1001;
    const code = `#LG-${count}`;
    const newOrder = {
      ...orderData,
      code,
      createdAt: Date.now()
    };

    if (isFirebaseEnabled()) {
      try {
        // Run as a transaction to ensure atomic stock decrement!
        // This is a highly robust engineering approach (Eight Pillars #7 & #11)
        const orderId = await runTransaction(db, async (transaction) => {
          // 1. Verify and decrement inventory for each item
          for (const item of orderData.items) {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await transaction.get(productRef);
            
            if (!productSnap.exists()) {
              throw new Error(`Produto ${item.productName} não encontrado.`);
            }

            const product = productSnap.data() as Product;
            const currentStock = product.sizes[item.size] || 0;
            
            if (currentStock < item.quantity) {
              throw new Error(`Estoque insuficiente para ${product.name} no tamanho ${item.size}. Disponível: ${currentStock}`);
            }

            // Decrement size inventory
            const updatedSizes = { ...product.sizes };
            updatedSizes[item.size] = currentStock - item.quantity;
            
            transaction.update(productRef, { sizes: updatedSizes });
          }

          // 2. Add the order document
          const newOrderRef = doc(collection(db, 'orders'));
          transaction.set(newOrderRef, newOrder);
          return newOrderRef.id;
        });

        return { id: orderId, ...newOrder } as Order;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, 'orders');
      }
    } else {
      // Offline transaction logic
      const products = getLocalData<Product[]>('LG_PRODUCTS', SEEDED_PRODUCTS);
      const orders = getLocalData<Order[]>('LG_ORDERS', SEEDED_ORDERS);
      
      // 1. Check stock
      for (const item of orderData.items) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) throw new Error(`Produto ${item.productName} não encontrado.`);
        const stock = prod.sizes[item.size] || 0;
        if (stock < item.quantity) {
          throw new Error(`Estoque insuficiente para ${prod.name} no tamanho ${item.size}. Disponível: ${stock}`);
        }
      }

      // 2. Decrement stock
      for (const item of orderData.items) {
        const prodIndex = products.findIndex(p => p.id === item.productId);
        if (prodIndex !== -1) {
          products[prodIndex].sizes[item.size] -= item.quantity;
        }
      }

      // 3. Save
      const id = 'ord-' + Date.now();
      const createdOrder: Order = { id, ...newOrder } as Order;
      orders.unshift(createdOrder);

      saveLocalData('LG_PRODUCTS', products);
      saveLocalData('LG_ORDERS', orders);
      
      triggerLocalListeners('products', products);
      triggerLocalListeners('orders', orders);
      
      return createdOrder;
    }
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'orders', id);
      try {
        await updateDoc(docRef, { status });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
      }
    } else {
      const orders = getLocalData<Order[]>('LG_ORDERS', SEEDED_ORDERS);
      const index = orders.findIndex(o => o.id === id);
      if (index !== -1) {
        orders[index].status = status;
        saveLocalData('LG_ORDERS', orders);
        triggerLocalListeners('orders', orders);
      }
    }
  },

  // COUPONS
  getCoupons(callback: (coupons: Coupon[]) => void) {
    if (isFirebaseEnabled()) {
      const q = collection(db, 'coupons');
      return onSnapshot(q, (snapshot) => {
        const coupons: Coupon[] = [];
        snapshot.forEach((docSnap) => {
          coupons.push({ id: docSnap.id, ...docSnap.data() } as Coupon);
        });

        // Auto-seed if database has no coupons
        if (coupons.length === 0) {
          console.log('Seeding initial coupons to Firestore...');
          SEEDED_COUPONS.forEach(async (coupon) => {
            const { id, ...couponData } = coupon;
            try {
              await setDoc(doc(db, 'coupons', id), couponData);
            } catch (err) {
              console.error('Error seeding coupon: ', err);
            }
          });
        }

        callback(coupons);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'coupons');
      });
    } else {
      const coupons = getLocalData<Coupon[]>('LG_COUPONS', SEEDED_COUPONS);
      callback(coupons);
      return registerLocalListener('coupons', callback);
    }
  },

  async addCoupon(coupon: Omit<Coupon, 'id'>): Promise<string> {
    if (isFirebaseEnabled()) {
      const collRef = collection(db, 'coupons');
      try {
        const docRef = await addDoc(collRef, coupon);
        return docRef.id;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, 'coupons');
      }
    } else {
      const coupons = getLocalData<Coupon[]>('LG_COUPONS', SEEDED_COUPONS);
      const id = 'cp-' + Date.now();
      const couponWithId: Coupon = { id, ...coupon };
      coupons.unshift(couponWithId);
      saveLocalData('LG_COUPONS', coupons);
      triggerLocalListeners('coupons', coupons);
      return id;
    }
  },

  async updateCoupon(id: string, updatedFields: Partial<Coupon>): Promise<void> {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'coupons', id);
      try {
        await updateDoc(docRef, updatedFields);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `coupons/${id}`);
      }
    } else {
      const coupons = getLocalData<Coupon[]>('LG_COUPONS', SEEDED_COUPONS);
      const index = coupons.findIndex(c => c.id === id);
      if (index !== -1) {
        coupons[index] = { ...coupons[index], ...updatedFields };
        saveLocalData('LG_COUPONS', coupons);
        triggerLocalListeners('coupons', coupons);
      }
    }
  },

  async deleteCoupon(id: string): Promise<void> {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'coupons', id);
      try {
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
      }
    } else {
      const coupons = getLocalData<Coupon[]>('LG_COUPONS', SEEDED_COUPONS);
      const filtered = coupons.filter(c => c.id !== id);
      saveLocalData('LG_COUPONS', filtered);
      triggerLocalListeners('coupons', filtered);
    }
  },

  // STORE SETTINGS
  getSettings(callback: (settings: StoreSettings) => void) {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'settings', 'store');
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as StoreSettings);
        } else {
          // If Firestore is connected but settings doc doesn't exist yet, seed it!
          setDoc(docRef, DEFAULT_SETTINGS)
            .then(() => callback(DEFAULT_SETTINGS))
            .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/store'));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/store');
      });
    } else {
      const settings = getLocalData<StoreSettings>('LG_SETTINGS', DEFAULT_SETTINGS);
      callback(settings);
      return registerLocalListener('settings', callback);
    }
  },

  async updateSettings(updatedFields: Partial<StoreSettings>): Promise<void> {
    if (isFirebaseEnabled()) {
      const docRef = doc(db, 'settings', 'store');
      try {
        await setDoc(docRef, updatedFields, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/store');
      }
    } else {
      const settings = getLocalData<StoreSettings>('LG_SETTINGS', DEFAULT_SETTINGS);
      const merged = { ...settings, ...updatedFields };
      saveLocalData('LG_SETTINGS', merged);
      triggerLocalListeners('settings', merged);
    }
  }
};
