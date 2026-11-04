// src/pages/member/Shop.jsx
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { shopService } from '../../services/shopService';
import PayDialog from '../../components/payments/PayDialog';
import { errorMessage } from '../../utils/apiError';
import { formatSAR } from '../../utils/money';
import { getLocalized, tl, locale } from '../../i18n';

const ORDER_STATUS = {
  pending: { label: tl("Awaiting payment"), cls: 'bg-primary-container/20 text-primary' },
  paid: { label: tl("Paid — preparing"), cls: 'bg-emerald-400/15 text-emerald-400' },
  preparing: { label: tl("Preparing"), cls: 'bg-emerald-400/15 text-emerald-400' },
  ready: { label: tl("Ready for pickup"), cls: 'bg-emerald-400/25 text-emerald-300' },
  dispatched: { label: tl("In your locker"), cls: 'bg-emerald-400/25 text-emerald-300' },
  completed: { label: tl("Collected"), cls: 'bg-surface-container-high text-on-surface-variant' },
  cancelled: { label: tl("Cancelled"), cls: 'bg-surface-container-high text-on-surface-variant' },
  refunded: { label: tl("Refunded"), cls: 'bg-error/20 text-error' },
};

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'orders' ? 'orders' : 'products';
  const setTab = (t) => setParams(t === 'orders' ? { tab: 'orders' } : {});
  const [delivery, setDelivery] = useState('locker');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);          // { code, discount_percent }
  const [payOrder, setPayOrder] = useState(null);    // order awaiting payment

  // ---- API ----
  const {
    data: categories,
    loading: catLoading,
  } = useApi(() => shopService.categories(), []);

  const {
    data: products,
    loading: prodLoading,
    error: prodError,
    refetch: refetchProducts,
  } = useApi(() => shopService.products(), []);

  const {
    data: cart,
    refetch: refetchCart,
  } = useApi(() => shopService.cart(), [], { showError: false });

  const list = Array.isArray(products) ? products : [];
  const cats = Array.isArray(categories) ? categories : [];
  const cartItems = cart?.items || [];
  const cartSubtotal = Number(cart?.subtotal || 0);
  const itemCount = cart?.item_count || 0;

  const loading = prodLoading || catLoading;

  const { data: orders, loading: ordersLoading, refetch: refetchOrders } =
    useApi(() => shopService.myOrders(), [], { showError: false });

  // ---- Filter ----
  const filtered = useMemo(() => {
    let result = [...list];
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category?.key === activeCategory);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          [p.name, p.name_ar, p.description, p.description_ar].some((v) => v?.toLowerCase().includes(s))
      );
    }
    return result;
  }, [list, activeCategory, search]);

  // ---- Handlers ----
  const addToCart = async (product) => {
    try {
      await shopService.addToCart(product.id, 1);
      toast.success(tl("Added {0}", { 0: getLocalized(product, 'name') }));
      refetchCart();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to add');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await shopService.removeCartItem(itemId);
      toast.success(tl("Removed"));
      refetchCart();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to remove');
    }
  };

  const updateQuantity = async (itemId, qty) => {
    try {
      await shopService.updateCartItem(itemId, qty);
      refetchCart();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update');
    }
  };

  const [checkingOut, setCheckingOut] = useState(false);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    try {
      const res = await shopService.applyPromo(promoInput.trim());
      setPromo(res);
      toast.success(tl("{0}: {1}% off", { 0: res.code, 1: res.discount_percent }));
    } catch (e) {
      setPromo(null);
      toast.error(errorMessage(e, tl("Invalid promo code")));
    }
  };

  // Place the order (reserves stock), then pay for it.
  const checkout = async () => {
    setCheckingOut(true);
    try {
      const order = await shopService.checkout({
        delivery_method: delivery,
        promo_code: promo?.code || '',
      });
      setCartOpen(false);
      setPromo(null);
      setPromoInput('');
      refetchCart();
      refetchProducts();
      refetchOrders();
      setPayOrder(order);
    } catch (e) {
      toast.error(errorMessage(e, tl("Checkout failed")));
    } finally {
      setCheckingOut(false);
    }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(tl("Cancel order {0}?", { 0: order.order_number }))) return;
    try {
      await shopService.cancelOrder(order.order_number);
      toast.success(tl("Order cancelled"));
      refetchOrders();
      refetchProducts();
    } catch (e) {
      toast.error(errorMessage(e, tl("Could not cancel")));
    }
  };

  const discount = promo ? (cartSubtotal * Number(promo.discount_percent)) / 100 : 0;

  return (
    <div className="w-full flex flex-col">
      {/* ============ HERO ============ */}
      <section className="w-full px-space-xl py-space-lg">
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <span className="font-label-md text-[10px] uppercase tracking-widest font-bold">
                {tl("Gym Shop")}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wider">
              {tl("Supplements & Gear")}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
              {tl("Order here, pay by card, STC Pay or locker credit, and collect from your locker or the front desk.")}
            </p>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="bg-surface-container rounded-xl p-4 flex items-center gap-4 shadow-xl hover:bg-surface-container-high transition-all text-left"
            type="button"
          >
            <div className="relative w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[24px]">
                shopping_bag
              </span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>
            <div>
              <span className="font-label-md text-[10px] uppercase text-primary font-bold">
                {tl("Your cart")}
              </span>
              <div className="font-body-md text-body-md text-on-surface-variant">
                {itemCount}{' '}{tl("items ·")}{' '}{formatSAR(cartSubtotal)}
              </div>
            </div>
            <span className="material-symbols-outlined text-primary">
              arrow_forward
            </span>
          </button>
        </div>
      </section>

      <div className="px-space-xl flex gap-1" role="tablist">
        {[['products', tl("Products")], ['orders', `My orders${orders?.length ? ` (${orders.length})` : ''}`]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-t text-[11px] font-bold uppercase tracking-wider ${tab === id ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <section className="px-space-xl py-space-lg flex flex-col gap-3">
          {ordersLoading ? (
            <div className="h-24 bg-surface-container rounded-xl animate-pulse" />
          ) : !orders?.length ? (
            <div className="text-center py-16 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">receipt_long</span>
              <p className="font-title-md text-title-md text-on-surface mt-3">{tl("No orders yet")}</p>
            </div>
          ) : orders.map((o) => {
            const st = ORDER_STATUS[o.status] || { label: o.status, cls: 'bg-surface-container-high text-on-surface-variant' };
            return (
              <div key={o.id} className="bg-surface-container rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-title-md text-title-md text-on-surface">{o.order_number}</span>
                  <span className="text-on-surface-variant text-[12px]">
                    {new Date(o.created_at).toLocaleString(locale)} · {o.item_count} item{o.item_count === 1 ? '' : 's'} ·{' '}
                    {o.delivery_method === 'counter' ? tl("Front desk pickup") : tl("Locker {0}", { 0: o.locker_number || '' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-title-md text-title-md text-on-surface">{formatSAR(o.total)}</span>
                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                  {o.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => setPayOrder(o)}
                        className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container text-[10px] font-bold uppercase">{tl("Pay")}</button>
                      <button type="button" onClick={() => cancelOrder(o)}
                        className="px-3 py-1.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase hover:text-error">{tl("Cancel")}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {tab === 'products' && (<>
      {/* ============ FILTER BAR ============ */}
      <section className="px-space-xl py-4 bg-surface sticky top-16 z-30 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              {tl("All Products")}
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.key)}
                className={`px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeCategory === c.key
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
                type="button"
              >
                {getLocalized(c, 'name')}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none z-10">
              search
            </span>
            <input
              type="text"
              placeholder={tl("Search products...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-lowest text-on-surface text-body-md pl-10 pr-4 py-2.5 rounded-lg border border-surface-container-high focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </section>

      {/* ============ PRODUCTS ============ */}
      <section className="px-space-xl py-space-xl">
        {prodError && (
          <div className="mb-4 p-4 rounded-lg bg-error/10 border border-error/30 flex items-center justify-between">
            <span className="text-on-surface">{tl("Failed to load products.")}</span>
            <button
              onClick={refetchProducts}
              className="px-3 py-1 rounded bg-primary-container text-on-primary-container text-[11px] uppercase font-bold"
            >
              {tl("Retry")}
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-96 bg-surface-container rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-low rounded-xl">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              shopping_bag
            </span>
            <p className="font-title-md text-title-md text-on-surface mt-3">
              {tl("No products")}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {list.length === 0
                ? tl("The shop has no products yet — check back soon.")
                : tl("Try a different filter or search.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-lg hover:shadow-2xl flex flex-col"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={p.image_url || undefined}
                    alt={getLocalized(p, 'name')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {p.badge_top && (
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.badge_top_accent
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container-lowest/90 text-on-surface'
                        }`}
                      >
                        {p.badge_top}
                      </span>
                    )}
                    {p.badge_secondary && (
                      <span className="px-2 py-1 rounded bg-surface-container-lowest/90 text-on-surface text-[10px] font-bold uppercase">
                        {p.badge_secondary}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-surface-container-lowest/90 text-[10px] flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-primary-container text-[12px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {Number(p.rating).toFixed(1)}
                  </div>

                  {Array.isArray(p.telemetry) && p.telemetry.length > 0 && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="inline-flex gap-2 px-2 py-1 rounded bg-surface-container-highest/80 backdrop-blur text-[10px] flex-wrap">
                        {p.telemetry.map((t, idx) => (
                          <span
                            key={idx}
                            className={
                              idx === 0
                                ? 'text-primary font-bold'
                                : 'text-on-surface'
                            }
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between text-[10px] uppercase">
                    <span className="text-on-surface-variant tracking-wider">
                      {getLocalized(p.category, 'name')}
                    </span>
                    <span
                      className={`font-bold ${
                        p.is_out_of_stock
                          ? 'text-error'
                          : p.is_low_stock
                          ? 'text-primary'
                          : 'text-emerald-400'
                      }`}
                    >
                      {p.is_out_of_stock
                        ? tl("Out of Stock")
                        : p.stock_label || tl("In Stock ({0})", { 0: p.stock_quantity })}
                    </span>
                  </div>

                  <h3 className="font-headline-md text-headline-md text-on-surface leading-tight">
                    {getLocalized(p, 'name')}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                    {getLocalized(p, 'description')}
                  </p>

                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-surface-container-high">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-md text-headline-md text-on-surface">
                          {formatSAR(p.price)}
                        </span>
                        {p.original_price && (
                          <span className="font-label-md text-[10px] text-on-surface-variant line-through">
                            {formatSAR(p.original_price)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-label-md text-[10px] uppercase ${
                          p.original_price
                            ? 'text-primary font-bold'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {p.price_note}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      disabled={p.is_out_of_stock}
                      className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                        p.is_out_of_stock
                          ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                          : 'bg-primary-container hover:bg-secondary-container text-on-primary-container'
                      }`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        add_shopping_cart
                      </span>
                      <span>{tl("Add")}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      </>)}

      {/* ============ CART DRAWER ============ */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-surface-container-lowest z-50 shadow-2xl flex flex-col"
            >
              <div className="p-5 bg-surface-container-low flex items-center justify-between">
                <div>
                  <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
                    {tl("Your cart")}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface uppercase">
                    {tl("Checkout")}
                  </h3>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-error"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                      shopping_cart
                    </span>
                    <p className="font-title-md text-title-md text-on-surface-variant mt-3">
                      {tl("Cart is empty")}
                    </p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-surface-container rounded-lg"
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-title-md text-title-md text-on-surface truncate">
                          {getLocalized(item.product, 'name')}
                        </span>
                        <span className="font-label-md text-[10px] text-primary uppercase font-bold">
                          {formatSAR(item.product.price)} each
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                Math.max(1, item.quantity - 1)
                              )
                            }
                            className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"
                            type="button"
                          >
                            −
                          </button>
                          <span className="font-title-md text-title-md text-on-surface min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"
                            type="button"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-2 text-error hover:underline text-[10px] uppercase font-bold"
                            type="button"
                          >
                            {tl("Remove")}
                          </button>
                        </div>
                      </div>
                      <span className="font-title-md text-title-md text-on-surface">
                        {formatSAR(item.line_total)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-5 bg-surface-container-low border-t border-surface-container-high flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder={tl("Promo code")} aria-label={tl("Promo code")}
                      className="flex-1 bg-surface-container-lowest text-on-surface px-3 py-2 rounded border border-surface-container-high focus:outline-none focus:border-primary uppercase" />
                    <button type="button" onClick={applyPromo}
                      className="px-3 rounded bg-surface-container-high text-on-surface text-[10px] font-bold uppercase">{tl("Apply")}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={tl("Pickup")}>
                    {[['locker', tl("Locker pickup")], ['counter', tl("Front desk")]].map(([id, label]) => (
                      <button key={id} type="button" role="radio" aria-checked={delivery === id} onClick={() => setDelivery(id)}
                        className={`py-2 rounded text-[10px] font-bold uppercase ${delivery === id ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 text-[13px]">
                    <div className="flex justify-between text-on-surface-variant"><span>{tl("Subtotal")}</span><span>{formatSAR(cartSubtotal)}</span></div>
                    {promo && <div className="flex justify-between text-primary"><span>{promo.code}</span><span>-{formatSAR(discount)}</span></div>}
                    <div className="flex justify-between text-on-surface-variant"><span>{tl("VAT")}</span><span>{tl("added at checkout")}</span></div>
                  </div>
                  <button
                    onClick={checkout}
                    disabled={checkingOut}
                    className={`w-full py-3 rounded-lg font-label-lg uppercase tracking-wider font-bold transition-all ${
                      checkingOut
                        ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                        : 'bg-primary-container hover:bg-secondary-container text-on-primary-container'
                    }`}
                    type="button"
                  >
                    {checkingOut ? tl("Placing order…") : tl("Place order & pay")}
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <PayDialog
        request={payOrder ? { purpose: 'shop_order', order_number: payOrder.order_number } : null}
        title={payOrder ? tl("Order {0}", { 0: payOrder.order_number }) : ''}
        allowCredit
        onPaid={() => { toast.success(tl("Order paid — we’re preparing it")); refetchOrders(); }}
        onClose={() => { setPayOrder(null); refetchOrders(); setTab('orders'); }}
      />
    </div>
  );
}