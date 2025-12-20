
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'draft' | 'out_of_stock';
  image: string;
}

export interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
}

export interface Metric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
}
