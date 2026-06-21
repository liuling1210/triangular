export function setupPanelSections() {
  document.querySelectorAll('.panel-section-header').forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.closest('.panel-section');
      if (!section) return;
      const isOpen = section.classList.toggle('is-open');
      header.setAttribute('aria-expanded', String(isOpen));
    });
  });
}
