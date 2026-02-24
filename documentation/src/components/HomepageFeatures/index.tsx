import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
  to: string;
  cta: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
};

const featureList: FeatureItem[] = [
  {
    title: 'Vận hành hằng ngày',
    description: (
      <>
        Tài liệu theo luồng công việc cho dashboard: sản phẩm, đơn hàng, khách hàng,
        ưu đãi và theo dõi vận hành.
      </>
    ),
    to: '/docs/user-guide/intro',
    cta: 'Mở User Guide',
    Svg: require('../../../static/img/undraw_docusaurus_mountain.svg').default,
  },
  {
    title: 'Phát triển hệ thống',
    description: (
      <>
        Chuẩn phát triển cho frontend Next.js, backend Express, Prisma, testing và
        quy trình triển khai.
      </>
    ),
    to: '/docs/developer-guide/intro',
    cta: 'Mở Developer Guide',
    Svg: require('../../../static/img/undraw_docusaurus_tree.svg').default,
  },
  {
    title: 'Tích hợp API theo route thật',
    description: (
      <>
        Danh mục endpoint được đối chiếu trực tiếp từ backend routes, gồm auth,
        commerce, admin analytics, media và size system.
      </>
    ),
    to: '/docs/api-reference/introduction',
    cta: 'Mở API Reference',
    Svg: require('../../../static/img/undraw_docusaurus_react.svg').default,
  },
];

function Feature({title, description, to, cta, Svg}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <article className={styles.featureCard}>
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
        <div className={styles.featureBody}>
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
          <Link className={clsx('button button--primary button--sm', styles.featureLink)} to={to}>
            {cta}
          </Link>
        </div>
      </article>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {featureList.map((item) => (
            <Feature key={item.to} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
