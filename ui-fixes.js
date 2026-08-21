// CHUCHUS E-COMMERCE UI / ORDER FLOW
// Mobile-first flow inspired by modern marketplace apps (not a Taobao clone).

const tgUI = window.Telegram?.WebApp;
const ADMIN_IDS = new Set([123456789, 987654321]);
const KHQR_IMAGE_URL = window.CHUCHUS_KHQR_IMAGE_URL || '';
const CHECKOUT_BACKUP_KEY = 'chuchus_checkout_backup';

const $ui = (id) => document.getElementById(id);

function isAdminUser() {
  const id = Number(tgUI?.initDataUnsafe?.user?.id || 0);
  return ADMIN_IDS.has(id);
}

function toast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 2700);
  setTimeout(() => el.remove(), 3050);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch { return []; }
}

function writeCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  const badge = $ui('cartCount');
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
  }
}

function saveCheckoutBackup() {
  if (!sessionStorage.getItem(CHECKOUT_BACKUP_KEY)) {
    sessionStorage.setItem(CHECKOUT_BACKUP_KEY, JSON.stringify(readCart()));
  }
}

function restoreCheckoutBackup() {
  const raw = sessionStorage.getItem(CHECKOUT_BACKUP_KEY);
  if (!raw) return false;
  try { writeCart(JSON.parse(raw)); } catch { /* ignore */ }
  sessionStorage.removeItem(CHECKOUT_BACKUP_KEY);
  return true;
}

function setHeader(title, showBack = true) {
  const back = $ui('backBtn');
  const pageTitle = $ui('pageTitle');
  if (back) back.style.display = showBack ? 'flex' : 'none';
  if (pageTitle) pageTitle.textContent = title;
}

function secureAdminButton() {
  const btn = $ui('adminBtn');
  if (!btn) return;
  const allowed = isAdminUser();
  btn.style.display = allowed ? 'flex' : 'none';
  if (!allowed) {
    const clean = btn.cloneNode(true);
    clean.style.display = 'none';
    btn.replaceWith(clean);
  }
}

function enhanceHeader() {
  const header = document.querySelector('.header');
  if (!header || header.querySelector('.brand-lockup')) return;
  const title = $ui('pageTitle');
  const brand = document.createElement('div');
  brand.className = 'brand-lockup';
  brand.innerHTML = '<img class="brand-logo" src="logo.svg" alt="Chuchus"><span class="brand-name">ហាងជជុស</span>';
  header.insertBefore(brand, title);
  title?.classList.add('header-page-title');
}

function getCurrentProductSnapshot() {
  const add = $ui('addToCartBtn');
  if (!add) return null;
  const image = document.querySelector('.product-detail-image')?.src || '';
  const name = document.querySelector('.product-detail-name')?.textContent?.trim() || '';
  const priceText = document.querySelector('.product-detail-price')?.textContent?.replace(/[^0-9.]/g, '') || '0';
  const selectedSize = document.querySelector('.size-btn.selected')?.dataset.size;
  const selectedColor = document.querySelector('.color-btn.selected')?.dataset.color;
  const qty = Number($ui('quantityDisplay')?.textContent || 1);
  const productId = document.querySelector('.product-detail')?.dataset?.productId || '';
  return { image, name, price: Number(priceText), size: selectedSize, color: selectedColor, quantity: qty, productId };
}

function addBuyNowButton() {
  const add = $ui('addToCartBtn');
  if (!add || $ui('buyNowBtn')) return;

  const buy = document.createElement('button');
  buy.id = 'buyNowBtn';
  buy.type = 'button';
  buy.className = 'btn-primary btn-buy-now';
  buy.innerHTML = '<i class="fas fa-bolt"></i> បញ្ជាទិញឥឡូវនេះ';
  buy.disabled = add.disabled;
  add.insertAdjacentElement('afterend', buy);

  buy.addEventListener('click', () => {
    if (add.disabled) return;
    // Let the existing app handler create the canonical cart item.
    add.click();
    setTimeout(() => {
      const cart = readCart();
      if (!cart.length) return;
      saveCheckoutBackup();
      // Buy Now means exactly the selected product, not the whole cart.
      writeCart([cart[cart.length - 1]]);
      renderMarketplaceCheckout('buy-now');
    }, 60);
  });

  const sync = new MutationObserver(() => { buy.disabled = add.disabled; });
  sync.observe(add, { attributes: true, attributeFilter: ['disabled'] });
}

