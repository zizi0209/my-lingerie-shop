import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // User Guide
  userGuideSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'user-guide/intro',
        'user-guide/quick-start',
        'user-guide/getting-started/screenshots',
      ],
    },
    {
      type: 'category',
      label: 'Size System',
      items: [
        'user-guide/size-system/overview',
      ],
    },
  ],

  // Developer Guide
  developerGuideSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'developer-guide/intro',
        'developer-guide/quick-reference',
        'developer-guide/frontend-integration',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'developer-guide/architecture/overview',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'developer-guide/features/size-system',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      items: [
        'developer-guide/testing/overview',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'developer-guide/deployment/railway',
        'developer-guide/deployment/vercel',
      ],
    },
  ],

  // API Reference
  apiReferenceSidebar: [
    {
      type: 'category',
      label: 'API Documentation',
      items: [
        'api-reference/introduction',
        'api-reference/products',
        'api-reference/orders',
        'api-reference/size-system',
        'api-reference/dashboard',
        'api-reference/media',
      ],
    },
  ],
};

export default sidebars;
