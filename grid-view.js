(() => {
  const GRID_MODES = ['compact', 'comfortable', 'list'];

  function setMode(mode, buttons) {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;
    const next = GRID_MODES.includes(mode) ? mode : 'compact';
    GRID_MODES.forEach(m => grid.classList.remove(`grid-mode-${m}`));
    grid.classList.add(`grid-mode-${next}`);
    buttons.forEach((button, index) => button.classList.toggle('active', GRID_MODES[index] === next));
    try { localStorage.setItem('chuchus_grid_mode', next); } catch {}
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.legacy-view button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const buttons = [...document.querySelectorAll('.legacy-view button')];
    const index = buttons.indexOf(button);
    setMode(GRID_MODES[index] || 'compact', buttons);
  });

  const observer = new MutationObserver(() => {
    const buttons = [...document.querySelectorAll('.legacy-view button')];
    const grid = document.querySelector('.products-grid');
    if (!buttons.length || !grid || grid.dataset.gridReady) return;
    grid.dataset.gridReady = '1';
    let saved = 'compact';
    try { saved = localStorage.getItem('chuchus_grid_mode') || 'compact'; } catch {}
    setMode(saved, buttons);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
