document.querySelectorAll('[data-rail]').forEach(rail => {
  const shell = rail.closest('.rail-shell');
  if (!shell) return;

  const left = document.createElement('button');
  left.type = 'button';
  left.className = 'rail-arrow left';
  left.setAttribute('aria-label', 'Scroll left');
  left.innerHTML = '<span aria-hidden="true">‹</span>';

  const right = document.createElement('button');
  right.type = 'button';
  right.className = 'rail-arrow right';
  right.setAttribute('aria-label', 'Scroll right');
  right.innerHTML = '<span aria-hidden="true">›</span>';

  shell.appendChild(left);
  shell.appendChild(right);

  const step = () => Math.max(160, rail.clientWidth * 0.7);
  left.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  right.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));

  const update = () => {
    const overflow = rail.scrollWidth > rail.clientWidth + 2;
    const max = rail.scrollWidth - rail.clientWidth - 1;
    left.classList.toggle('hidden', !overflow || rail.scrollLeft <= 16);
    right.classList.toggle('hidden', !overflow || rail.scrollLeft >= max - 16);
  };

  rail.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(rail);
  setTimeout(update, 50);
  update();
});
