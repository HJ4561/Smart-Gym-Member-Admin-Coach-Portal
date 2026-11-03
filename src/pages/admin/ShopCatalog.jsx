// src/pages/admin/ShopCatalog.jsx
// The member shop's catalogue: products (price, stock, photo, on sale or hidden), categories
// and promo codes. Orders are handled on Shop Orders.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { Drawer, Empty, ImageUploader, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { formatSAR } from '../../utils/money';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl, locale } from '../../i18n';
import { HIGHLIGHT_ROW, useHighlight } from '../../hooks/useHighlight';
import HighlightBar from '../../components/admin/HighlightBar';

const FILTERS = [['', tl("All")], ['active', tl("On sale")], ['low', tl("Low stock")], ['out', tl("Out of stock")], ['hidden', tl("Hidden")]];

export default function ShopCatalog() {
  const [tab, setTab] = useState('products');
  const { data: stats, refetch: refetchStats } = useApi(() => adminService.shopStats(), []);
  const { data: cats, refetch: refetchCats } = useApi(() => adminService.shopCategories(), []);
  const categories = Array.isArray(cats) ? cats : [];

  const tiles = [
    [tl("Products on sale"), stats?.products], [tl("Low stock"), stats?.low_stock], [tl("Out of stock"), stats?.out_of_stock],
    [tl("Hidden"), stats?.hidden], [tl("Orders, 30 days"), stats?.orders_30d], [tl("Sales, 30 days"), stats ? formatSAR(stats.sales_30d) : undefined],
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <PageHeader title={tl("Shop")} subtitle={tl("What members can buy in the portal. Paid orders take stock off automatically.")}>
        <Link to="/admin/shop-orders" className={btn.ghost}>{tl("Shop orders")}</Link>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg px-4 py-3">
            <div className="text-[22px] font-bold text-on-surface">{value ?? '—'}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-[#0e0e0f] border border-[#1a1a1e] p-1 rounded-lg w-fit" role="tablist">
        {[['products', tl("Products")], ['categories', tl("Categories")], ['promos', tl("Promo codes")]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider ${
              tab === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'products' && <Products categories={categories} onChanged={refetchStats} />}
      {tab === 'categories' && <Categories categories={categories} onChanged={() => { refetchCats(); refetchStats(); }} />}
      {tab === 'promos' && <Promos />}
    </div>
  );
}

function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="text-[11px] text-on-surface-variant">{hint}</span>}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </label>
  );
}

