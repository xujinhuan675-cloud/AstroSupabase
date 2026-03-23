import fs from "fs";
import path from "path";
import matter from "gray-matter";

const projectRoot = process.cwd();
const contentDir = path.join(projectRoot, "content");

function isMarkdownFile(filePath: string) {
  return filePath.toLowerCase().endsWith(".md");
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
    } else if (entry.isFile() && isMarkdownFile(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function formatYamlError(err: unknown) {
  const e = err as any;
  const message = typeof e?.message === "string" ? e.message : String(err);
  const mark = e?.mark;
  if (mark && typeof mark.line === "number" && typeof mark.column === "number") {
    return `${message} (line ${mark.line + 1}, col ${mark.column + 1})`;
  }
  return message;
}

function main() {
  if (!fs.existsSync(contentDir)) {
    console.error(`content directory not found: ${contentDir}`);
    process.exit(2);
  }

  const files = walk(contentDir);
  const badFiles: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    try {
      matter(raw);
    } catch (err) {
      badFiles.push({
        file: path.relative(projectRoot, file),
        error: formatYamlError(err),
      });
    }
  }

  if (badFiles.length === 0) {
    console.log(`OK: scanned ${files.length} markdown files, no YAML frontmatter errors.`);
    process.exit(0);
  }

  console.error(`FOUND ${badFiles.length} YAML frontmatter error(s) in ${files.length} markdown files:`);
  for (const item of badFiles) {
    console.error(`- ${item.file}`);
    console.error(`  ${item.error}`);
  }
  process.exit(1);
}

main();
