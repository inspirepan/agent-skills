#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSDOM_PACKAGE = "jsdom";
const MERMAID_PACKAGE = "mermaid";
const PUPPETEER_PACKAGE = "puppeteer-core";
const MIN_EXPORT_WIDTH = 1600;
const DEFAULT_THEME = "default";
const DEFAULT_CURVE = "basis";
const DEFAULT_HTML_PADDING = 40;
const DEFAULT_SCALE = 2;
const DEFAULT_WIDTH = 2400;

const MERMAID_THEMES = ["default", "neutral", "dark", "forest", "base"];
const MERMAID_CURVES = [
  "linear",
  "basis",
  "bumpX",
  "bumpY",
  "cardinal",
  "catmullRom",
  "monotoneX",
  "monotoneY",
  "natural",
  "step",
  "stepAfter",
  "stepBefore",
];
const CURVE_BY_LOWERCASE = new Map(MERMAID_CURVES.map((curve) => [curve.toLowerCase(), curve]));
const THEME_BACKGROUNDS = {
  default: "#ffffff",
  neutral: "#ffffff",
  dark: "#1a1a2e",
  forest: "#ffffff",
  base: "#ffffff",
};

const DEFAULT_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function fail(kind, message) {
  console.error(`RENDER_FAILED: ${kind}: ${message}`);
  process.exit(1);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function configStringValue(config, key) {
  const value = config[key];
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null") return "";
  return text;
}

function parseConfig(filePath) {
  return readFile(filePath, "utf8").then((content) => {
    const lines = content.split("\n");
    if (lines[0]?.trim() !== "---") return {};

    const config = {};
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === "---") break;
      const match = lines[i].match(/^(\w[\w_-]*):\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        config[key] = value;
      }
    }
    return config;
  });
}

