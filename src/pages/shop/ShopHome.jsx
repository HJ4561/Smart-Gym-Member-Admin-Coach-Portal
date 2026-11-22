// src/pages/shop/ShopHome.jsx — the shop manager's start page: orders to prepare, stock, approvals.
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/site/SiteUi';
import { formatSAR } from '../../utils/money';
import { card, Page, Skeleton, Tile } from '../coach/ui';
import { tl } from '../../i18n';

export default function ShopHome() {
  const { data, loading } = useApi(() => adminService.shopStats(), [], { poll: 30_000 });
  const tiles = [
    [tl('Orders to prepare'), data?.orders_to_prepare, 'inventory_2', 'text-amber-400', '/shop/orders'],
    [tl('Waiting for approval'), data?.waiting_approval, 'hourglass_top', 'text-amber-400', '/shop/products'],
    [tl('Low stock'), data?.low_stock, 'trending_down', 'text-amber-400', '/shop/products'],
    [tl('Out of stock'), data?.out_of_stock, 'remove_shopping_cart', 'text-rose-400', '/shop/products'],
    [tl('Products on sale'), data?.products, 'storefront', '', '/shop/products'],
    [tl('Orders, 30 days'), data?.orders_30d, 'receipt_long', '', '/shop/orders'],
    [tl('Sales, 30 days'), data ? formatSAR(data.sales_30d) : undefined, 'payments', '', '/shop/orders'],
  ];
  return (
    <Page>
      <PageHeader title={tl('Shop')}
        subtitle={tl('Prepare and hand over orders, keep stock right, and add products. New products and price changes go live once an admin approves them.')} />
      {loading && !data ? <Skeleton rows={2} /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {tiles.map(([label, value, icon, tone, to]) => (
            <Link key={label} to={to} className="block"><Tile label={label} value={value ?? 0} icon={icon} tone={tone} /></Link>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['/shop/orders', 'receipt_long', tl('Orders')], ['/shop/products', 'inventory_2', tl('Products')],
          ['/shop/promos', 'sell', tl('Promo codes')]].map(([to, icon, label]) => (
          <Link key={to} to={to} className={`${card} p-4 flex items-center gap-3 hover:border-primary-container/60`}>
            <span className="material-symbols-outlined text-primary text-[26px]" aria-hidden="true">{icon}</span>
            <span className="text-on-surface font-bold">{label}</span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
