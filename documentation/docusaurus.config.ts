import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const docsBrandName = process.env.DOCS_BRAND_NAME || 'IntiMate';
const docsTagline =
  process.env.DOCS_TAGLINE ||
  'Tài liệu vận hành và phát triển hệ thống thương mại điện tử lingerie';
const docsUrl = process.env.DOCS_SITE_URL || 'https://my-lingerie-shop-docs.vercel.app';
const docsApiBaseUrl =
  process.env.DOCS_API_BASE_URL || 'https://my-lingerie-shop-production.up.railway.app/api';
const docsPrimaryColor = process.env.DOCS_PRIMARY_COLOR || '#f43f5e';

const config: Config = {
  title: `${docsBrandName} Docs`,
  tagline: docsTagline,
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: docsUrl,
  baseUrl: '/',

  organizationName: 'zizi0209',
  projectName: 'my-lingerie-shop',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  customFields: {
    apiBaseUrl: docsApiBaseUrl,
    defaultBrandName: docsBrandName,
    defaultPrimaryColor: docsPrimaryColor,
    defaultStoreDescription:
      'Tài liệu chính thức cho vận hành cửa hàng, quản trị dashboard và tích hợp API.',
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/zizi0209/my-lingerie-shop/tree/master/documentation/',
        },
        blog: {
          path: 'blog',
          routeBasePath: 'changelog',
          showReadingTime: true,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: docsBrandName,
      logo: {
        alt: `${docsBrandName} Logo`,
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'userGuideSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'developerGuideSidebar',
          position: 'left',
          label: 'Developer Guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiReferenceSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {to: '/changelog', label: 'Changelog', position: 'left'},
        {
          href: 'https://github.com/zizi0209/my-lingerie-shop',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'User Guide',
              to: '/docs/user-guide/intro',
            },
            {
              label: 'Developer Guide',
              to: '/docs/developer-guide/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api-reference/introduction',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/zizi0209/my-lingerie-shop',
            },
          ],
        },
        {
          title: 'Release Notes',
          items: [
            {
              label: 'Changelog',
              to: '/changelog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ${docsBrandName}. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
