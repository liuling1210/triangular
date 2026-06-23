/** 控制面板折叠区块交互 */

/** 初始化面板各区块的展开/折叠点击行为 */
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
