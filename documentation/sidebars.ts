import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // User Guide - For end users
  userGuideSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['user-guide/intro', 'user-guide/quick-start'],
    },
    {
      type: 'category',
      label: 'Dashboard Features',
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

  // Developer Guide - For developers
  developerGuideSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['developer-guide/intro', 'developer-guide/setup'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'developer-guide/architecture/overview',
        'developer-guide/architecture/frontend',
        'developer-guide/architecture/backend',
        'developer-guide/architecture/database',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'developer-guide/features/authentication',
        'developer-guide/features/size-system',
        'developer-guide/features/sister-sizing',
      ],
    },
    {
      type: 'category',
      label: 'Testing & Deployment',
      items: [
        'developer-guide/testing/overview',
        'developer-guide/deployment/railway',
        'developer-guide/deployment/vercel',
      ],
    },
  ],

  // API Reference - For API documentation
  apiReferenceSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['api-reference/intro', 'api-reference/authentication'],
    },
    {
      type: 'category',
      label: 'Endpoints',
      items: [
        'api-reference/endpoints/products',
        'api-reference/endpoints/orders',
        'api-reference/endpoints/customers',
        'api-reference/endpoints/size-system',
      ],
    },
    {
      type: 'category',
      label: 'Models',
      items: ['api-reference/models/product', 'api-reference/models/order'],
    },
  ],
};

export default sidebars;