function enhanceKhqr(form) {
  if (!form || $('khqrPaymentCard')) return;
  const select = $ui('checkoutPayment');
  if (!select) return;
  const card = document.createElement('div');
  card.id = 'khqrPaymentCard';
  card.className = 'payment-card';
  card.innerHTML = `
    <div class="payment-card-title"><i class="fas fa-qrcode"></i> KHQR</div>
    <div class="khqr-box">
      ${KHQR_IMAGE_URL
        ? `<img src="${escapeHtml(KHQR_IMAGE_URL)}" alt="KHQR payment QR code" class="khqr-image">`
        : `<div class="khqr-missing"><i class="fas fa-qrcode"></i><strong>KHQR របស់ហាង</strong><span>មិនទាន់បានដាក់រូប KHQR ពិតរបស់ហាង</span></div>`}
    </div>
    <div class="payment-hint">ជ្រើស KHQR រួចស្កេន QR ដើម្បីបង់ប្រាក់។</div>`;
  form.insertBefore(card, form.querySelector('button[type="submit"]'));
  const refresh = () => { card.style.display = select.value === 'khqr' ? 'block' : 'none'; };
  select.addEventListener('change', refresh);
  refresh();
}

function renderMarketplaceCheckout(source = 'cart') {
  const cart = readCart();
  if (!cart.length) { toast('កន្ត្រករបស់អ្នកនៅទទេ'); return; }

  setHeader('បញ្ជាទិញ', true);
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const itemsHtml = cart.map(item => `
    <div class="checkout-item">
      <img src="${escapeHtml(item.image_url || '')}" alt="${escapeHtml(item.product_name)}" onerror="this.style.display='none'">
      <div class="checkout-item-main">
        <strong>${escapeHtml(item.product_name)}</strong>
        <span>${escapeHtml(item.size)} · ${escapeHtml(item.color)} · x${Number(item.quantity)}</span>
      </div>
      <b>$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</b>
    </div>`).join('');

  const container = $ui('pageContainer');
  if (!container) return;
  container.innerHTML = `
    <section class="market-checkout">
      <div class="checkout-step"><span>1</span><div><b>ទំនិញ</b><small>ពិនិត្យទំនិញដែលអ្នកជ្រើស</small></div></div>
      <div class="checkout-items">${itemsHtml}</div>
      <form id="checkoutForm" class="market-checkout-form">
        <div class="checkout-section-title">ព័ត៌មានដឹកជញ្ជូន</div>
        <div class="form-group"><label class="form-label">ឈ្មោះ</label><input class="form-input" id="checkoutName" value="${escapeHtml(tgUI?.initDataUnsafe?.user?.first_name || '')}" required></div>
        <div class="form-group"><label class="form-label">លេខទូរស័ព្ទ</label><input class="form-input" id="checkoutPhone" placeholder="0xx xxx xxx" required></div>
        <div class="form-group"><label class="form-label">អាសយដ្ឋានដឹកជញ្ជូន</label><textarea class="form-input" id="checkoutAddress" rows="3" placeholder="ផ្ទះ / ផ្លូវ / ខណ្ឌ / រាជធានី" required></textarea></div>
        <div class="checkout-section-title">ការទូទាត់</div>
        <select class="form-input" id="checkoutPayment">
          <option value="khqr">KHQR</option><option value="aba">ABA Payway</option><option value="wing">Wing Bank</option><option value="truemoney">TrueMoney</option><option value="cash">ទូទាត់ពេលទទួលទំនិញ</option>
        </select>
        <div id="khqrPaymentCard" class="payment-card" style="margin-top:12px;">
          <div class="payment-card-title"><i class="fas fa-qrcode"></i> KHQR</div>
          <div class="khqr-box">${KHQR_IMAGE_URL ? `<img src="${escapeHtml(KHQR_IMAGE_URL)}" alt="KHQR" class="khqr-image">` : '<div class="khqr-missing"><i class="fas fa-qrcode"></i><strong>KHQR របស់ហាង</strong><span>សូមបន្ថែមរូប KHQR ពិតរបស់ហាងក្នុង config</span></div>'}</div>
        </div>
        <div class="checkout-summary"><div><span>ទំនិញ</span><b>$${total.toFixed(2)}</b></div><div><span>ដឹកជញ្ជូន</span><b>គណនាតាមតំបន់</b></div><div class="checkout-grand"><span>សរុប</span><b>$${total.toFixed(2)}</b></div></div>
        <button type="submit" class="btn-primary btn-success checkout-submit"><i class="fas fa-check"></i> ដាក់បញ្ជាទិញ</button>
      </form>
    </section>`;

  const payment = $ui('checkoutPayment');
  payment?.addEventListener('change', () => {
    const card = $ui('khqrPaymentCard');
    if (card) card.style.display = payment.value === 'khqr' ? 'block' : 'none';
  });
  $ui('khqrPaymentCard').style.display = payment.value === 'khqr' ? 'block' : 'none';
  // checkout-rpc.js owns the secure submit/RPC handler.
  container.dataset.marketCheckout = source;
}

