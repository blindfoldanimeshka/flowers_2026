export interface ICreateOrderPayload {
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: 'cash' | 'card' | 'online';
  notes?: string;
  deliveryType: 'delivery' | 'pickup';
  fulfillmentMethod?: 'delivery' | 'pickup';
}