// ============================================================
// PRODUCTS
// ============================================================
function Products({ categories, onChanged }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const highlight = useHighlight();
  const { data, loading, refetch } = useApi(
    () => adminService.shopProducts({ q: q || undefined, status: status || undefined }), [q, status]);
  const list = Array.isArray(data) ? data : [];
  const saved = () => { refetch(); onChanged(); };
  const blank = { name: '', sku: '', description: '', category_id: categories[0]?.id || '', price: '', original_price: '',
    price_note: '', badge_top: '', badge_secondary: '', telemetry: [], stock_quantity: 0, stock_label: '',
    low_stock_threshold: 5, is_active: true, is_featured: false };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(([id, label]) => (
            <button key={id || 'all'} type="button" onClick={() => setStatus(id)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                status === id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input className={`${inputCls} md:w-64`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tl("Search name or SKU…")} aria-label={tl("Search products")} />
        <button type="button" className={btn.primary} disabled={!categories.length} onClick={() => setEditing(blank)}
          title={categories.length ? undefined : tl("Add a category first")}>{tl("+ Add product")}</button>
      </div>

      {!categories.length && <p className="text-[12px] text-amber-300">{tl("Add a category first (Categories tab), then add products to it.")}</p>}

      <HighlightBar highlight={highlight} noun={[tl('product'), tl('products')]} ready={!loading} />

      {loading ? (
        <div className="h-48 bg-[#0e0e0f] rounded-lg animate-pulse" />
      ) : list.length === 0 ? (
        <Empty>{q || status ? tl("No products match.") : tl("No products yet.")}</Empty>
      ) : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">{tl("Product")}</th><th className="px-4 py-3">{tl("Category")}</th><th className="px-4 py-3">{tl("Price")}</th>
                <th className="px-4 py-3">{tl("Stock")}</th><th className="px-4 py-3">{tl("Sold")}</th><th className="px-4 py-3">{tl("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => setEditing(p)} data-highlight={highlight.has(p.id)}
                  className={`border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer ${highlight.has(p.id) ? HIGHLIGHT_ROW : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        : <div className="w-10 h-10 rounded bg-[#1a1a1e]" />}
                      <div className="min-w-0">
                        <button type="button" className="text-on-surface font-bold truncate hover:underline text-left"
                          onClick={(e) => { e.stopPropagation(); setEditing(p); }}>{p.name}</button>
                        <div className="text-[11px] text-on-surface-variant font-mono">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.category}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatSAR(p.price)}
                    {p.original_price && <span className="ml-1 text-[11px] text-on-surface-variant line-through">{formatSAR(p.original_price)}</span>}</td>
                  <td className={`px-4 py-3 ${p.stock_quantity <= 0 ? 'text-rose-400' : p.is_low_stock ? 'text-amber-300' : 'text-on-surface'}`}>
                    {p.stock_quantity <= 0 ? tl("Out") : p.stock_quantity}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.total_sold}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${p.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
                      {p.is_active ? tl("On sale") : tl("Hidden")}</span>
                    {p.is_featured && <span className="ml-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-300">{tl("Featured")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProductEditor product={editing} categories={categories} onClose={() => setEditing(null)} onSaved={saved} />}
    </>
  );
}

function ProductEditor({ product, categories, onClose, onSaved }) {
  const [f, setF] = useState(() => ({ ...product, telemetry: (product.telemetry || []).join('\n'),
    original_price: product.original_price ?? '' }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  // SKU = the category's 3-letter prefix (fixed) + 4 digits typed here, e.g. PRO-0007.
  const [skuNum, setSkuNum] = useState(() => (/^[A-Z]{3}-(\d{4})$/.exec(product.sku || '') || [])[1] || '');
  const [skuHint, setSkuHint] = useState({ prefix: (product.sku || '').slice(0, 3), sku: '' });
  useEffect(() => {
    if (!f.category_id) return undefined;
    let alive = true;
    adminService.nextSku(f.category_id, f.id).then((r) => { if (alive) setSkuHint(r); }).catch(() => {});
    return () => { alive = false; };
  }, [f.category_id, f.id]);
  const changeCategory = (e) => {
    const id = e.target.value;
    setF((p) => ({ ...p, category_id: id }));
    if (String(id) !== String(product.category_id)) setSkuNum('');   // new prefix → next free number
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = {
      name: f.name, description: f.description, category_id: f.category_id, price: f.price,
      original_price: f.original_price === '' ? null : f.original_price, price_note: f.price_note,
      badge_top: f.badge_top, badge_secondary: f.badge_secondary, telemetry: f.telemetry,
      stock_quantity: f.stock_quantity, stock_label: f.stock_label, low_stock_threshold: f.low_stock_threshold,
      is_active: f.is_active, is_featured: f.is_featured,
    };
    body.sku = skuNum;   // empty → the next free number in the category
    try {
      const row = await adminService.saveProduct(f.id, body);
      toast.success(f.id ? 'Product saved' : tl("{0} added — add a photo now", { 0: row.name }));
      onSaved();
      if (f.id) onClose();
      else {
        setF({ ...row, telemetry: row.telemetry.join('\n'), original_price: row.original_price ?? '' });
        setSkuNum(row.sku.slice(4));
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl("Could not save the product")));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(tl("Delete {0}?", { 0: f.name }))) return;
    try {
      await adminService.deleteProduct(f.id);
      toast.success(tl("Product deleted"));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not delete")));
    }
  };

  const upload = async (file) => {
    try {
      const row = await adminService.uploadProductImage(f.id, file);
      setF((p) => ({ ...p, image_url: row.image_url }));
      toast.success(tl("Photo updated"));
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, tl("Upload failed")));
      throw err;
    }
  };

  return (
    <Drawer open title={f.id ? f.name : tl("Add product")} onClose={onClose} subtitle={f.id ? tl("SKU {0}", { 0: f.sku }) : tl("Shown to members as soon as it’s saved and on sale.")}
      footer={<>
        {f.id && <button type="button" className={btn.danger} onClick={remove}>{tl("Delete")}</button>}
        <div className="flex-1" />
        <button type="button" className={btn.ghost} onClick={onClose}>{tl("Close")}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl("Saving…") : tl("Save")}</button>
      </>}>
      {f.id ? (
        <div className="max-w-[240px]"><ImageUploader label={tl("Photo")} aspect="aspect-square" url={f.image_url} customized={!!f.image_url} onUpload={upload} /></div>
      ) : <p className="text-[12px] text-on-surface-variant">{tl("You can add a photo after the first save.")}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={tl("Name")} error={errors.name} className="md:col-span-2"><input className={inputCls} value={f.name} onChange={set('name')} /></Field>
        <Field label={tl("Category")} error={errors.category_id}>
          <select className={inputCls} value={f.category_id} onChange={changeCategory}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : tl(" (hidden)")}</option>)}
          </select></Field>
        <Field label={tl("SKU")} error={errors.sku}
          hint={tl("Fixed format: category letters + 4 digits. Leave the number empty to use the next free one ({0}).", { 0: skuHint.sku || '…' })}>
          <div className="flex items-stretch">
            <span aria-hidden="true"
              className="px-3 grid place-items-center rounded-l-md border border-r-0 border-[#26262b] bg-[#131316] font-mono text-[13px] text-on-surface-variant select-none">
              {skuHint.prefix || '???'}-
            </span>
            <input className={`${inputCls} rounded-l-none font-mono`} inputMode="numeric" maxLength={4} value={skuNum}
              aria-label={tl("SKU number (4 digits)")} placeholder={(skuHint.sku || '').slice(4) || '0001'}
              onChange={(e) => setSkuNum(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div></Field>
        <Field label={tl("Price (SAR, VAT included)")} error={errors.price}><input className={inputCls} inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
        <Field label={tl("Was (SAR, optional)")} error={errors.original_price} hint={tl("Shows a crossed-out price.")}><input className={inputCls} inputMode="decimal" value={f.original_price} onChange={set('original_price')} /></Field>
        <Field label={tl("In stock")} error={errors.stock_quantity}><input className={inputCls} type="number" min="0" value={f.stock_quantity} onChange={set('stock_quantity')} /></Field>
        <Field label={tl("Warn when stock is at or below")} error={errors.low_stock_threshold}><input className={inputCls} type="number" min="0" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} /></Field>
        <Field label={tl("Description")} error={errors.description} className="md:col-span-2"><textarea className={inputCls} rows={3} value={f.description} onChange={set('description')} /></Field>
        <Field label={tl("Badge")} error={errors.badge_top} hint={tl("e.g. Best seller")}><input className={inputCls} value={f.badge_top} onChange={set('badge_top')} /></Field>
        <Field label={tl("Second badge")} error={errors.badge_secondary}><input className={inputCls} value={f.badge_secondary} onChange={set('badge_secondary')} /></Field>
        <Field label={tl("Price note")} error={errors.price_note}><input className={inputCls} value={f.price_note} onChange={set('price_note')} placeholder={tl("Per tub")} /></Field>
        <Field label={tl("Stock note")} error={errors.stock_label}><input className={inputCls} value={f.stock_label} onChange={set('stock_label')} placeholder={tl("Ships in 2 days")} /></Field>
        <Field label={tl("Key facts (one per line, up to 6)")} error={errors.telemetry} className="md:col-span-2">
          <textarea className={inputCls} rows={3} value={f.telemetry} onChange={set('telemetry')} placeholder={tl("25 g protein per scoop\n30 servings")} /></Field>
      </div>
      <div className="flex flex-col gap-2 text-[13px] text-on-surface">
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!f.is_active} onChange={set('is_active')} />{tl("On sale (members can see and buy it)")}</label>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!f.is_featured} onChange={set('is_featured')} />{tl("Featured (shown first)")}</label>
      </div>
    </Drawer>
  );
}

// ============================================================
// CATEGORIES
// ============================================================
function Categories({ categories, onChanged }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(tl("Type a category name first"));
      document.getElementById('new-category-name')?.focus();
      return;
    }
    setBusy(true);
    try {
      await adminService.saveCategory(null, { name: name.trim() });
      setName('');
      toast.success(tl("Category added"));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not add the category")));
    } finally {
      setBusy(false);
    }
  };
  const update = async (c, body, msg) => {
    try {
      await adminService.saveCategory(c.id, body);
      if (msg) toast.success(msg);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not save")));
    }
  };
  const rename = (c) => {
    const n = window.prompt(tl("Category name"), c.name);
    if (n && n.trim() && n.trim() !== c.name) update(c, { name: n.trim() }, 'Renamed');
  };
  const remove = async (c) => {
    if (!window.confirm(tl("Delete {0}?", { 0: c.name }))) return;
    try {
      await adminService.deleteCategory(c.id);
      toast.success(tl("Category deleted"));
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not delete")));
    }
  };
  const move = (i, d) => {
    const a = categories[i];
    const b = categories[i + d];
    update(a, { display_order: b.display_order });
    update(b, { display_order: a.display_order === b.display_order ? a.display_order + d : a.display_order });
  };

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <form onSubmit={add} className="flex gap-2">
        <input id="new-category-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={tl("New category, e.g. Protein")} aria-label={tl("New category name")} />
        <button type="submit" className={btn.primary} disabled={busy}>{busy ? tl("Adding…") : tl("+ Add category")}</button>
      </form>
      {categories.length === 0 ? <Empty>{tl("No categories yet.")}</Empty> : categories.map((c, i) => (
        <div key={c.id} className="flex items-center gap-2 bg-[#0e0e0f] border border-[#1a1a1e] rounded px-3 py-2 text-[13px]">
          <div className="flex-1 min-w-0">
            <span className={`font-bold ${c.is_active ? 'text-on-surface' : 'text-on-surface-variant line-through'}`}>{c.name}</span>
            <span className="text-[11px] text-on-surface-variant"> · {c.products} product{c.products === 1 ? '' : 's'}</span>
          </div>
          <button type="button" className={btn.ghost} disabled={i === 0} onClick={() => move(i, -1)} aria-label={tl("Move up")}>↑</button>
          <button type="button" className={btn.ghost} disabled={i === categories.length - 1} onClick={() => move(i, 1)} aria-label={tl("Move down")}>↓</button>
          <button type="button" className={btn.ghost} onClick={() => rename(c)}>{tl("Rename")}</button>
          <button type="button" className={btn.ghost} onClick={() => update(c, { is_active: !c.is_active }, c.is_active ? 'Hidden from members' : 'Shown to members')}>
            {c.is_active ? tl("Hide") : tl("Show")}</button>
          {c.products === 0 && <button type="button" className={btn.danger} onClick={() => remove(c)}>{tl("Delete")}</button>}
        </div>
      ))}
      <p className="text-[11px] text-on-surface-variant">{tl("Hiding a category hides all of its products from members.")}</p>
    </div>
  );
}

// ============================================================
// PROMO CODES
// ============================================================
function Promos() {
  const { data, loading, refetch } = useApi(() => adminService.shopPromos(), []);
  const [editing, setEditing] = useState(null);
  const list = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button type="button" className={btn.primary} onClick={() => setEditing({ code: '', description: '', discount_percent: 10, max_uses: '', valid_from: '', valid_until: '', is_active: true })}>
          {tl("+ New promo code")}</button>
      </div>
      {loading ? <div className="h-24 bg-[#0e0e0f] rounded-lg animate-pulse" /> : list.length === 0 ? <Empty>{tl("No promo codes yet.")}</Empty> : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">{tl("Code")}</th><th className="px-4 py-3">{tl("Discount")}</th><th className="px-4 py-3">{tl("Used")}</th>
                <th className="px-4 py-3">{tl("Valid")}</th><th className="px-4 py-3">{tl("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => setEditing(p)} className="border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer">
                  <td className="px-4 py-3"><span className="font-mono font-bold text-primary">{p.code}</span>
                    {p.description && <div className="text-[11px] text-on-surface-variant">{p.description}</div>}</td>
                  <td className="px-4 py-3">{p.discount_percent}%</td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                    {p.valid_from ? new Date(p.valid_from).toLocaleDateString(locale) : tl("Now")} → {p.valid_until ? new Date(p.valid_until).toLocaleDateString(locale) : tl("No end")}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${p.is_valid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
                    {p.is_valid ? tl("Working") : tl("Not working")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <PromoEditor promo={editing} onClose={() => setEditing(null)} onSaved={refetch} />}
    </div>
  );
}

function PromoEditor({ promo, onClose, onSaved }) {
  const day = (v) => (v ? String(v).slice(0, 10) : '');
  const [f, setF] = useState({ ...promo, valid_from: day(promo.valid_from), valid_until: day(promo.valid_until), max_uses: promo.max_uses ?? '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await adminService.savePromo(f.id, { code: f.code, description: f.description, discount_percent: f.discount_percent,
        max_uses: f.max_uses === '' ? null : f.max_uses, valid_from: f.valid_from || null, valid_until: f.valid_until || null, is_active: f.is_active });
      toast.success(tl("Promo code saved"));
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl("Could not save")));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(tl("Delete {0}?", { 0: f.code }))) return;
    try {
      await adminService.deletePromo(f.id);
      toast.success(tl("Deleted"));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not delete")));
    }
  };

  return (
    <Drawer open title={f.id ? f.code : tl("New promo code")} onClose={onClose} subtitle={tl("Members type it at checkout for a percentage off the shop order.")}
      footer={<>
        {f.id && !f.used_count && <button type="button" className={btn.danger} onClick={remove}>{tl("Delete")}</button>}
        <div className="flex-1" />
        <button type="button" className={btn.ghost} onClick={onClose}>{tl("Cancel")}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl("Saving…") : tl("Save")}</button>
      </>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={tl("Code")} error={errors.code} hint={tl("Letters and numbers; members can type it in any case.")}><input className={`${inputCls} font-mono uppercase`} value={f.code} onChange={set('code')} /></Field>
        <Field label={tl("Discount %")} error={errors.discount_percent}><input className={inputCls} type="number" min="1" max="90" value={f.discount_percent} onChange={set('discount_percent')} /></Field>
        <Field label={tl("Description (staff only)")} error={errors.description} className="md:col-span-2"><input className={inputCls} value={f.description} onChange={set('description')} /></Field>
        <Field label={tl("Starts")} error={errors.valid_from}><input className={inputCls} type="date" value={f.valid_from} onChange={set('valid_from')} /></Field>
        <Field label={tl("Ends")} error={errors.valid_until}><input className={inputCls} type="date" value={f.valid_until} onChange={set('valid_until')} /></Field>
        <Field label={tl("Max uses (optional)")} error={errors.max_uses}><input className={inputCls} type="number" min="1" value={f.max_uses} onChange={set('max_uses')} /></Field>
      </div>
      <label className="flex items-start gap-2 text-[13px] text-on-surface"><input type="checkbox" className="mt-1" checked={!!f.is_active} onChange={set('is_active')} />{tl("Switched on")}</label>
    </Drawer>
  );
}
