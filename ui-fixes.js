// CHUCHUS UI/UX FIXES
const tgUI = window.Telegram?.WebApp;
const ADMIN_IDS = new Set([123456789, 987654321]);
const KHQR_IMAGE_URL = window.CHUCHUS_KHQR_IMAGE_URL || '';

function isAdminUser() {
  const id = Number(tgUI?.initDataUnsafe?.user?.id || 0);
  return ADMIN_IDS.has(id);
}

function secureAdminButton() {
  const btn = document.getElementById('adminBtn');
  if (!btn) return;
  btn.style.display = isAdminUser() ? 'flex' : 'none';
  if (!isAdminUser()) {
    btn.replaceWith(btn.cloneNode(true));
  }
}

function enhanceHeader() {
  const title = document.getElementById('pageTitle');
  if (!title || document.querySelector('.brand-logo')) return;
  const header = document.querySelector('.header');
  if (!header) return;
  const brand = document.createElement('div');
  brand.className = 'brand-lockup';
  brand.innerHTML = '<img class="brand-logo" src="logo.svg" alt="Chuchus"><span class="brand-name">ហាងជជុស</span>';
  header.insertBefore(brand, title);
  title.classList.add('header-page-title');
}

function enhanceProductActions() {
  const add = document.getElementById('addToCartBtn');
  if (!add || document.getElementById('buyNowBtn')) return;
  add.innerHTML = '<i class="fas fa-cart-plus"></i> បន្ថែម​ទៅ​កន្ត្រក';
  const buy = document.createElement('button');
  buy.id = 'buyNowBtn';
  buy.type = 'button';
  buy.className = 'btn-primary btn-buy-now';
  buy.innerHTML = '<i class="fas fa-bolt"></i> បញ្ជាទិញ​ឥឡូវនេះ';
  buy.disabled = add.disabled;
  add.insertAdjacentElement('afterend', buy);
  buy.addEventListener('click', () => {
    if (add.disabled) return;
    add.click();
    setTimeout(() => {
      document.getElementById('cartBtn')?.click();
      setTimeout(() => document.getElementById('checkoutBtn')?.click(), 120);
    }, 80);
  });
  const sync = new MutationObserver(() => { buy.disabled = add.disabled; });
  sync.observe(add, { attributes: true, attributeFilter: ['disabled'] });
}

function enhanceCheckout() {
  const form = document.getElementById('checkoutForm');
  if (!form || document.getElementById('khqrPaymentCard')) return;
  const select = document.getElementById('checkoutPayment');
  if (!select) return;

  const card = document.createElement('div');
  card.id = 'khqrPaymentCard';
  card.className = 'payment-card';
  card.innerHTML = `
    <div class="payment-card-title"><i class="fas fa-qrcode"></i> KHQR Payment</div>
    <div class="khqr-box">
      ${KHQR_IMAGE_URL
        ? `<img src="${KHQR_IMAGE_URL}" alt="KHQR payment QR code" class="khqr-image">`
        : `<div class="khqr-missing"><i class="fas fa-qrcode"></i><strong>KHQR របស់ហាង</strong><span>សូមដាក់រូប KHQR របស់គណនីហាង ដើម្បីបើកការស្កេនបង់ប្រាក់</span></div>`}
    </div>
    <div class="payment-hint">ជ្រើស KHQR ហើយស្កេន QR ដើម្បីបង់ប្រាក់។</div>`;
  form.insertBefore(card, form.querySelector('button[type="submit"]'));

  const refresh = () => { card.style.display = select.value === 'khqr' ? 'block' : 'none'; };
  select.addEventListener('change', refresh);
  refresh();
}

function runUIFixes() {
  secureAdminButton();
  enhanceHeader();
  enhanceProductActions();
  enhanceCheckout();
}

runUIFixes();
const uiObserver = new MutationObserver(runUIFixes);
uiObserver.observe(document.getElementById('pageContainer') || document.body, { childList: true, subtree: true });
window.addEventListener('load', runUIFixes);
