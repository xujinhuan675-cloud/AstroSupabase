/**
 * Obsidian Flavored Markdown 转换器
 * 从 Quartz 迁移并适配到 AstroSupabase
 * 
 * 支持的功能：
 * - Wiki 链接 [[page]] 和 [[page|alias]]
 * - 高亮 ==text==
 * - Callouts (提示框)
 * - Mermaid 图表
 * - 标签 #tag
 * - 块引用
 * - 视频/音频嵌入
 */

import type {
  Root,
  Html,
  BlockContent,
  PhrasingContent,
  DefinitionContent,
  Paragraph,
  Code,
} from "mdast"
import type { Element, Literal, Root as HtmlRoot } from "hast"
import { findAndReplace as mdastFindReplace } from "mdast-util-find-and-replace"
import type { ReplaceFunction } from "mdast-util-find-and-replace"
import rehypeRaw from "rehype-raw"
import { SKIP, visit } from "unist-util-visit"
import path from "path"
import { splitAnchor, slugifyFilePath, slugTag, pathToRoot } from "../util/path"
import type { FilePath, FullSlug } from "../util/path"
import { toHast } from "mdast-util-to-hast"
import { toHtml } from "hast-util-to-html"
import { capitalize } from "../util/lang"
import type { PluggableList } from "unified"

export interface OFMOptions {
  comments: boolean
  highlight: boolean
  wikilinks: boolean
  callouts: boolean
  mermaid: boolean
  parseTags: boolean
  parseArrows: boolean
  parseBlockReferences: boolean
  enableInHtmlEmbed: boolean
  enableYouTubeEmbed: boolean
  enableVideoEmbed: boolean
  enableCheckbox: boolean
  disableBrokenWikilinks: boolean
}

const defaultOptions: OFMOptions = {
  comments: true,
  highlight: true,
  wikilinks: true,
  callouts: true,
  mermaid: true,
  parseTags: true,
  parseArrows: true,
  parseBlockReferences: true,
  enableInHtmlEmbed: false,
  enableYouTubeEmbed: true,
  enableVideoEmbed: true,
  enableCheckbox: false,
  disableBrokenWikilinks: false,
}

const calloutMapping = {
  note: "note",
  abstract: "abstract",
  summary: "abstract",
  tldr: "abstract",
  info: "info",
  todo: "todo",
  tip: "tip",
  hint: "tip",
  important: "tip",
  success: "success",
  check: "success",
  done: "success",
  question: "question",
  help: "question",
  faq: "question",
  warning: "warning",
  attention: "warning",
  caution: "warning",
  failure: "failure",
  missing: "failure",
  fail: "failure",
  danger: "danger",
  error: "danger",
  bug: "bug",
  example: "example",
  quote: "quote",
  cite: "quote",
} as const

const arrowMapping: Record<string, string> = {
  "->": "&rarr;",
  "-->": "&rArr;",
  "=>": "&rArr;",
  "==>": "&rArr;",
  "<-": "&larr;",
  "<--": "&lArr;",
  "<=": "&lArr;",
  "<==": "&lArr;",
}

function canonicalizeCallout(calloutName: string): keyof typeof calloutMapping {
  const normalizedCallout = calloutName.toLowerCase() as keyof typeof calloutMapping
  return calloutMapping[normalizedCallout] ?? calloutName
}

export const externalLinkRegex = /^https?:\/\//i
export const arrowRegex = new RegExp(/(-{1,2}>|={1,2}>|<-{1,2}|<={1,2})/g)

