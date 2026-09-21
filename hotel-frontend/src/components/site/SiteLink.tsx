import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Renders an in-page anchor (`#stay`) as a plain <a> and anything else as a
 * router Link, so a single piece of nav data can mix bare section anchors with
 * real routes. Anchors that target the landing page are written `/#stay` and
 * travel through the router, so they work from any page on the site.
 */
export default function SiteLink({
  to,
  className,
  children,
  ...rest
}: {
  to: string;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  if (to.startsWith('#')) {
    return (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className} {...rest}>
      {children}
    </Link>
  );
}