function readOptionValue(argv, index, optionName, { allowLeadingDash = false } = {}) {
  const value = argv[index + 1];
  if (value === undefined || (!allowLeadingDash && value.startsWith("--"))) {
    fail("CONFIG_INVALID", `${optionName} requires a value`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    mermaid: "",
    output: "",
    svgOutput: "",
    htmlOutput: "",
    theme: "",
    curve: "",
    background: "",
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
      args.mermaid = readOptionValue(argv, i, arg, { allowLeadingDash: true });
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--svg-output") {
      args.svgOutput = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--html-output") {
      args.htmlOutput = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--theme") {
      args.theme = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--curve") {
      args.curve = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--background") {
      args.background = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--html-padding") {
      args.htmlPadding = Number.parseInt(readOptionValue(argv, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === "--chrome-path") {
      args.chromePath = readOptionValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--scale") {
      args.scale = Number.parseFloat(readOptionValue(argv, i, arg));
      i += 1;
      continue;
    }
    if (arg === "--width") {
      args.width = Number.parseInt(readOptionValue(argv, i, arg), 10);
      i += 1;
      continue;
    }
    if (arg === "--config") {
      args.config = readOptionValue(argv, i, arg);
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
  --theme <name>            Mermaid theme: ${MERMAID_THEMES.join(", ")} (default: ${DEFAULT_THEME}).
  --curve <name>            Flowchart curve: ${MERMAID_CURVES.join(", ")} (default: ${DEFAULT_CURVE}).
  --background <color>      HTML/PNG background color (default: theme background).
  --html-padding <pixels>   HTML wrapper padding (default: ${DEFAULT_HTML_PADDING}).
  --scale <number>          Device scale factor for PNG (default: ${DEFAULT_SCALE}).
  --width <number>          Viewport width for PNG (default: ${DEFAULT_WIDTH}).
  --chrome-path <path>      Chrome/Chromium executable path.
  --config <path>           Config file with YAML frontmatter defaults.
  --mermaid <text>          Mermaid text (stdin is preferred).
  --help, -h                Show this help message.

Config file format (YAML frontmatter):
  ---
  theme: default
  curve: basis
  background: "#ffffff"
  chrome_path: /usr/bin/chromium
  scale: 3
  width: 3200
  html_padding: 60
  ---
`);
  process.exit(0);
}

let config = {};
if (cliArgs.config) {
  try {
    config = await parseConfig(path.resolve(cliArgs.config));
  } catch (error) {
    fail("CONFIG_INVALID", `cannot read config file "${cliArgs.config}": ${errorMessage(error)}`);
  }
}

function resolveTheme(rawTheme) {
  const normalized = rawTheme.trim().toLowerCase();
  if (MERMAID_THEMES.includes(normalized)) return normalized;
  fail("CONFIG_INVALID", `unknown theme "${rawTheme}". Available: ${MERMAID_THEMES.join(", ")}`);
}

function resolveCurve(rawCurve) {
  const resolved = CURVE_BY_LOWERCASE.get(rawCurve.trim().toLowerCase());
  if (resolved) return resolved;
  fail("CONFIG_INVALID", `unknown curve "${rawCurve}". Available: ${MERMAID_CURVES.join(", ")}`);
}

function resolveFiniteNumber(cliValue, configValue, defaultValue, optionName, { integer = false, min = 0 } = {}) {
  const value = Number.isFinite(cliValue) ? cliValue : (configValue ? Number(configValue) : defaultValue);
  const validShape = integer ? Number.isInteger(value) : Number.isFinite(value);
  if (!validShape || value < min) {
    fail("CONFIG_INVALID", `${optionName} must be a ${integer ? "whole " : ""}number >= ${min}`);
  }
  return value;
}

const theme = resolveTheme(cliArgs.theme || configStringValue(config, "theme") || DEFAULT_THEME);
const curve = resolveCurve(cliArgs.curve || configStringValue(config, "curve") || DEFAULT_CURVE);
const htmlPadding = resolveFiniteNumber(
  cliArgs.htmlPadding,
  configStringValue(config, "html_padding"),
  DEFAULT_HTML_PADDING,
  "html_padding",
  { integer: true, min: 0 },
);
const scale = resolveFiniteNumber(cliArgs.scale, configStringValue(config, "scale"), DEFAULT_SCALE, "scale", {
  min: 0.1,
});
const width = resolveFiniteNumber(cliArgs.width, configStringValue(config, "width"), DEFAULT_WIDTH, "width", {
  integer: true,
  min: 1,
});
const background =
  cliArgs.background ||
  configStringValue(config, "background") ||
  THEME_BACKGROUNDS[theme];
const chromePath = cliArgs.chromePath || configStringValue(config, "chrome_path");
const output = cliArgs.output;
const svgOutput = cliArgs.svgOutput;
const htmlOutput = cliArgs.htmlOutput;

function createHtmlWrapper(svg, htmlBackground, padding) {
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
      background: ${htmlBackground};
    }

    .container {
      padding: ${padding}px;
      display: inline-block;
      background: ${htmlBackground};
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

async function loadPuppeteer({ required }) {
  try {
    const { default: puppeteer } = await import(PUPPETEER_PACKAGE);
    return puppeteer;
  } catch (error) {
    if (!required) return null;
    fail(
      "CONFIG_INVALID",
      `cannot load ${PUPPETEER_PACKAGE}: ${errorMessage(error)}. Run "cd ${SKILL_DIR} && npm install" to install dependencies.`,
    );
  }
}

async function renderSvgInBrowser(mermaidText, renderTheme, renderCurve, chromeExecutablePath) {
  const puppeteer = await loadPuppeteer({ required: false });
  if (!puppeteer) {
    throw new Error(`cannot load ${PUPPETEER_PACKAGE}. Run "cd ${SKILL_DIR} && npm install".`);
  }

  const browserBundlePath = path.join(SKILL_DIR, "node_modules", "mermaid", "dist", "mermaid.min.js");
  try {
    await access(browserBundlePath);
  } catch (error) {
    throw new Error(
      `cannot find Mermaid browser bundle at ${browserBundlePath}: ${errorMessage(error)}. Run "cd ${SKILL_DIR} && npm install".`,
    );
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromeExecutablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body></body></html>");
    await page.addScriptTag({ path: browserBundlePath });
    return await page.evaluate(async ({ mermaidText, renderTheme, renderCurve }) => {
      const mermaidApi = window.mermaid;
      if (!mermaidApi?.render || !mermaidApi?.initialize) {
        throw new Error("window.mermaid.render is not available");
      }
      mermaidApi.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: renderTheme,
        flowchart: { curve: renderCurve },
      });
      const result = await mermaidApi.render(`mermaid-${Date.now()}`, mermaidText);
      return result.svg;
    }, { mermaidText, renderTheme, renderCurve });
  } finally {
    await browser.close();
  }
}

function estimateTextWidth(text) {
  let width = 0;
  for (const char of String(text)) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (/\s/.test(char)) width += 4;
    else if (codePoint >= 0x2e80) width += 16;
    else if (/[A-Z0-9]/.test(char)) width += 9;
    else if (/[il.,:;|'`]/.test(char)) width += 4;
    else width += 8;
  }
  return Math.max(16, Math.ceil(width));
}

function numericAttribute(element, name, fallback = 0) {
  const value = Number.parseFloat(element.getAttribute?.(name) ?? "");
  return Number.isFinite(value) ? value : fallback;
}

function estimatedBoxForElement(element) {
  const tagName = element.tagName?.toLowerCase() ?? "";
  const text = element.textContent ?? "";
  if (["defs", "style", "marker", "clippath", "title", "desc"].includes(tagName)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  if (tagName === "text" || tagName === "tspan" || tagName === "span") {
    return { x: 0, y: -14, width: estimateTextWidth(text), height: 18 };
  }
  if (tagName === "circle") {
    const cx = numericAttribute(element, "cx");
    const cy = numericAttribute(element, "cy");
    const r = numericAttribute(element, "r");
    return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
  }
  if (tagName === "ellipse") {
    const cx = numericAttribute(element, "cx");
    const cy = numericAttribute(element, "cy");
    const rx = numericAttribute(element, "rx");
    const ry = numericAttribute(element, "ry");
    return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
  }
  if (tagName === "line") {
    const x1 = numericAttribute(element, "x1");
    const y1 = numericAttribute(element, "y1");
    const x2 = numericAttribute(element, "x2");
    const y2 = numericAttribute(element, "y2");
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }
  if (tagName === "polygon" || tagName === "polyline") {
    const rawPoints = element.getAttribute?.("points") ?? "";
    const numbers = rawPoints.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let i = 0; i < numbers.length - 1; i += 2) {
      points.push({ x: numbers[i], y: numbers[i + 1] });
    }
    if (points.length > 0) return boxForPoints(points);
  }
  if (tagName === "path") {
    const points = collectPathPoints(element.getAttribute?.("d") ?? "");
    if (points.length > 0) return boxForPoints(points);
  }

  const width = numericAttribute(element, "width");
  const height = numericAttribute(element, "height");
  if (width > 0 || height > 0) {
    return {
      x: numericAttribute(element, "x"),
      y: numericAttribute(element, "y"),
      width: Math.max(width, estimateTextWidth(text)),
      height: Math.max(height, text ? 18 : 0),
    };
  }

  const childBoxes = Array.from(element.children ?? []).map((child) => estimatedBoxForElement(child));
  if (childBoxes.length > 0) {
    const minX = Math.min(...childBoxes.map((box) => box.x));
    const minY = Math.min(...childBoxes.map((box) => box.y));
    const maxX = Math.max(...childBoxes.map((box) => box.x + box.width));
    const maxY = Math.max(...childBoxes.map((box) => box.y + box.height));
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  if (text.trim()) {
    return { x: 0, y: -14, width: estimateTextWidth(text), height: 18 };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function estimatedClientRect(element) {
  const box = estimatedBoxForElement(element);
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    top: box.y,
    left: box.x,
    right: box.x + box.width,
    bottom: box.y + box.height,
    toJSON() {
      return this;
    },
  };
}

function numericAttributeFromTag(tag, name) {
  const match = tag.match(new RegExp(`${name}="(-?\\d+(?:\\.\\d+)?)"`));
  return match ? Number.parseFloat(match[1]) : NaN;
}

function collectPathPoints(pathData) {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let i = 0; i < numbers.length - 1; i += 2) {
    if (Number.isFinite(numbers[i]) && Number.isFinite(numbers[i + 1])) {
      points.push({ x: numbers[i], y: numbers[i + 1] });
    }
  }
  return points;
}

function boxForPoints(points) {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
}

function normalizeOversizedViewBox(svg) {
  const viewBoxMatch = svg.match(/viewBox="(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!viewBoxMatch || Number.parseFloat(viewBoxMatch[3]) <= 10000) return svg;

  const points = [];
  const nodePattern = /<g class="node[\s\S]*?transform="translate\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)"[\s\S]*?<rect\b[^>]*class="[^"]*label-container[^"]*"[^>]*>/g;
  for (const match of svg.matchAll(nodePattern)) {
    const translateX = Number.parseFloat(match[1]);
    const translateY = Number.parseFloat(match[2]);
    const rectTag = match[0].slice(match[0].lastIndexOf("<rect"));
    const x = numericAttributeFromTag(rectTag, "x");
    const y = numericAttributeFromTag(rectTag, "y");
    const width = numericAttributeFromTag(rectTag, "width");
    const height = numericAttributeFromTag(rectTag, "height");
    if ([translateX, translateY, x, y, width, height].every(Number.isFinite)) {
      points.push({ x: translateX + x, y: translateY + y });
      points.push({ x: translateX + x + width, y: translateY + y + height });
    }
  }

  const pathPattern = /<path\b[^>]*class="[^"]*flowchart-link[^"]*"[^>]*>/g;
  for (const match of svg.matchAll(pathPattern)) {
    const pathTag = match[0];
    const pathData = pathTag.match(/d="([^"]+)"/)?.[1] ?? "";
    points.push(...collectPathPoints(pathData));
  }

  if (points.length === 0) return svg;
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const padding = 8;
  const x = Math.floor(minX - padding);
  const y = Math.floor(minY - padding);
  const width = Math.ceil(maxX - minX + padding * 2);
  const height = Math.ceil(maxY - minY + padding * 2);
  if (width <= 0 || height <= 0) return svg;

  return svg
    .replace(/viewBox="[^"]+"/, `viewBox="${x} ${y} ${width} ${height}"`)
    .replace(/max-width:\s*\d+(?:\.\d+)?px/, `max-width: ${width}px`);
}

async function renderSvgInNode(mermaidText, renderTheme, renderCurve) {
  try {
    const { JSDOM } = await import(JSDOM_PACKAGE);
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { pretendToBeVisual: true });
    class MinimalCSSStyleSheet {
      constructor() {
        this.cssRules = [];
      }

      insertRule(rule, index = this.cssRules.length) {
        this.cssRules.splice(index, 0, { cssText: rule });
        return index;
      }

      replaceSync(cssText) {
        this.cssRules = String(cssText)
          .split("}")
          .map((rule) => rule.trim())
          .filter(Boolean)
          .map((rule) => ({ cssText: `${rule}}` }));
      }
    }

    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.Element = dom.window.Element;
    globalThis.SVGElement = dom.window.SVGElement;
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.Node = dom.window.Node;
    globalThis.DOMParser = dom.window.DOMParser;
    globalThis.XMLSerializer = dom.window.XMLSerializer;
    globalThis.CSSStyleSheet = MinimalCSSStyleSheet;
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
    globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
    const screenWidth = Number(dom.window.screen?.availWidth || dom.window.screen?.width || 0);
    const screenValue = screenWidth > 0 ? dom.window.screen : {
      width: DEFAULT_WIDTH,
      height: DEFAULT_WIDTH,
      availWidth: DEFAULT_WIDTH,
      availHeight: DEFAULT_WIDTH,
      colorDepth: 24,
      pixelDepth: 24,
    };
    globalThis.screen = screenValue;
    Object.defineProperty(dom.window, "screen", { value: screenValue, configurable: true });
    Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

    if (!globalThis.SVGElement.prototype.getBBox) {
      globalThis.SVGElement.prototype.getBBox = function getBBox() {
        return estimatedBoxForElement(this);
      };
    }
    if (!globalThis.SVGElement.prototype.getComputedTextLength) {
      globalThis.SVGElement.prototype.getComputedTextLength = function getComputedTextLength() {
        const tagName = this.tagName?.toLowerCase() ?? "";
        if (tagName !== "text" && tagName !== "tspan") return 0;
        return estimateTextWidth(this.textContent ?? "");
      };
    }
    if (!globalThis.HTMLElement.prototype.getBoundingClientRect) {
      globalThis.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
        return estimatedClientRect(this);
      };
    }
    if (dom.window.HTMLCanvasElement) {
      dom.window.HTMLCanvasElement.prototype.getContext = function getContext(contextType) {
        if (contextType !== "2d") return null;
        return {
          measureText: (text) => ({
            width: estimateTextWidth(text),
            actualBoundingBoxAscent: 12,
            actualBoundingBoxDescent: 4,
            fontBoundingBoxAscent: 12,
            fontBoundingBoxDescent: 4,
          }),
          clearRect() {},
          fillRect() {},
          strokeRect() {},
          fillText() {},
          strokeText() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          closePath() {},
          stroke() {},
          fill() {},
          save() {},
          restore() {},
          translate() {},
          scale() {},
          rotate() {},
          arc() {},
          rect() {},
          setLineDash() {},
        };
      };
    }
  } catch (error) {
    fail(
      "CONFIG_INVALID",
      `cannot load ${JSDOM_PACKAGE}: ${errorMessage(error)}. Run "cd ${SKILL_DIR} && npm install" to install dependencies.`,
    );
  }

  let mermaid;
  try {
    ({ default: mermaid } = await import(MERMAID_PACKAGE));
  } catch (error) {
    fail(
      "CONFIG_INVALID",
      `cannot load ${MERMAID_PACKAGE}: ${errorMessage(error)}. Run "cd ${SKILL_DIR} && npm install" to install dependencies.`,
    );
  }

  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: renderTheme,
      htmlLabels: false,
      flowchart: { curve: renderCurve, htmlLabels: false },
    });
    const result = await mermaid.render(`mermaid-${Date.now()}`, mermaidText);
    return normalizeOversizedViewBox(result.svg);
  } catch (error) {
    throw new Error(`Node Mermaid render failed: ${errorMessage(error)}`);
  }
}

