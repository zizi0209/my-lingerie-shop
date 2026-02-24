import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '../components/HomepageFeatures';

import styles from './index.module.css';

type HomeLink = {
  label: string;
  to: string;
  variant: 'primary' | 'secondary';
};

const homeLinks: HomeLink[] = [
  {
    label: 'User Guide',
    to: '/docs/user-guide/intro',
    variant: 'primary',
  },
  {
    label: 'Developer Guide',
    to: '/docs/developer-guide/intro',
    variant: 'secondary',
  },
  {
    label: 'API Reference',
    to: '/docs/api-reference/introduction',
    variant: 'secondary',
  },
  {
    label: 'Changelog',
    to: '/changelog',
    variant: 'secondary',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>

        <div className={styles.buttonGroup}>
          {homeLinks.map((item) => (
            <Link
              key={item.to}
              className={clsx(
                'button button--lg',
                item.variant === 'primary' ? 'button--secondary' : 'button--primary',
              )}
              to={item.to}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={`Trang chủ | ${siteConfig.title}`}
      description="Tài liệu vận hành, phát triển và tích hợp API cho My Lingerie Shop.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
