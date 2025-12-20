
export type Language = 'en' | 'vi';

export const translations = {
  en: {
    common: {
      search: 'Quick search...',
      save: 'Save Changes',
      export: 'Export CSV',
      actions: 'Actions',
      filter: 'Filter',
      total: 'Total',
      status: 'Status',
      date: 'Date',
      customer: 'Customer',
    },
    nav: {
      dashboard: 'Dashboard',
      default: 'Default',
      analytics: 'Analytics',
      inventory: 'Inventory',
      products: 'Products',
      categories: 'Categories',
      orders: 'Orders',
      cartTracker: 'Cart Tracker',
      marketing: 'Marketing',
      blogPosts: 'Blog Posts',
      postTags: 'Post Tags',
      homeLayout: 'Home Layout',
      system: 'System',
      staffUsers: 'Staff Users',
      customers: 'Customers',
      roles: 'Roles',
      settings: 'Settings',
    },
    dashboard: {
      earning: 'Total Earning',
      orders: 'Total Orders',
      income: 'Total Income',
      revenue: 'Total Revenue',
      growth: 'Total Growth',
      popular: 'Popular Pieces',
      bestSeller: 'Best Seller',
      profitGrowth: 'Profit Growth',
      today: 'Today',
      month: 'Month',
      year: 'Year',
    },
    settings: {
      title: 'General Settings',
      desc: 'Update your store profile and configuration.',
      storeInfo: 'Store Information',
      storeName: 'Store Name',
      supportEmail: 'Support Email',
      storeDesc: 'Store Description',
      notifications: 'Automated Notifications',
      orderAlerts: 'Real-time Order Alerts',
      stockWarnings: 'Low Stock Warnings',
    }
  },
  vi: {
    common: {
      search: 'Tìm kiếm nhanh...',
      save: 'Lưu thay đổi',
      export: 'Xuất CSV',
      actions: 'Thao tác',
      filter: 'Bộ lọc',
      total: 'Tổng cộng',
      status: 'Trạng thái',
      date: 'Ngày',
      customer: 'Khách hàng',
    },
    nav: {
      dashboard: 'Bảng điều khiển',
      default: 'Tổng quan',
      analytics: 'Phân tích',
      inventory: 'Kho hàng',
      products: 'Sản phẩm',
      categories: 'Danh mục',
      orders: 'Đơn hàng',
      cartTracker: 'Theo dõi giỏ hàng',
      marketing: 'Tiếp thị',
      blogPosts: 'Bài viết',
      postTags: 'Thẻ bài viết',
      homeLayout: 'Bố cục trang chủ',
      system: 'Hệ thống',
      staffUsers: 'Nhân viên',
      customers: 'Khách hàng',
      roles: 'Vai trò & Quyền',
      settings: 'Cài đặt',
    },
    dashboard: {
      earning: 'Tổng thu nhập',
      orders: 'Tổng đơn hàng',
      income: 'Tổng doanh thu',
      revenue: 'Doanh số thực',
      growth: 'Tăng trưởng tổng thể',
      popular: 'Sản phẩm phổ biến',
      bestSeller: 'Bán chạy nhất',
      profitGrowth: 'Tăng trưởng lợi nhuận',
      today: 'Hôm nay',
      month: 'Tháng này',
      year: 'Năm nay',
    },
    settings: {
      title: 'Cài đặt chung',
      desc: 'Cập nhật hồ sơ cửa hàng và cấu hình hệ thống.',
      storeInfo: 'Thông tin cửa hàng',
      storeName: 'Tên cửa hàng',
      supportEmail: 'Email hỗ trợ',
      storeDesc: 'Mô tả cửa hàng',
      notifications: 'Thông báo tự động',
      orderAlerts: 'Cảnh báo đơn hàng thời gian thực',
      stockWarnings: 'Cảnh báo tồn kho thấp',
    }
  }
};

export type TranslationKeys = 
  | 'common.search' | 'common.save' | 'common.export' | 'common.actions' | 'common.filter' | 'common.total' | 'common.status' | 'common.date' | 'common.customer'
  | 'nav.dashboard' | 'nav.default' | 'nav.analytics' | 'nav.inventory' | 'nav.products' | 'nav.categories' | 'nav.orders' | 'nav.cartTracker' | 'nav.marketing' | 'nav.blogPosts' | 'nav.postTags' | 'nav.homeLayout' | 'nav.system' | 'nav.staffUsers' | 'nav.customers' | 'nav.roles' | 'nav.settings'
  | 'dashboard.earning' | 'dashboard.orders' | 'dashboard.income' | 'dashboard.revenue' | 'dashboard.growth' | 'dashboard.popular' | 'dashboard.bestSeller' | 'dashboard.profitGrowth' | 'dashboard.today' | 'dashboard.month' | 'dashboard.year'
  | 'settings.title' | 'settings.desc' | 'settings.storeInfo' | 'settings.storeName' | 'settings.supportEmail' | 'settings.storeDesc' | 'settings.notifications' | 'settings.orderAlerts' | 'settings.stockWarnings';
