import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzclvhcvsfcslilxaiyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y2x2aGN2c2Zjc2xpbHhhaXlnIiwicm9sZSI6IkFub24iLCJpYXQiOjE3ODYwMjUyMjAsImV4cCI6MjEwMTYwMTIyMH0.8gD4bwPpxdLl9kGtPVCRRPylEsES_DHWH4KhKDJvzuE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tg = window.Telegram?.WebApp;

const $ = (id) => document.getElementById(id);
const page = () => $('pageContainer');
let checkoutMode = null;
let buyNowItem = null;
let cartSelection = new Set();
let previousPage = 'home';

function toast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => el.classList.remove('show'), 3000);
    setTimeout(() => el.remove(), 3350);
}

function readCart() {
    try {
        const value = JSON.parse(localStorage.getItem('cart') || '[]');
        return Array.isArray(value) ? value : [];
    } catch { return []; }
}

function writeCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    const badge = $('cartCount');
    const total = cart.reduce((s, i) => s + Number(i.quantity || 0), 0);
    if (badge) {
        badge.textContent = total;
        badge.style.display = total ? 'inline' : 'none';
    }
}

function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function setTitle(title) {
    const titleEl = $('pageTitle');
    if (titleEl) titleEl.textContent = title;
    const back = $('backBtn');
    if (back) back.style.display = 'flex';
}

function selectedItems() {
    const cart = readCart();
    return cart.filter((_, index) => cartSelection.has(String(index)));
}

function renderBuyNowCheckout(item) {
    checkoutMode = 'buy-now';
    buyNowItem = item;
    previousPage = 'product';
    setTitle('បញ្ជាទិញឥឡូវនេះ');
    const total = Number(item.price) * Number(item.quantity);
    page().innerHTML = checkoutHtml([item], total);
    bindCheckout();
    window.scrollTo(0, 0);
}

function renderSelectedCheckout() {
    const items = selectedItems();
    if (!items.length) {
        toast('សូមជ្រើសរើសទំនិញយ៉ាងហោចណាស់មួយ');
        return;
    }
    checkoutMode = 'cart';
    buyNowItem = null;
    previousPage = 'cart';
    const total = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
    setTitle('បញ្ជាទិញ');
    page().innerHTML = checkoutHtml(items, total);
    bindCheckout();
    window.scrollTo(0, 0);
}