// Wiki link 正则表达式
export const wikilinkRegex = new RegExp(
  /!?\[\[([^\[\]\|\#\\]+)?(#+[^\[\]\|\#\\]+)?(\\?\|[^\[\]\#]*)?\]\]/g,
)

// 表格正则表达式
export const tableRegex = new RegExp(/^\|([^\n])+\|\n(\|)( ?:?-{3,}:? ?\|)+\n(\|([^\n])+\|\n?)+/gm)
export const tableWikilinkRegex = new RegExp(/(!?\[\[[^\]]*?\]\]|\[\^[^\]]*?\])/g)

const highlightRegex = new RegExp(/==([^=]+)==/g)
const commentRegex = new RegExp(/%%[\s\S]*?%%/g)
const calloutRegex = new RegExp(/^\[\!([\w-]+)\|?(.+?)?\]([+-]?)/)
const calloutLineRegex = new RegExp(/^> *\[\!\w+\|?.*?\][+-]?.*$/gm)

// 标签正则表达式（支持中文）
const tagRegex = new RegExp(
  /(?<=^| )#((?:[-_\p{L}\p{Emoji}\p{M}\d])+(?:\/[-_\p{L}\p{Emoji}\p{M}\d]+)*)/gu,
)

const blockReferenceRegex = new RegExp(/\^([-_A-Za-z0-9]+)$/g)
const ytLinkRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
const ytPlaylistLinkRegex = /[?&]list=([^#?&]*)/
const videoExtensionRegex = new RegExp(/\.(mp4|webm|ogg|avi|mov|flv|wmv|mkv|mpg|mpeg|3gp|m4v)$/)
const wikilinkImageEmbedRegex = new RegExp(
  /^(?<alt>(?!^\d*x?\d*$).*?)?(\|?\s*?(?<width>\d+)(x(?<height>\d+))?)?$/,
)

const mdastToHtml = (ast: PhrasingContent | Paragraph) => {
  const hast = toHast(ast, { allowDangerousHtml: true })!
  return toHtml(hast, { allowDangerousHtml: true })
}

/**
 * 创建 Obsidian Flavored Markdown 插件
 * @param userOpts - 用户选项
 * @param allSlugs - 所有文章的 slugs（用于检查链接是否存在）
 */
export function createOFMPlugins(
  userOpts: Partial<OFMOptions> = {},
  allSlugs: FullSlug[] = [],
  baseSlug: FullSlug = "" as FullSlug
) {
  const opts = { ...defaultOptions, ...userOpts }
  const markdownPlugins: PluggableList = []
  const htmlPlugins: PluggableList = []

  // Markdown 插件
  markdownPlugins.push(() => {
    return (tree: Root, file) => {
      const replacements: [RegExp, string | ReplaceFunction][] = []
      const base = baseSlug ? pathToRoot(baseSlug) : ""

      if (opts.wikilinks) {
        replacements.push([
          wikilinkRegex,
          (value: string, ...capture: string[]) => {
            let [rawFp, rawHeader, rawAlias] = capture
            const fp = rawFp?.trim() ?? ""
            const anchor = rawHeader?.trim() ?? ""
            const alias: string | undefined = rawAlias?.slice(1).trim()

            // 嵌入内容
            if (value.startsWith("!")) {
              const ext: string = path.extname(fp).toLowerCase()
              const url = fp ? slugifyFilePath(fp as FilePath) : ""
              
              if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".webp"].includes(ext)) {
                const match = wikilinkImageEmbedRegex.exec(alias ?? "")
                const alt = match?.groups?.alt ?? ""
                const width = match?.groups?.width ?? "auto"
                const height = match?.groups?.height ?? "auto"
                return {
                  type: "image",
                  url,
                  data: {
                    hProperties: {
                      width,
                      height,
                      alt,
                    },
                  },
                }
              } else if ([".mp4", ".webm", ".ogv", ".mov", ".mkv"].includes(ext)) {
                return {
                  type: "html",
                  value: `<video src="${url}" controls></video>`,
                }
              } else if ([".mp3", ".webm", ".wav", ".m4a", ".ogg", ".3gp", ".flac"].includes(ext)) {
                return {
                  type: "html",
                  value: `<audio src="${url}" controls></audio>`,
                }
              } else if ([".pdf"].includes(ext)) {
                return {
                  type: "html",
                  value: `<iframe src="${url}" class="pdf"></iframe>`,
                }
              }
            }

            // 检查链接是否存在
            if (opts.disableBrokenWikilinks && fp) {
              const slug = slugifyFilePath(fp as FilePath)
              const exists = allSlugs.includes(slug)
              if (!exists) {
                return {
                  type: "html",
                  value: `<a class="internal broken">${alias ?? fp}</a>`,
                }
              }
            }

            // 内部链接
            const url = fp + anchor
            return {
              type: "link",
              url,
              children: [
                {
                  type: "text",
                  value: alias ?? fp,
                },
              ],
            }
          },
        ])
      }

      if (opts.highlight) {
        replacements.push([
          highlightRegex,
          (_value: string, ...capture: string[]) => {
            const [inner] = capture
            return {
              type: "html",
              value: `<span class="text-highlight">${inner}</span>`,
            }
          },
        ])
      }

      if (opts.parseArrows) {
        replacements.push([
          arrowRegex,
          (value: string, ..._capture: string[]) => {
            const maybeArrow = arrowMapping[value]
            if (maybeArrow === undefined) return SKIP
            return {
              type: "html",
              value: `<span>${maybeArrow}</span>`,
            }
          },
        ])
      }

      if (opts.parseTags) {
        replacements.push([
          tagRegex,
          (_value: string, tag: string) => {
            // 检查标签是否只包含数字和斜杠
            if (/^[\/\d]+$/.test(tag)) {
              return false
            }

            tag = slugTag(tag)
            if (file.data.frontmatter) {
              const noteTags = (file.data.frontmatter as any).tags ?? []
              ;(file.data.frontmatter as any).tags = [...new Set([...noteTags, tag])]
            }

            return {
              type: "link",
              url: base + `/tags/${tag}`,
              data: {
                hProperties: {
                  className: ["tag-link"],
                },
              },
              children: [
                {
                  type: "text",
                  value: tag,
                },
              ],
            }
          },
        ])
      }

      mdastFindReplace(tree, replacements)
    }
  })

  // Callouts 插件
  if (opts.callouts) {
    markdownPlugins.push(() => {
      return (tree: Root, _file) => {
        visit(tree, "blockquote", (node) => {
          if (node.children.length === 0) {
            return
          }

          const [firstChild, ...calloutContent] = node.children
          if (firstChild.type !== "paragraph" || firstChild.children[0]?.type !== "text") {
            return
          }

          const text = firstChild.children[0].value
          const restOfTitle = firstChild.children.slice(1)
          const [firstLine, ...remainingLines] = text.split("\n")
          const remainingText = remainingLines.join("\n")

          const match = firstLine.match(calloutRegex)
          if (match && match.input) {
            const [calloutDirective, typeString, calloutMetaData, collapseChar] = match
            const calloutType = canonicalizeCallout(typeString.toLowerCase())
            const collapse = collapseChar === "+" || collapseChar === "-"
            const defaultState = collapseChar === "-" ? "collapsed" : "expanded"
            const titleContent = match.input.slice(calloutDirective.length).trim()
            const useDefaultTitle = titleContent === "" && restOfTitle.length === 0
            
            const titleNode: Paragraph = {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: useDefaultTitle
                    ? capitalize(typeString).replace(/-/g, " ")
                    : titleContent + " ",
                },
                ...restOfTitle,
              ],
            }
            const title = mdastToHtml(titleNode)

            const toggleIcon = `<div class="fold-callout-icon"></div>`

            const titleHtml: Html = {
              type: "html",
              value: `<div class="callout-title">
                <div class="callout-icon"></div>
                <div class="callout-title-inner">${title}</div>
                ${collapse ? toggleIcon : ""}
              </div>`,
            }

            const blockquoteContent: (BlockContent | DefinitionContent)[] = [titleHtml]
            if (remainingText.length > 0) {
              blockquoteContent.push({
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    value: remainingText,
                  },
                ],
              })
            }

            if (calloutContent.length > 0) {
              node.children = [
                node.children[0],
                {
                  data: { hProperties: { className: ["callout-content"] }, hName: "div" },
                  type: "blockquote",
                  children: [...calloutContent],
                },
              ]
            }

            node.children.splice(0, 1, ...blockquoteContent)

            const classNames = ["callout", calloutType]
            if (collapse) {
              classNames.push("is-collapsible")
            }
            if (defaultState === "collapsed") {
              classNames.push("is-collapsed")
            }

            node.data = {
              hProperties: {
                ...(node.data?.hProperties ?? {}),
                className: classNames.join(" "),
                "data-callout": calloutType,
                "data-callout-fold": collapse,
                "data-callout-metadata": calloutMetaData,
              },
            }
          }
        })
      }
    })
  }

  // Mermaid 插件
  if (opts.mermaid) {
    markdownPlugins.push(() => {
      return (tree: Root, file) => {
        visit(tree, "code", (node: Code) => {
          if (node.lang === "mermaid") {
            (file.data as any).hasMermaidDiagram = true
            node.data = {
              hProperties: {
                className: ["mermaid"],
                "data-clipboard": JSON.stringify(node.value),
              },
            }
          }
        })
      }
    })
  }

  // HTML 插件
  htmlPlugins.push(rehypeRaw)

  // YouTube 嵌入
  if (opts.enableYouTubeEmbed) {
    htmlPlugins.push(() => {
      return (tree: HtmlRoot) => {
        visit(tree, "element", (node) => {
          if (node.tagName === "img" && typeof node.properties.src === "string") {
            const match = node.properties.src.match(ytLinkRegex)
            const videoId = match && match[2].length == 11 ? match[2] : null
            const playlistId = node.properties.src.match(ytPlaylistLinkRegex)?.[1]
            if (videoId) {
              node.tagName = "iframe"
              node.properties = {
                class: "external-embed youtube",
                allow: "fullscreen",
                frameborder: 0,
                width: "600px",
                src: playlistId
                  ? `https://www.youtube.com/embed/${videoId}?list=${playlistId}`
                  : `https://www.youtube.com/embed/${videoId}`,
              }
            } else if (playlistId) {
              node.tagName = "iframe"
              node.properties = {
                class: "external-embed youtube",
                allow: "fullscreen",
                frameborder: 0,
                width: "600px",
                src: `https://www.youtube.com/embed/videoseries?list=${playlistId}`,
              }
            }
          }
        })
      }
    })
  }

  return {
    markdownPlugins,
    htmlPlugins,
  }
}

