(()=>{
  const $=id=>document.getElementById(id),pg=$('pageContainer');
  if(!pg)return;

  const sync=()=>{
    const detail=pg.querySelector('.product-detail-v2');
    const other=pg.querySelector('.cart-head,.cart-row,.checkout-v2');
    const active=!!(detail||other);
    const header=document.querySelector('.header');
    const back=$('backBtn');

    // Keep exactly one back button: the original header #backBtn.
    // Remove any legacy/injected detail back buttons left by older versions.
    pg.querySelectorAll('.detail-back-btn').forEach(el=>el.remove());

    if(header) header.classList.toggle('legacy-hidden-header',!active);
    if(back){
      back.style.display=active?'flex':'none';
      back.setAttribute('aria-label','ត្រឡប់ទៅទំនិញ');
      back.title='ត្រឡប់ទៅទំនិញ';
    }
  };

  const injectStyle=()=>{
    if(document.getElementById('product-back-fix-style'))return;
    const s=document.createElement('style');
    s.id='product-back-fix-style';
    s.textContent=`
      .header.legacy-hidden-header{display:none!important}
      .header:not(.legacy-hidden-header){
        position:sticky!important;
        top:0!important;
        z-index:1000!important;
      }
      .header:not(.legacy-hidden-header) #backBtn{
        display:flex!important;
        position:relative!important;
        flex:0 0 auto;
        align-items:center;
        justify-content:center;
        z-index:1001!important;
      }
      .detail-back-btn{display:none!important}
      .product-detail-v2{overflow:visible!important}
    `;
    document.head.appendChild(s);
  };

  const observer=new MutationObserver(sync);
  observer.observe(pg,{childList:true,subtree:true});
  injectStyle();
  sync();
})();