function checkoutHtml(items, total) {
    return `
      <div class="order-checkout" style="padding:14px 12px 100px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <button type="button" id="checkoutBack" aria-label="ត្រឡប់ក្រោយ" style="border:0;background:var(--tg-secondary-bg,#f2f2f2);border-radius:50%;width:40px;height:40px;font-size:18px;">←</button>
          <div><div style="font-size:20px;font-weight:800;">ពិនិត្យការបញ្ជាទិញ</div><div style="font-size:12px;color:var(--tg-hint);">សូមពិនិត្យព័ត៌មានមុនដាក់បញ្ជា</div></div>
        </div>
        <div style="background:var(--tg-section-bg,#fff);border-radius:16px;padding:12px;margin-bottom:12px;">
          ${items.map(i => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--tg-section-separator-color,#eee);">
            <img src="${esc(i.image_url || '')}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;background:#f3f3f3;" onerror="this.style.display='none'">
            <div style="flex:1"><div style="font-weight:700">${esc(i.product_name)}</div><div style="font-size:12px;color:var(--tg-hint)">ទំហំ ${esc(i.size)} · ${esc(i.color)} · x${Number(i.quantity)}</div><div style="font-weight:800;margin-top:4px">$${(Number(i.price)*Number(i.quantity)).toFixed(2)}</div></div>
          </div>`).join('')}
          <div style="display:flex;justify-content:space-between;padding-top:12px;font-weight:800"><span>សរុប</span><span>$${total.toFixed(2)}</span></div>
        </div>
        <form id="checkoutForm">
          <div style="background:var(--tg-section-bg,#fff);border-radius:16px;padding:14px;margin-bottom:12px;">
            <div style="font-weight:800;margin-bottom:10px">ព័ត៌មានដឹកជញ្ជូន</div>
            <label class="form-label">ឈ្មោះ</label><input class="form-input" id="checkoutName" required>
            <label class="form-label">លេខទូរស័ព្ទ</label><input class="form-input" id="checkoutPhone" type="tel" required>
            <label class="form-label">អាសយដ្ឋាន</label><textarea class="form-input" id="checkoutAddress" rows="3" required></textarea>
          </div>
          <div style="background:var(--tg-section-bg,#fff);border-radius:16px;padding:14px;margin-bottom:12px;">
            <div style="font-weight:800;margin-bottom:10px">វិធីបង់ប្រាក់</div>
            <select class="form-input" id="checkoutPayment"><option value="khqr">KHQR</option><option value="cash">ទូទាត់ពេលទទួលទំនិញ</option></select>
            <div id="khqrNotice" style="margin-top:10px;padding:12px;border-radius:12px;background:#f6f6f6;font-size:13px;color:var(--tg-hint);">បន្ទាប់ពីដាក់បញ្ជា សូមបង់តាម KHQR របស់ហាង និងផ្ញើភស្តុតាងទៅអ្នកគ្រប់គ្រង។</div>
          </div>
          <button type="submit" class="btn-primary btn-success" style="width:100%;font-size:16px;padding:14px;">ដាក់បញ្ជាទិញ · $${total.toFixed(2)}</button>
        </form>
      </div>`;
}

function bindCheckout() {
    $('checkoutBack')?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (previousPage === 'cart') renderCartFixed();
        else window.history.back();
    });
    $('checkoutPayment')?.addEventListener('change', (e) => {
        const n = $('khqrNotice'); if (n) n.style.display = e.target.value === 'khqr' ? 'block' : 'none';
    });
    document.querySelectorAll('#checkoutForm input, #checkoutForm textarea, #checkoutForm select').forEach(el => el.addEventListener('click', e => e.stopPropagation()));
}

function renderCartFixed() {
    checkoutMode = null;
    setTitle('កន្ត្រកទំនិញ');
    const cart = readCart();
    if (!cart.length) {
        page().innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--tg-hint)"><div style="font-size:48px">🛒</div><p>កន្ត្រករបស់អ្នកនៅទទេ</p></div>';
        return;
    }
    cartSelection = new Set(cart.map((_, i) => String(i)));
    const total = cart.reduce((s, i) => s + Number(i.price)*Number(i.quantity), 0);
    page().innerHTML = `<div style="padding:12px 12px 110px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:20px;font-weight:800">កន្ត្រក</div><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="selectAllCart" checked> ជ្រើសរើសទាំងអស់</label></div><div id="fixedCartItems">${cart.map((i,idx)=>cartItemHtml(i,idx)).join('')}</div><div style="position:fixed;left:0;right:0;bottom:0;padding:10px 12px;background:var(--tg-bg-color,#fff);border-top:1px solid var(--tg-section-separator-color,#ddd);display:flex;align-items:center;justify-content:space-between;gap:10px;z-index:20"><div><div style="font-size:12px;color:var(--tg-hint)">សរុប</div><strong id="cartSelectedTotal">$${total.toFixed(2)}</strong></div><button id="fixedCartCheckout" class="btn-primary btn-success" style="flex:1">ទិញឥឡូវនេះ</button></div></div>`;
    bindCartFixed();
}

function cartItemHtml(i, idx) {
    return `<div class="cart-fixed-item" data-index="${idx}" style="display:flex;gap:10px;padding:12px 4px;border-bottom:1px solid var(--tg-section-separator-color,#eee);align-items:center"><input class="cart-select" data-index="${idx}" type="checkbox" checked><img src="${esc(i.image_url||'')}" style="width:68px;height:68px;object-fit:cover;border-radius:10px;background:#f3f3f3" onerror="this.style.display='none'"><div style="flex:1"><div style="font-weight:700">${esc(i.product_name)}</div><div style="font-size:12px;color:var(--tg-hint)">${esc(i.size)} · ${esc(i.color)}</div><div style="display:flex;align-items:center;gap:7px;margin-top:6px"><button class="qty-minus" data-index="${idx}">−</button><span>${Number(i.quantity)}</span><button class="qty-plus" data-index="${idx}">+</button><strong style="margin-left:auto">$${(Number(i.price)*Number(i.quantity)).toFixed(2)}</strong></div></div><button class="cart-delete" data-index="${idx}" aria-label="លុប" style="border:0;background:none;font-size:18px">🗑️</button></div>`;
}

function bindCartFixed() {
    const stop = e => e.stopPropagation();
    page().querySelectorAll('input,button,label').forEach(el => el.addEventListener('click', stop));
    $('selectAllCart')?.addEventListener('change', e => {
        e.stopPropagation();
        cartSelection = e.target.checked ? new Set(readCart().map((_,i)=>String(i))) : new Set();
        page().querySelectorAll('.cart-select').forEach(c => c.checked = e.target.checked);
        updateCartTotal();
    });
    page().querySelectorAll('.cart-select').forEach(c => c.addEventListener('change', e => { e.stopPropagation(); if(e.target.checked) cartSelection.add(e.target.dataset.index); else cartSelection.delete(e.target.dataset.index); updateCartTotal(); }));
    page().querySelectorAll('.cart-delete').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const c=readCart(); c.splice(Number(b.dataset.index),1); writeCart(c); renderCartFixed(); toast('បានលុបទំនិញចេញពីកន្ត្រក'); }));
    page().querySelectorAll('.qty-minus,.qty-plus').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const c=readCart(); const i=c[Number(b.dataset.index)]; if(!i)return; if(b.classList.contains('qty-minus')) i.quantity=Math.max(1,Number(i.quantity)-1); else i.quantity=Math.min(Number(i.max_stock||999999),Number(i.quantity)+1); writeCart(c); renderCartFixed(); }));
    $('fixedCartCheckout')?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); renderSelectedCheckout(); });
}

function updateCartTotal() {
    const c=readCart(); const total=c.reduce((s,i,idx)=>s+(cartSelection.has(String(idx))?Number(i.price)*Number(i.quantity):0),0); const el=$('cartSelectedTotal'); if(el)el.textContent='$'+total.toFixed(2);
    const all=cartSelection.size===c.length; const a=$('selectAllCart'); if(a)a.checked=all;
}

function buildBuyNowFromProduct() {
    const card=document.querySelector('.product-detail');
    if(!card || $('buyNowDirectBtn')) return;
    const add=$('addToCartBtn');
    if(!add) return;
    const btn=document.createElement('button');
    btn.id='buyNowDirectBtn'; btn.className='btn-primary'; btn.style.cssText='width:100%;margin-top:10px;background:#111;color:#fff;';
    btn.innerHTML='<i class="fas fa-bolt"></i> បញ្ជាទិញឥឡូវនេះ';
    add.insertAdjacentElement('afterend',btn);
    btn.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        const product=window.__teamChuchusCurrentProduct;
        const size=document.querySelector('.size-btn.selected')?.dataset.size;
        const color=document.querySelector('.color-btn.selected')?.dataset.color;
        const qty=Number($('quantityDisplay')?.textContent||1);
        if(!product||!size||!color){toast('សូមជ្រើសរើសទំហំ និងពណ៌');return;}
        const inv=(window.__teamChuchusInventory||[]).find(i=>i.product_id===product.id&&i.size===size&&i.color===color);
        if(!inv||Number(inv.quantity)<qty){toast('មិនមានស្តុកគ្រប់គ្រាន់');return;}
        renderBuyNowCheckout({inventory_id:inv.id,product_id:product.id,product_name:product.name,size,color,price:product.price,quantity:qty,image_url:product.image_url,max_stock:inv.quantity});
    });
}

function patchProductContext() {
    try {
        const text=document.querySelector('.product-detail-name')?.textContent;
        if(!text)return;
        const img=document.querySelector('.product-detail-image')?.src||'';
        const price=(document.querySelector('.product-detail-price')?.textContent||'').replace(/[^0-9.]/g,'');
        const size=document.querySelector('.size-btn.selected')?.dataset.size;
        const color=document.querySelector('.color-btn.selected')?.dataset.color;
        if(window.__teamChuchusProducts) window.__teamChuchusCurrentProduct=window.__teamChuchusProducts.find(p=>p.name===text)||window.__teamChuchusCurrentProduct;
        if(window.__teamChuchusCurrentProduct) window.__teamChuchusCurrentProduct.image_url=window.__teamChuchusCurrentProduct.image_url||img;
        if(!window.__teamChuchusCurrentProduct && text) window.__teamChuchusCurrentProduct={name:text,price};
        buildBuyNowFromProduct();
    } catch {}
}

async function handleAtomicCheckout(event) {
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='checkoutForm')return;
    event.preventDefault();event.stopImmediatePropagation();
    const button=form.querySelector('button[type="submit"]'); if(button)button.disabled=true;
    const name=$('checkoutName')?.value.trim(), phone=$('checkoutPhone')?.value.trim(), address=$('checkoutAddress')?.value.trim(), paymentMethod=$('checkoutPayment')?.value;
    if(!name||!phone||!address){toast('សូមបំពេញព័ត៌មានឲ្យបានពេញលេញ');if(button)button.disabled=false;return;}
    const user=tg?.initDataUnsafe?.user;if(!user?.id){toast('មិនអាចកំណត់អត្តសញ្ញាណ Telegram បាន');if(button)button.disabled=false;return;}
    const items=checkoutMode==='buy-now'?[buyNowItem]:selectedItems(); if(!items.length){toast('មិនមានទំនិញសម្រាប់បញ្ជាទិញ');if(button)button.disabled=false;return;}
    try{
        const {data,error}=await supabase.rpc('place_order_atomic',{p_telegram_id:Number(user.id),p_username:user.username||null,p_first_name:name,p_phone:phone,p_address:address,p_payment_method:paymentMethod,p_items:items.map(i=>({inventory_id:i.inventory_id,quantity:Number(i.quantity)}))});
        if(error)throw error;
        if(!data?.order_id||!data?.order_number)throw new Error('ការឆ្លើយតបពី server មិនត្រឹមត្រូវ');
        if(checkoutMode==='cart'){const indexes=new Set(cartSelection);writeCart(readCart().filter((_,idx)=>!indexes.has(String(idx))));} else { const cart=readCart(); writeCart(cart.filter(i=>!(i.inventory_id===buyNowItem.inventory_id))); }
        const total=Number(data.total||0);
        page().innerHTML=`<div style="text-align:center;padding:50px 20px"><div style="font-size:64px">✅</div><h2>បញ្ជាទិញបានជោគជ័យ!</h2><p style="color:var(--tg-hint)">លេខបញ្ជា: <strong>${esc(data.order_number)}</strong></p><div style="margin:20px 0;padding:16px;border-radius:16px;background:var(--tg-section-bg,#f5f5f5)"><strong>សរុប $${total.toFixed(2)}</strong><p style="font-size:13px;color:var(--tg-hint)">${paymentMethod==='cash'?'សូមរង់ចាំការទាក់ទងពីអ្នកគ្រប់គ្រង':'សូមបង់តាម KHQR ហើយផ្ញើភស្តុតាងទៅអ្នកគ្រប់គ្រង'}</p></div><button class="btn-primary" id="orderDone">ត្រលប់ទៅទំព័រដើម</button></div>`;
        $('orderDone')?.addEventListener('click',()=>window.location.reload());
    }catch(error){console.error(error);toast(error?.message||'មានបញ្ហាក្នុងការបញ្ជាទិញ');if(button)button.disabled=false;}
}

document.addEventListener('submit',handleAtomicCheckout,true);

// Isolate cart/checkout click handling from the old app handlers.
document.addEventListener('click',e=>{
    const t=e.target.closest?.('button,a');
    if(t && (t.id==='checkoutBtn'||t.matches?.('#fixedCartCheckout'))){e.preventDefault();e.stopImmediatePropagation();renderSelectedCheckout();return;}
    if(t && /បញ្ជាទិញឥឡូវនេះ/.test(t.textContent||'')){e.preventDefault();e.stopImmediatePropagation();return;}
    if(document.querySelector('.product-detail')) setTimeout(patchProductContext,0);
},true);

const observer=new MutationObserver(()=>{
    if(document.querySelector('.product-detail')) setTimeout(patchProductContext,0);
    if(document.querySelector('.cart-items') && !document.querySelector('#fixedCartItems')) setTimeout(()=>renderCartFixed(),0);
});
observer.observe(document.body,{childList:true,subtree:true});

// Expose a safe hook for the existing module's product state without changing its source.
const oldPush=Array.prototype.push;
window.addEventListener('load',()=>{ try{ patchProductContext(); }catch{} });
