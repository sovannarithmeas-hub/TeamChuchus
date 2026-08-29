(()=>{
  const $=id=>document.getElementById(id),pg=$('pageContainer');
  if(!pg)return;

  const sync=()=>{
    const detail=pg.querySelector('.product-detail-v2');
    const other=pg.querySelector('.cart-head,.cart-row,.checkout-v2');
    const active=!!(detail||other);
    const header=document.querySelector('.header');
    const back=$('backBtn');

    if(header) header.classList.toggle('legacy-hidden-header',!active);
    if(back) back.style.display=active?'flex':'none';

    if(detail&&!detail.querySelector('.detail-back-btn')){
      const b=document.createElement('button');
      b.type='button';
      b.className='detail-back-btn';
      b.textContent='← ត្រឡប់ទៅទំនិញ';
      b.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        back?.click();
      };
      detail.insertBefore(b,detail.firstChild);
    }
  };

  const injectStyle=()=>{
    if(document.getElementById('product-back-fix-style'))return;
    const s=document.createElement('style');
    s.id='product-back-fix-style';
    s.textContent=`
      .header.legacy-hidden-header{display:none!important}
      .header:not(.legacy-hidden-header){position:sticky!important;top:0!important;z-index:100!important}
      .detail-back-btn{
        position:sticky!important;top:0!important;z-index:90!important;
        display:flex;align-items:center;width:100%;min-height:48px;
        margin:0;padding:10px 14px;border:0;border-bottom:1px solid #e5edf5;
        background:rgba(255,255,255,.97);backdrop-filter:blur(14px);
        color:#162238;font:800 14px/1.2 'Noto Sans Khmer',sans-serif;
        text-align:left;cursor:pointer;
      }
      .product-detail-v2{overflow:visible!important}
    `;
    document.head.appendChild(s);
  };

  const observer=new MutationObserver(sync);
  observer.observe(pg,{childList:true,subtree:true});
  injectStyle();
  sync();
})();
