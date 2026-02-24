import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  userGuideSidebar: [
    {
      type: 'category',
      label: 'Bắt đầu',
      items: [
        'user-guide/intro',
        'user-guide/quick-start',
        'user-guide/getting-started/screenshots',
      ],
    },
    {
      type: 'category',
      label: 'Vận hành Dashboard',
      items: [
        'user-guide/dashboard/overview',
        'user-guide/dashboard/products',
        'user-guide/dashboard/orders',
        'user-guide/dashboard/customers',
      ],
    },
    {
      type: 'category',
      label: 'Size System',
      items: [
        'user-guide/size-system/overview',
        'user-guide/size-system/recommendations',
        'user-guide/size-system/sister-sizing',
      ],
    },
  ],

  developerGuideSidebar: [
    {
      type: 'category',
      label: 'Nền tảng phát triển',
      items: [
        'developer-guide/intro',
        'developer-guide/setup',
        'developer-guide/quick-reference',
        'developer-guide/frontend-integration',
      ],
    },
    {
      type: 'category',
      label: 'Kiến trúc hệ thống',
      items: [
        'developer-guide/architecture/overview',
        'developer-guide/architecture/frontend',
        'developer-guide/architecture/backend',
        'developer-guide/architecture/database',
      ],
    },
    {
      type: 'category',
      label: 'Tính năng cốt lõi',
      items: [
        'developer-guide/features/authentication',
        'developer-guide/features/size-system',
        'developer-guide/features/sister-sizing',
      ],
    },
    {
      type: 'category',
      label: 'Testing và QA',
      items: [
        'developer-guide/testing/overview',
        'developer-guide/testing/qa-guide',
      ],
    },
    {
      type: 'category',
      label: 'Triển khai',
      items: [
        'developer-guide/deployment/railway',
        'developer-guide/deployment/vercel',
      ],
    },
  ],

  apiReferenceSidebar: [
    {
      type: 'category',
      label: 'Khởi đầu',
      items: [
        'api-reference/introduction',
        'api-reference/authentication',
        'api-reference/public-config',
      ],
    },
    {
      type: 'category',
      label: 'Tài khoản & quyền',
      items: [
        'api-reference/auth',
        'api-reference/users',
        'api-reference/roles',
        'api-reference/permissions',
      ],
    },
    {
      type: 'category',
      label: 'Catalog & nội dung',
      items: [
        'api-reference/products',
        'api-reference/categories',
        'api-reference/colors',
        'api-reference/size-templates',
        'api-reference/size-system',
        'api-reference/page-sections',
        'api-reference/about-sections',
        'api-reference/about-stats',
        'api-reference/posts',
        'api-reference/post-categories',
        'api-reference/product-posts',
        'api-reference/media',
      ],
    },
    {
      type: 'category',
      label: 'Giỏ hàng & đơn hàng',
      items: [
        'api-reference/carts',
        'api-reference/orders',
        'api-reference/reviews',
        'api-reference/wishlist',
        'api-reference/coupons',
        'api-reference/contact',
        'api-reference/newsletter',
      ],
    },
    {
      type: 'category',
      label: 'Search & tracking',
      items: [
        'api-reference/filters',
        'api-reference/search',
        'api-reference/recommendations',
        'api-reference/tracking',
      ],
    },
    {
      type: 'category',
      label: 'AI & xử lý ảnh',
      items: [
        'api-reference/ai-consultant',
        'api-reference/virtual-tryon',
        'api-reference/background-removal',
      ],
    },
    {
      type: 'category',
      label: 'Admin',
      items: [
        'api-reference/dashboard',
        'api-reference/admin',
      ],
    },
    {
      type: 'category',
      label: 'Hệ thống',
      items: [
        'api-reference/seed',
      ],
    },
    {
      type: 'category',
      label: 'Tương thích',
      items: ['api-reference/intro'],
    },
  ],
};

export default sidebars;
