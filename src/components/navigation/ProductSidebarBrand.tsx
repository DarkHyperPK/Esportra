import { PanelLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface ProductSidebarBrandProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ProductSidebarBrand({ collapsed = false, onToggle }: ProductSidebarBrandProps) {
  return (
    <div className={cn('product-sidebar-brand-wrap', collapsed && 'is-collapsed')}>
      <Link to="/" aria-label="Esportra home" className="product-sidebar-brand">
        <img
          src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
          alt=""
          width={24}
          height={24}
        />
      </Link>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="product-sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="product-sidebar-navigation"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
