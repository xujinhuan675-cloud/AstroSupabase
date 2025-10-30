/**
 * ReaderMode 客户端脚本
 * 从 Quartz 迁移
 * 
 * 功能：切换阅读模式（隐藏/显示侧边栏）
 */

function toggleReaderMode() {
  const isReaderMode = document.body.classList.toggle('reader-mode');
  
  // 保存状态到 localStorage
  localStorage.setItem('reader-mode', isReaderMode ? 'true' : 'false');
  
  // 切换退出按钮显示
  toggleExitButton(isReaderMode);
}

function exitReaderMode() {
  document.body.classList.remove('reader-mode');
  localStorage.setItem('reader-mode', 'false');
  toggleExitButton(false);
}

function toggleExitButton(show: boolean) {
  let exitButton = document.getElementById('reader-mode-exit');
  
  if (show && !exitButton) {
    // 创建退出按钮
    exitButton = document.createElement('button');
    exitButton.id = 'reader-mode-exit';
    exitButton.className = 'reader-mode-exit';
    exitButton.setAttribute('aria-label', '退出阅读模式');
    exitButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      <span>退出阅读模式</span>
    `;
    exitButton.addEventListener('click', exitReaderMode);
    document.body.appendChild(exitButton);
  } else if (!show && exitButton) {
    // 移除退出按钮
    exitButton.remove();
  }
}

export function setupReaderMode() {
  // 恢复之前的状态
  const savedState = localStorage.getItem('reader-mode');
  const isReaderMode = savedState === 'true';
  
  if (isReaderMode) {
    document.body.classList.add('reader-mode');
    toggleExitButton(true);
  }

  // 绑定点击事件
  const readerModeButtons = document.getElementsByClassName('readermode');
  
  for (const button of readerModeButtons) {
    button.removeEventListener('click', toggleReaderMode);
    button.addEventListener('click', toggleReaderMode);
  }
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupReaderMode);
} else {
  setupReaderMode();
}

