(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'$'+Number(n||0).toFixed(2);
  const imgs=p=>Array.isArray(p?.image_urls)?p.image_urls:(p?.image_url?[p.image_url]:[]);
  const toast=msg=>{let e=document.querySelector('.toast');if(e)e.remove();e=document.createElement('div');e.className='toast';e.textContent=msg;document.body.append(e);setTimeout(()=>e.classList.add('show'),10);setTimeout(()=>e.remove(),2600)};
  const saveCart=(cart)=>{localStorage.setItem('chuchus_cart',JSON.stringify(cart));const b=document.getElementById('cartCount');if(b){const n=cart.reduce((a,x)=>a+Number(x.quantity||0),0);b.textContent=n;b.style.display=n?'inline-flex':'none'}};
  const getCart=()=>{try{return JSON.parse(localStorage.getItem('chuchus_cart')||'[]')}catch{return[]}};
  const supa=window.supabase?.createClient?.('https://gzclvhcvsfcslilxaiyg.supabase.co','sb_publishable_VVZOPQCUQFRDSlOgXhUI5g_kri2S-Ww');
  async function inventory(p){if(!supa)return null;let {data,error}=await supa.from('inventory').select('*').eq('product_id',p.id).gt('quantity',0).order('id').limit(20);if(error||!data?.length)return null;return data}
  async function quick(p,mode){
    const rows=await inventory(p);
    if(!rows?.length)return toast('ទំនិញនេះអស់ស្តុក');
    if(rows.length>1){toast('សូមជ្រើសរើសទំហំ/ពណ៌');document.querySelector(`.shop-card[data-id="${CSS.escape(String(p.id))}"]`)?.click();return}
    const v=rows[0],cart=getCart(),item={inventory_id:v.id,product_id:p.id,product_name:p.name,size:v.size||null,color:v.color||null,price:p.price,quantity:1,image_url:imgs(p)[0]||'',max_stock:v.quantity};
    if(mode==='add'){
      const old=cart.find(x=>String(x.inventory_id)===String(v.id));
      if(old)old.quantity=Math.min(Number(v.quantity),Number(old.quantity||0)+1);else cart.push(item);
      saveCart(cart);toast('បានបន្ថែមទៅកន្ត្រក');return;
    }
    sessionStorage.setItem('chuchus_quick_buy',JSON.stringify(item));
    document.querySelector(`.shop-card[data-id="${CSS.escape(String(p.id))}"]`)?.click();
  }
  function enhance(){
    const grid=document.getElementById('grid');if(!grid)return false;
    grid.querySelectorAll('.shop-card').forEach(card=>{
      if(card.dataset.actionsFixed==='1')return;
      const id=card.dataset.id;if(!id)return;
      const old=card.querySelector('button');if(!old)return;
      const actions=document.createElement('div');actions.className='home-card-actions';
      const add=document.createElement('button');add.type='button';add.className='home-add-btn';add.textContent='🛒 កន្ត្រក';
      const buy=document.createElement('button');buy.type='button';buy.className='home-buy-btn';buy.textContent='⚡ ទិញ';
      actions.append(add,buy);old.replaceWith(actions);card.dataset.actionsFixed='1';
      const products=window.__CHUCHUS_PRODUCTS__||[];const p=products.find(x=>String(x.id)===String(id));
      add.onclick=e=>{e.preventDefault();e.stopPropagation();if(p)quick(p,'add')};
      buy.onclick=e=>{e.preventDefault();e.stopPropagation();if(p)quick(p,'buy')};
      actions.onclick=e=>e.stopPropagation();
    });
    return true;
  }
  function wait(){if(enhance())return;setTimeout(wait,120)}
  const originalSetInterval=window.setInterval;
  window.setInterval=(fn,ms,...args)=>originalSetInterval(fn,Math.max(ms,500),...args);
  document.addEventListener('DOMContentLoaded',wait);
  wait();
})();
