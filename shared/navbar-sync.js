function syncButtonCollapsedState(btnId) {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const refItem = container.querySelector('li:not(#ym-sync-button):not(#ym-theme-button)');
  const btn = document.getElementById(btnId);
  if (!refItem || !btn) return;

  // 1. Копируем классы списка
  const refItemClasses = Array.from(refItem.classList);
  btn.className = refItemClasses.join(' ') + ' ym-navbar-item-injected';

  // 2. Копируем классы ссылки
  const refLink = refItem.querySelector('a');
  const link = btn.querySelector('a');
  if (refLink && link) {
    link.className = refLink.className;
  }

  // 3. Синхронизируем класс скрытия текста на спане
  const refSpan = refLink ? refLink.querySelector('span') : null;
  const span = link ? link.querySelector('.nxMXCBiVfgH4oxds3f2y span') : null;
  if (refSpan && span) {
    const collapsedClass = Array.from(refSpan.classList).find(c => c.includes('title_collapsed') || c.includes('_title_collapsed'));

    // Удалим старые collapsed-классы с нашего спана
    const oldCollapsedClasses = Array.from(span.classList).filter(c => c.includes('title_collapsed') || c.includes('_title_collapsed'));
    oldCollapsedClasses.forEach(c => span.classList.remove(c));
    if (collapsedClass) {
      span.classList.add(collapsedClass);
      btn.classList.add('ym-collapsed');
    } else {
      btn.classList.remove('ym-collapsed');
    }
  }
}