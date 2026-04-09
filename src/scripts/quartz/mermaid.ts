/**
 * Mermaid 客户端渲染脚本
 * 
 * 说明：
 * - Markdown 处理阶段会将 ```mermaid 代码块转换为 <pre class="mermaid">...</pre>
 * - 本脚本在客户端将其渲染为 SVG
 */

import mermaid from "mermaid"

function getTheme(): "default" | "dark" {
  const savedTheme = document.documentElement.getAttribute("saved-theme")
  return savedTheme === "dark" ? "dark" : "default"
}

function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: getTheme(),
  })
}

async function renderMermaid() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("pre.mermaid, .mermaid"))
  if (nodes.length === 0) return

  for (const el of nodes) {
    // mermaid 渲染后会覆盖内容，因此提前缓存源文本，便于主题切换时重渲染
    const cached = el.getAttribute("data-mermaid-src")
    const src = cached ?? (el.textContent ?? "").trim()
    if (!src) continue

    if (!cached) {
      el.setAttribute("data-mermaid-src", src)
    }

    // 如果之前渲染过（已经是 svg），重渲染需要先恢复源码
    el.innerHTML = src
  }

  try {
    await mermaid.run({
      nodes,
      suppressErrors: true,
    })
  } catch {
    // mermaid.run 在某些语法错误时会抛异常，这里不阻断页面渲染
  }
}

function setup() {
  initMermaid()
  void renderMermaid()

  // Quartz 暗色模式切换会触发 themechange 事件
  document.addEventListener("themechange", () => {
    initMermaid()
    void renderMermaid()
  })
}

// 首次加载 + Astro View Transitions（如果启用）
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup)
} else {
  setup()
}

document.addEventListener("astro:page-load", () => {
  setup()
})
