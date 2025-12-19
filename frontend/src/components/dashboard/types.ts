export interface Customer {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
}

export interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock' | 'draft';
  image: string;
}