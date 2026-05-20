// Facebook Pixel event tracking helpers
// Pixel ID: 1743304776861432

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

// Track product view (ViewContent)
export function trackViewContent(product: {
  id: string | number;
  name: string;
  price: number;
  currency?: string;
  category?: string;
}) {
  fbq('track', 'ViewContent', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    content_category: product.category || 'Бытовая техника',
    value: product.price,
    currency: product.currency || 'UZS',
  });
}

// Track add to cart (AddToCart)
export function trackAddToCart(product: {
  id: string | number;
  name: string;
  price: number;
  quantity?: number;
  currency?: string;
}) {
  fbq('track', 'AddToCart', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: product.price * (product.quantity || 1),
    currency: product.currency || 'UZS',
    num_items: product.quantity || 1,
  });
}

// Track purchase (Purchase)
export function trackPurchase(order: {
  orderId: string | number;
  total: number;
  items: Array<{ id: string | number; name: string; price: number; quantity: number }>;
  currency?: string;
}) {
  fbq('track', 'Purchase', {
    content_ids: order.items.map((i) => String(i.id)),
    content_type: 'product',
    value: order.total,
    currency: order.currency || 'UZS',
    num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
    order_id: String(order.orderId),
  });
}

// Track search (Search)
export function trackSearch(query: string) {
  fbq('track', 'Search', {
    search_string: query,
  });
}

// Track initiate checkout (InitiateCheckout)
export function trackInitiateCheckout(cart: {
  total: number;
  itemCount: number;
  currency?: string;
}) {
  fbq('track', 'InitiateCheckout', {
    value: cart.total,
    currency: cart.currency || 'UZS',
    num_items: cart.itemCount,
  });
}

// Track registration (CompleteRegistration)
export function trackCompleteRegistration() {
  fbq('track', 'CompleteRegistration');
}