async function renderSvg(mermaidText, renderTheme, renderCurve, preferredChromePath) {
  const chromeExecutablePath = await resolveChromePath(preferredChromePath);
  if (chromeExecutablePath) {
    try {
      return await renderSvgInBrowser(mermaidText, renderTheme, renderCurve, chromeExecutablePath);
    } catch (error) {
      try {
        return await renderSvgInNode(mermaidText, renderTheme, renderCurve);
      } catch (nodeError) {
        throw new Error(
          `browser Mermaid render failed: ${errorMessage(error)}; fallback Mermaid render failed: ${errorMessage(nodeError)}`,
        );
      }
    }
  }

  return renderSvgInNode(mermaidText, renderTheme, renderCurve);
}

const mermaidInput = cliArgs.mermaid || (await readMermaidFromStdin());

if (!mermaidInput.trim()) {
  fail("CONFIG_INVALID", "missing Mermaid input: pass --mermaid or provide content via stdin");
}

const wantPng = Boolean(output);
const wantSvg = Boolean(svgOutput);
const wantHtml = Boolean(htmlOutput);

if (!wantPng && !wantSvg && !wantHtml) {
  fail("CONFIG_INVALID", "no output requested: specify at least one of --output, --svg-output, --html-output");
}

const outputPath = wantPng ? path.resolve(output) : "";
if (outputPath && path.extname(outputPath).toLowerCase() !== ".png") {
  fail("CONFIG_INVALID", "--output must end with .png");
}