function renderSelectedCart() {
  const cart = readCart();
  if (!cart.length) {
    $ui('pageContainer').innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-bag"></i><h3>កន្ត្រកនៅទទេ</h3><p>ស្វែងរកផលិតផលដែលអ្នកចូលចិត្ត</p><button class="btn-primary" id="emptyCartHome">ចាប់ផ្តើមទិញ</button></div>';
    $ui('emptyCartHome')?.addEventListener('click', () => location.reload());
    return;
  }

  setHeader('កន្ត្រកទំនិញ', true);
  let selected = cart.map(() => true);
  const container = $ui('pageContainer');
  container.innerHTML = `
    <section class="market-cart">
      <div class="cart-toolbar"><label><input type="checkbox" id="selectAllCart" checked> ជ្រើសទាំងអស់</label><button id="deleteSelectedCart" class="text-danger">លុប</button></div>
      <div id="marketCartItems"></div>
      <div class="cart-bottom-bar"><div><small>សរុប</small><strong id="marketCartTotal">$0.00</strong></div><button id="marketCheckoutBtn" class="btn-primary">ទិញឥឡូវនេះ</button></div>
    </section>`;

  function draw() {
    const current = readCart();
    const list = $ui('marketCartItems');
    list.innerHTML = current.map((item, index) => `
      <article class="market-cart-item">
        <input class="cart-check" data-index="${index}" type="checkbox" ${selected[index] ? 'checked' : ''}>
        <img src="${escapeHtml(item.image_url || '')}" alt="${escapeHtml(item.product_name)}" onerror="this.style.display='none'">
        <div class="market-cart-main"><b>${escapeHtml(item.product_name)}</b><span>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</span><strong>$${Number(item.price).toFixed(2)}</strong>
          <div class="market-qty"><button data-act="minus" data-index="${index}">−</button><span>${Number(item.quantity)}</span><button data-act="plus" data-index="${index}">+</button></div>
        </div><button class="cart-delete-one" data-index="${index}" aria-label="លុប"><i class="fas fa-trash"></i></button>
      </article>`).join('');
    const total = current.reduce((sum, item, i) => selected[i] ? sum + Number(item.price) * Number(item.quantity) : sum, 0);
    $ui('marketCartTotal').textContent = `$${total.toFixed(2)}`;
    $ui('selectAllCart').checked = selected.length > 0 && selected.every(Boolean);
  }

  container.onclick = (event) => {
    const check = event.target.closest('.cart-check');
    const act = event.target.closest('[data-act]');
    const del = event.target.closest('.cart-delete-one');
    const current = readCart();
    if (check) { selected[Number(check.dataset.index)] = check.checked; draw(); return; }
    if (act) {
      const i = Number(act.dataset.index); const next = Math.max(1, Number(current[i].quantity) + (act.dataset.act === 'plus' ? 1 : -1));
      current[i].quantity = next; writeCart(current); draw(); return;
    }
    if (del) {
      const i = Number(del.dataset.index); current.splice(i, 1); selected.splice(i, 1); writeCart(current); draw(); toast('បានលុបទំនិញចេញពីកន្ត្រក'); return;
    }
  };
  $ui('selectAllCart').addEventListener('change', e => { selected = readCart().map(() => e.target.checked); draw(); });
  $ui('deleteSelectedCart').addEventListener('click', () => {
    const current = readCart().filter((_, i) => !selected[i]);
    writeCart(current); selected = current.map(() => true); draw(); toast('បានលុបទំនិញដែលបានជ្រើស');
  });
  $ui('marketCheckoutBtn').addEventListener('click', () => {
    const current = readCart(); const chosen = current.filter((_, i) => selected[i]);
    if (!chosen.length) { toast('សូមជ្រើសទំនិញយ៉ាងហោចណាស់មួយ'); return; }
    saveCheckoutBackup(); writeCart(chosen); renderMarketplaceCheckout('cart');
  });
  draw();
}

function handleBackForMarketplace(event) {
  const container = $ui('pageContainer');
  if (!container) return;
  const checkout = container.dataset.marketCheckout;
  if (!checkout) return;
  event.preventDefault(); event.stopImmediatePropagation();
  restoreCheckoutBackup();
  container.dataset.marketCheckout = '';
  renderSelectedCart();
}

function enhanceCurrentPage() {
  secureAdminButton();
  enhanceHeader();
  const add = $ui('addToCartBtn');
  if (add) addBuyNowButton();

  const form = $ui('checkoutForm');
  if (form && !form.closest('.market-checkout')) enhanceKhqr(form);
}

// Capture the cart button so it always opens the improved marketplace cart.
document.addEventListener('click', (event) => {
  const cartButton = event.target.closest('#cartBtn');
  if (cartButton) {
    event.preventDefault(); event.stopImmediatePropagation();
    renderSelectedCart();
  }
}, true);

document.addEventListener('click', handleBackForMarketplace, true);

function runUIFixes() {
  secureAdminButton();
  enhanceHeader();
  const add = $ui('addToCartBtn');
  if (add) addBuyNowButton();
  const form = $ui('checkoutForm');
  if (form && !form.closest('.market-checkout')) enhanceKhqr(form);
}

runUIFixes();
const uiObserver = new MutationObserver(runUIFixes);
uiObserver.observe($ui('pageContainer') || document.body, { childList: true, subtree: true });
window.addEventListener('load', runUIFixes);
