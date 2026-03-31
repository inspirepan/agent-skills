#!/usr/bin/env node

import { readFile, access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MERMAID_PACKAGE = "beautiful-mermaid";
const PUPPETEER_PACKAGE = "puppeteer-core";
const MIN_EXPORT_WIDTH = 1600;
const DEFAULT_THEME = "zinc-light";
const DEFAULT_HTML_PADDING = 40;
const DEFAULT_SCALE = 2;
const DEFAULT_WIDTH = 2400;

const THEME_ALIASES = {
  default: "zinc-light",
  solarized: "solarized-light",
};

const DEFAULT_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function fail(message) {
  console.error(`RENDER_FAILED: ${message}`);
  process.exit(1);
}

function parseConfig(filePath) {
  // Synchronously not needed - we'll call this with awaited content
  return readFile(filePath, "utf8").then((content) => {
    const lines = content.split("\n");
    if (lines[0].trim() !== "---") return {};

    const config = {};
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") break;
      const match = lines[i].match(/^(\w[\w_-]*):\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Strip quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        config[key] = value;
      }
    }
    return config;
  });
}

function parseArgs(argv) {
  const args = {
    mermaid: "",
    output: "",
    svgOutput: "",
    htmlOutput: "",
    theme: "",
    htmlPadding: NaN,
    chromePath: "",
    scale: NaN,
    width: NaN,
    config: "",
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--mermaid") {
      args.mermaid = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--svg-output") {
      args.svgOutput = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--html-output") {
      args.htmlOutput = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--theme") {
      args.theme = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--html-padding") {
      args.htmlPadding = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
      continue;
    }
    if (arg === "--chrome-path") {
      args.chromePath = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--scale") {
      args.scale = Number.parseFloat(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--width") {
      args.width = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
      continue;
    }
    if (arg === "--config") {
      args.config = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
  }

  return args;
}

const cliArgs = parseArgs(process.argv.slice(2));

if (cliArgs.help) {
  console.log(`Usage:
  npx tsx scripts/render_mermaid.js --output <path.png> [options] <<'MERMAID'
  flowchart TD
    A[Start] --> B[End]
  MERMAID

Options:
  --output <path.png>       Output PNG path (requires Chrome).
  --svg-output <path.svg>   Write SVG output.
  --html-output <path.html> Write HTML wrapper output.
  --theme <name>            Theme name (default: ${DEFAULT_THEME}).
  --html-padding <pixels>   HTML wrapper padding (default: ${DEFAULT_HTML_PADDING}).
  --scale <number>          Device scale factor for PNG (default: ${DEFAULT_SCALE}).
  --width <number>          Viewport width for PNG (default: ${DEFAULT_WIDTH}).
  --chrome-path <path>      Chrome/Chromium executable path.
  --config <path>           Config file with YAML frontmatter defaults.
  --mermaid <text>          Mermaid text (stdin is preferred).
  --help, -h                Show this help message.

Config file format (YAML frontmatter):
  ---
  theme: zinc-dark
  chrome_path: /usr/bin/chromium
  scale: 3
  width: 3200
  html_padding: 60
  ---
`);
  process.exit(0);
}

// Load config file if specified, then merge: config < CLI
let config = {};
if (cliArgs.config) {
  try {
    config = await parseConfig(path.resolve(cliArgs.config));
  } catch (error) {
    fail(`cannot read config file "${cliArgs.config}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

const theme = cliArgs.theme || config.theme || DEFAULT_THEME;
const htmlPadding = Number.isFinite(cliArgs.htmlPadding) ? cliArgs.htmlPadding : (Number.isFinite(Number(config.html_padding)) ? Number(config.html_padding) : DEFAULT_HTML_PADDING);
const scale = Number.isFinite(cliArgs.scale) ? cliArgs.scale : (Number.isFinite(Number(config.scale)) ? Number(config.scale) : DEFAULT_SCALE);
const width = Number.isFinite(cliArgs.width) ? cliArgs.width : (Number.isFinite(Number(config.width)) ? Number(config.width) : DEFAULT_WIDTH);
const chromePath = cliArgs.chromePath || config.chrome_path || "";
const output = cliArgs.output;
const svgOutput = cliArgs.svgOutput;
const htmlOutput = cliArgs.htmlOutput;

function resolveThemeName(rawTheme, themeMap) {
  const normalized = rawTheme.trim().toLowerCase();
  if (themeMap[normalized]) return normalized;
  const alias = THEME_ALIASES[normalized];
  if (alias && themeMap[alias]) return alias;
  return "";
}

function createHtmlWrapper(svg, background, padding) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Diagram</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      background: ${background};
    }

    .container {
      padding: ${padding}px;
      display: inline-block;
      background: ${background};
    }

    .container svg {
      display: block;
      min-width: 1200px;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    ${svg}
  </div>
</body>
</html>`;
}

async function resolveChromePath(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    ...DEFAULT_CHROME_PATHS,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  return "";
}

async function readMermaidFromStdin() {
  if (process.stdin.isTTY) return "";
  process.stdin.setEncoding("utf8");
  let content = "";
  for await (const chunk of process.stdin) {
    content += chunk;
  }
  return content;
}

// Read input
const mermaidInput = cliArgs.mermaid || (await readMermaidFromStdin());

if (!mermaidInput.trim()) {
  fail("missing Mermaid input: pass --mermaid or provide content via stdin");
}

const wantPng = Boolean(output);
const wantSvg = Boolean(svgOutput);
const wantHtml = Boolean(htmlOutput);

if (!wantPng && !wantSvg && !wantHtml) {
  fail("no output requested: specify at least one of --output, --svg-output, --html-output");
}

// Validate output paths
const outputPath = wantPng ? path.resolve(output) : "";
if (outputPath && path.extname(outputPath).toLowerCase() !== ".png") {
  fail("--output must end with .png");
}

const svgOutputPath = wantSvg ? path.resolve(svgOutput) : "";
if (svgOutputPath && path.extname(svgOutputPath).toLowerCase() !== ".svg") {
  fail("--svg-output must end with .svg");
}

const htmlOutputPath = wantHtml ? path.resolve(htmlOutput) : "";
if (htmlOutputPath && path.extname(htmlOutputPath).toLowerCase() !== ".html") {
  fail("--html-output must end with .html");
}

// Load beautiful-mermaid
let renderMermaidSVG, THEMES;
try {
  ({ renderMermaidSVG, THEMES } = await import(MERMAID_PACKAGE));
} catch (error) {
  fail(`cannot load ${MERMAID_PACKAGE}: ${error instanceof Error ? error.message : String(error)}. Run "cd ${SKILL_DIR} && npm install" to install dependencies.`);
}

if (typeof renderMermaidSVG !== "function") {
  fail("renderMermaidSVG is not available in " + MERMAID_PACKAGE);
}
if (!THEMES || typeof THEMES !== "object") {
  fail("THEMES is not available in " + MERMAID_PACKAGE);
}

const resolvedThemeName = resolveThemeName(theme, THEMES);
if (!resolvedThemeName) {
  const availableThemes = Object.keys(THEMES).sort().join(", ");
  fail(`unknown theme "${theme}". Available: ${availableThemes}. Aliases: default, solarized`);
}

const themeColors = THEMES[resolvedThemeName];

// Render SVG
let svg;
try {
  svg = renderMermaidSVG(mermaidInput, themeColors);
} catch (error) {
  fail(`SVG render failed: ${error instanceof Error ? error.message : String(error)}`);
}

const html = createHtmlWrapper(svg, themeColors.bg, htmlPadding);

// Write SVG if requested
if (svgOutputPath) {
  await mkdir(path.dirname(svgOutputPath), { recursive: true });
  await writeFile(svgOutputPath, svg, "utf8");
}

// Write HTML if requested
if (htmlOutputPath) {
  await mkdir(path.dirname(htmlOutputPath), { recursive: true });
  await writeFile(htmlOutputPath, html, "utf8");
}

// PNG rendering via puppeteer-core + Chrome
if (wantPng) {
  let puppeteer;
  try {
    ({ default: puppeteer } = await import(PUPPETEER_PACKAGE));
  } catch (error) {
    // Degraded: SVG/HTML already written, but PNG not possible
    if (svgOutputPath || htmlOutputPath) {
      console.error(`RENDER_DEGRADED: svg-only -- cannot load ${PUPPETEER_PACKAGE}: ${error instanceof Error ? error.message : String(error)}. Run "cd ${SKILL_DIR} && npm install".`);
      if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
      if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
      process.exit(0);
    }
    fail(`cannot load ${PUPPETEER_PACKAGE}: ${error instanceof Error ? error.message : String(error)}. Run "cd ${SKILL_DIR} && npm install" to install dependencies.`);
  }

  const chromeExecutablePath = await resolveChromePath(chromePath);
  if (!chromeExecutablePath) {
    if (svgOutputPath || htmlOutputPath) {
      console.error("RENDER_DEGRADED: svg-only -- no Chrome/Chromium found. Pass --chrome-path or set CHROME_PATH for PNG output.");
      if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
      if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
      process.exit(0);
    }
    fail("no Chrome/Chromium found. Pass --chrome-path or set CHROME_PATH for PNG output.");
  }

  try {
    await mkdir(path.dirname(outputPath), { recursive: true });

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromeExecutablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height: width, deviceScaleFactor: scale });
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.evaluate((minWidth) => {
        const svgElement = document.querySelector(".container svg");
        if (!svgElement) return;
        const { width } = svgElement.getBoundingClientRect();
        if (width < minWidth) {
          svgElement.style.width = `${minWidth}px`;
          svgElement.style.height = "auto";
          svgElement.style.maxWidth = "none";
        }
      }, MIN_EXPORT_WIDTH);
      await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));

      const containerElement = await page.$(".container");
      if (!containerElement) throw new Error("rendered container is missing in page");
      await containerElement.screenshot({ path: outputPath, type: "png", omitBackground: false });
    } finally {
      await browser.close();
    }
  } catch (error) {
    // PNG failed but SVG/HTML may have succeeded
    if (svgOutputPath || htmlOutputPath) {
      console.error(`RENDER_DEGRADED: svg-only -- PNG capture failed: ${error instanceof Error ? error.message : String(error)}`);
      if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
      if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
      process.exit(0);
    }
    fail(`PNG capture failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Report success
if (outputPath) console.log(`RENDER_SUCCESS: ${outputPath}`);
console.log(`RENDER_THEME: ${resolvedThemeName}`);
if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