const svgOutputPath = wantSvg ? path.resolve(svgOutput) : "";
if (svgOutputPath && path.extname(svgOutputPath).toLowerCase() !== ".svg") {
  fail("CONFIG_INVALID", "--svg-output must end with .svg");
}

const htmlOutputPath = wantHtml ? path.resolve(htmlOutput) : "";
if (htmlOutputPath && path.extname(htmlOutputPath).toLowerCase() !== ".html") {
  fail("CONFIG_INVALID", "--html-output must end with .html");
}

let svg;
try {
  svg = await renderSvg(mermaidInput, theme, curve, chromePath);
} catch (error) {
  fail("MERMAID_PARSE_FAILED", errorMessage(error));
}

const html = createHtmlWrapper(svg, background, htmlPadding);

if (svgOutputPath) {
  await mkdir(path.dirname(svgOutputPath), { recursive: true });
  await writeFile(svgOutputPath, svg, "utf8");
}

if (htmlOutputPath) {
  await mkdir(path.dirname(htmlOutputPath), { recursive: true });
  await writeFile(htmlOutputPath, html, "utf8");
}

if (wantPng) {
  const puppeteer = await loadPuppeteer({ required: false });
  if (!puppeteer) {
    if (svgOutputPath || htmlOutputPath) {
      console.error(
        `RENDER_DEGRADED: svg-only -- cannot load ${PUPPETEER_PACKAGE}. Run "cd ${SKILL_DIR} && npm install".`,
      );
      if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
      if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
      process.exit(0);
    }
    fail(
      "CONFIG_INVALID",
      `cannot load ${PUPPETEER_PACKAGE}. Run "cd ${SKILL_DIR} && npm install" to install dependencies.`,
    );
  }

  const chromeExecutablePath = await resolveChromePath(chromePath);
  if (!chromeExecutablePath) {
    if (svgOutputPath || htmlOutputPath) {
      console.error("RENDER_DEGRADED: svg-only -- CHROME_MISSING: no Chrome/Chromium found. Pass --chrome-path or set CHROME_PATH for PNG output.");
      if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
      if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
      process.exit(0);
    }
    fail("CHROME_MISSING", "no Chrome/Chromium found. Pass --chrome-path or set CHROME_PATH for PNG output.");
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
    if (svgOutputPath || htmlOutputPath) {
      console.error(`RENDER_DEGRADED: svg-only -- PNG_CAPTURE_FAILED: ${errorMessage(error)}`);
      if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
      if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
      process.exit(0);
    }
    fail("PNG_CAPTURE_FAILED", errorMessage(error));
  }
}

if (outputPath) console.log(`RENDER_SUCCESS: ${outputPath}`);
console.log(`RENDER_THEME: ${theme}`);
console.log(`RENDER_CURVE: ${curve}`);
if (svgOutputPath) console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
if (htmlOutputPath) console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
