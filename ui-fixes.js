// CHUCHUS UI SAFETY LAYER
// Header/admin presentation only. Cart + checkout interactions are owned by
// checkout-rpc.js so there is a single source of truth for order flow.

const tgUI = window.Telegram?.WebApp;
const ADMIN_IDS = new Set([123456789, 987654321]);
const $ui = (id) => document.getElementById(id);

function isAdminUser() {
  return ADMIN_IDS.has(Number(tgUI?.initDataUnsafe?.user?.id || 0));
}

function secureAdminButton() {
  const btn = $ui('adminBtn');
  if (!btn) return;
  btn.style.display = isAdminUser() ? 'flex' : 'none';
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

function runUIFixes() {
  secureAdminButton();
  enhanceHeader();
}

runUIFixes();
const root = $ui('pageContainer') || document.body;
const uiObserver = new MutationObserver(runUIFixes);
uiObserver.observe(root, { childList: true, subtree: true });

// IMPORTANT: no document-level click handlers here.
// Checkout inputs/buttons must never redirect to the cart.
