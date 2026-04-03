'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Package, ShoppingCart, Users, Loader2 } from 'lucide-react';
import { productApi, type Product } from '@/lib/productApi';
import { orderApi, type Order } from '@/lib/orderApi';
import { adminUserApi, type User } from '@/lib/adminApi';
import { useLanguage } from '../components/LanguageContext';

const SEARCH_LIMIT = 5;
const ORDER_FETCH_LIMIT = 20;

const SearchResults: React.FC = () => {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);

  const t = useMemo(() => ({
    title: language === 'vi' ? 'Kết quả tìm kiếm' : 'Search Results',
    subtitle: language === 'vi' ? 'Kết quả theo module quản trị' : 'Results across admin modules',
    searchLabel: language === 'vi' ? 'Từ khóa' : 'Keyword',
    emptyQuery: language === 'vi' ? 'Nhập từ khóa ở thanh search để bắt đầu.' : 'Enter a keyword in the search bar to start.',
    products: language === 'vi' ? 'Sản phẩm' : 'Products',
    orders: language === 'vi' ? 'Đơn hàng' : 'Orders',
    customers: language === 'vi' ? 'Khách hàng' : 'Customers',
    viewAll: language === 'vi' ? 'Xem tất cả' : 'View all',
    noResults: language === 'vi' ? 'Không có kết quả phù hợp' : 'No matching results',
  }), [language]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const getCustomerName = (order: Order): string => {
    if (order.user?.name) return order.user.name;
    if (order.guestInfo?.name) return order.guestInfo.name;
    return language === 'vi' ? 'Khách vãng lai' : 'Guest';
  };

  useEffect(() => {
    if (!query) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchResults = async () => {
      const [productsRes, ordersRes, customersRes] = await Promise.allSettled([
        productApi.list({ page: 1, limit: SEARCH_LIMIT, search: query }),
        orderApi.list({ page: 1, limit: ORDER_FETCH_LIMIT }),
        adminUserApi.list({ page: 1, limit: SEARCH_LIMIT, role: 'USER', search: query }),
      ]);

      if (!isMounted) return;

      if (productsRes.status === 'fulfilled' && productsRes.value.success) {
        setProducts(productsRes.value.data);
      } else {
        setProducts([]);
      }

      if (customersRes.status === 'fulfilled' && customersRes.value.success) {
        setCustomers(customersRes.value.data);
      } else {
        setCustomers([]);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.success) {
        const lowerQuery = query.toLowerCase();
        const filtered = ordersRes.value.data.filter(order =>
          order.orderNumber.toLowerCase().includes(lowerQuery) ||
          order.user?.name?.toLowerCase().includes(lowerQuery) ||
          order.user?.email?.toLowerCase().includes(lowerQuery) ||
          order.guestInfo?.name?.toLowerCase().includes(lowerQuery) ||
          order.shippingPhone.includes(lowerQuery)
        );
        setOrders(filtered.slice(0, SEARCH_LIMIT));
      } else {
        setOrders([]);
      }

      if (
        productsRes.status === 'rejected' ||
        ordersRes.status === 'rejected' ||
        customersRes.status === 'rejected'
      ) {
        setError(language === 'vi' ? 'Không thể tải đầy đủ kết quả' : 'Failed to load full results');
      }
    };

    fetchResults()
      .catch(() => {
        if (isMounted) {
          setError(language === 'vi' ? 'Không thể tải kết quả' : 'Failed to load results');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query, language]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.searchLabel}</span>
        <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900/40 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Search size={14} />
          {query || '--'}
        </span>
      </div>

      {!query ? (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400">
          {t.emptyQuery}
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
          <span className="text-slate-500 dark:text-slate-400">Loading...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                <Package size={16} />
                {t.products}
              </div>
              <Link
                href={`/dashboard/products?search=${encodeURIComponent(query)}`}
                className="text-xs font-bold text-rose-500 hover:text-rose-600"
              >
                {t.viewAll}
              </Link>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.noResults}</p>
            ) : (
              <ul className="space-y-3">
                {products.map(product => (
                  <li key={product.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(product.price)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">#{product.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                <ShoppingCart size={16} />
                {t.orders}
              </div>
              <Link
                href={`/dashboard/orders?search=${encodeURIComponent(query)}`}
                className="text-xs font-bold text-rose-500 hover:text-rose-600"
              >
                {t.viewAll}
              </Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.noResults}</p>
            ) : (
              <ul className="space-y-3">
                {orders.map(order => (
                  <li key={order.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{getCustomerName(order)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">#{order.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                <Users size={16} />
                {t.customers}
              </div>
              <Link
                href={`/dashboard/customers?search=${encodeURIComponent(query)}`}
                className="text-xs font-bold text-rose-500 hover:text-rose-600"
              >
                {t.viewAll}
              </Link>
            </div>
            {customers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.noResults}</p>
            ) : (
              <ul className="space-y-3">
                {customers.map(customer => (
                  <li key={customer.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{customer.name || customer.email}</p>
                      <p className="text-xs text-slate-500">{customer.email}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">#{customer.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