/**
 * 文本预处理（在 unified 处理之前）
 */
export function preprocessMarkdown(src: string, opts: Partial<OFMOptions> = {}): string {
  const options = { ...defaultOptions, ...opts }

  // 移除注释
  if (options.comments) {
    src = src.replace(commentRegex, "")
  }

  // 预处理 callouts
  if (options.callouts) {
    src = src.replace(calloutLineRegex, (value) => {
      return value + "\n> "
    })
  }

  // 预处理 wikilinks
  if (options.wikilinks) {
    // 替换表格中的 wikilinks
    src = src.replace(tableRegex, (value) => {
      return value.replace(tableWikilinkRegex, (_value, raw) => {
        let escaped = raw ?? ""
        escaped = escaped.replace("#", "\\#")
        escaped = escaped.replace(/((^|[^\\])(\\\\)*)\|/g, "$1\\|")
        return escaped
      })
    })

    // 替换其他 wikilinks
    src = src.replace(wikilinkRegex, (value, ...capture) => {
      const [rawFp, rawHeader, rawAlias]: (string | undefined)[] = capture

      const [fp, anchor] = splitAnchor(`${rawFp ?? ""}${rawHeader ?? ""}`)
      const blockRef = Boolean(rawHeader?.startsWith("#^")) ? "^" : ""
      const displayAnchor = anchor ? `#${blockRef}${anchor.trim().replace(/^#+/, "")}` : ""
      const displayAlias = rawAlias ?? rawHeader?.replace("#", "|") ?? ""
      const embedDisplay = value.startsWith("!") ? "!" : ""

      if (rawFp?.match(externalLinkRegex)) {
        return `${embedDisplay}[${displayAlias.replace(/^\|/, "")}](${rawFp})`
      }

      return `${embedDisplay}[[${fp}${displayAnchor}${displayAlias}]]`
    })
  }

  return src
}

