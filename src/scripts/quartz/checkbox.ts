/**
 * Checkbox 状态持久化脚本
 * 从 Quartz 迁移
 * 
 * 功能：保存 Markdown checkbox 的选中状态到 localStorage
 */

const checkboxId = (index: number) => {
  const slug = window.location.pathname;
  return `${slug}-checkbox-${index}`;
};

export function setupCheckbox() {
  const checkboxes = document.querySelectorAll(
    'input.checkbox-toggle',
  ) as NodeListOf<HTMLInputElement>;
  
  checkboxes.forEach((el, index) => {
    const elId = checkboxId(index);
    
    const switchState = (e: Event) => {
      const newCheckboxState = (e.target as HTMLInputElement)?.checked ? 'true' : 'false';
      localStorage.setItem(elId, newCheckboxState);
    };
    
    el.removeEventListener('change', switchState);
    el.addEventListener('change', switchState);
    
    // 恢复之前的状态
    if (localStorage.getItem(elId) === 'true') {
      el.checked = true;
    }
  });
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCheckbox);
} else {
  setupCheckbox();
}

// 页面导航后重新初始化
document.addEventListener('astro:page-load', setupCheckbox);

