export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  sizes: { [size: string]: number }; // Size name mapped to stock count, e.g., { "38": 5, "M": 10 }
  isFeatured: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  size: string;
  quantity: number;
  price: number;
}

export interface OrderAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Order {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  address?: OrderAddress; // Optional for PDV orders
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: 'Pendente' | 'Aprovado' | 'Enviado' | 'Cancelado';
  type: 'Online' | 'PDV';
  couponCode?: string;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  minPurchase?: number;
}

export interface HeroBanner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  link?: string;
}

export interface StoreSettings {
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  banners: HeroBanner[];
  defaultShippingCost: number;
  freeShippingThreshold: number;
  logoUrl?: string;
}
