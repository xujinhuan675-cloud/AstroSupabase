/**
 * 链接处理转换器
 * 从 Quartz 迁移并适配到 AstroSupabase
 * 
 * 功能：
 * - 提取所有链接
 * - 区分内部/外部链接
 * - 添加外部链接图标
 * - 链接美化
 */

import type { Root } from "hast"
import { visit } from "unist-util-visit"
import type {
  FullSlug,
  RelativeURL,
  SimpleSlug,
  TransformOptions,
} from "../util/path"
import {
  stripSlashes,
  simplifySlug,
  splitAnchor,
  transformLink,
} from "../util/path"
import path from "path"

/**
 * 检查是否为绝对 URL（代替 is-absolute-url 包）
 */
function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export interface LinksOptions {
  /** 如何解析 Markdown 路径 */
  markdownLinkResolution: TransformOptions["strategy"]
  /** 移除文件夹路径使链接更美观 */
  prettyLinks: boolean
  /** 在新标签页打开外部链接 */
  openLinksInNewTab: boolean
  /** 懒加载资源 */
  lazyLoad: boolean
  /** 外部链接图标 */
  externalLinkIcon: boolean
}

const defaultOptions: LinksOptions = {
  markdownLinkResolution: "absolute",
  prettyLinks: true,
  openLinksInNewTab: false,
  lazyLoad: false,
  externalLinkIcon: true,
}

/**
 * 创建链接处理插件
 * @param userOpts - 用户选项
 * @param allSlugs - 所有文章的 slugs
 * @param currentSlug - 当前文章的 slug
 */
export function createLinksPlugin(
  userOpts: Partial<LinksOptions> = {},
  allSlugs: FullSlug[] = [],
  currentSlug: FullSlug = "" as FullSlug
) {
  const opts = { ...defaultOptions, ...userOpts }
  
  return () => {
    return (tree: Root, file: any) => {
      const curSlug = currentSlug || (file.data?.slug ? simplifySlug(file.data.slug as FullSlug) : ("" as SimpleSlug))
      const outgoing: Set<SimpleSlug> = new Set()

      const transformOptions: TransformOptions = {
        strategy: opts.markdownLinkResolution,
        allSlugs: allSlugs,
      }

      visit(tree, "element", (node, _index, _parent) => {
        // 处理所有链接
        if (
          node.tagName === "a" &&
          node.properties &&
          typeof node.properties.href === "string"
        ) {
          let dest = node.properties.href as RelativeURL
          const classes = (node.properties.className ?? []) as string[]
          const isExternal = isAbsoluteUrl(dest)
          classes.push(isExternal ? "external" : "internal")

          // 添加外部链接图标
          if (isExternal && opts.externalLinkIcon) {
            node.children.push({
              type: "element",
              tagName: "svg",
              properties: {
                "aria-hidden": "true",
                class: "external-icon",
                style: "max-width:0.8em;max-height:0.8em",
                viewBox: "0 0 512 512",
              },
              children: [
                {
                  type: "element",
                  tagName: "path",
                  properties: {
                    d: "M320 0H288V64h32 82.7L201.4 265.4 178.7 288 224 333.3l22.6-22.6L448 109.3V192v32h64V192 32 0H480 320zM32 32H0V64 480v32H32 456h32V480 352 320H424v32 96H64V96h96 32V32H160 32z",
                  },
                  children: [],
                },
              ],
            })
          }

          // 检查是否有别名
          if (
            node.children.length === 1 &&
            node.children[0].type === "text" &&
            node.children[0].value !== dest
          ) {
            classes.push("alias")
          }
          node.properties.className = classes

          if (isExternal && opts.openLinksInNewTab) {
            node.properties.target = "_blank"
          }

          // 不处理外部链接或文档内锚点
          const isInternal = !(isAbsoluteUrl(dest) || dest.startsWith("#"))
          if (isInternal && allSlugs.length > 0) {
            dest = node.properties.href = transformLink(
              curSlug as FullSlug,
              dest,
              transformOptions,
            )

            const url = new URL(dest, "https://base.com/" + stripSlashes(curSlug, true))
            const canonicalDest = url.pathname
            let [destCanonical, _destAnchor] = splitAnchor(canonicalDest)
            if (destCanonical.endsWith("/")) {
              destCanonical += "index"
            }

            const full = decodeURIComponent(stripSlashes(destCanonical, true)) as FullSlug
            const simple = simplifySlug(full)
            outgoing.add(simple)
            node.properties["data-slug"] = full
          }

          // 美化链接
          if (
            opts.prettyLinks &&
            isInternal &&
            node.children.length === 1 &&
            node.children[0].type === "text" &&
            !node.children[0].value.startsWith("#")
          ) {
            node.children[0].value = path.basename(node.children[0].value)
          }
        }

        // 处理其他可能使用链接的资源
        if (
          ["img", "video", "audio", "iframe"].includes(node.tagName) &&
          node.properties &&
          typeof node.properties.src === "string"
        ) {
          if (opts.lazyLoad) {
            node.properties.loading = "lazy"
          }

          if (!isAbsoluteUrl(node.properties.src)) {
            let dest = node.properties.src as RelativeURL
            if (allSlugs.length > 0) {
              dest = node.properties.src = transformLink(
                curSlug as FullSlug,
                dest,
                transformOptions,
              )
            }
            node.properties.src = dest
          }
        }
      })

      file.data.links = [...outgoing]
    }
  }
}

/**
 * 从 Markdown 内容中提取链接
 */
export function extractLinks(content: string): string[] {
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  const mdLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g
  const links: string[] = []

  // 提取 Wiki 链接
  let match
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push(match[1].trim())
  }

  // 提取 Markdown 链接
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const url = match[2]
    if (!isAbsoluteUrl(url) && !url.startsWith("#")) {
      links.push(url)
    }
  }

  return links
}

export { isAbsoluteUrl }

