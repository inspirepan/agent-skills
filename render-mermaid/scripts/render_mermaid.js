#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MERMAID_PACKAGE = "beautiful-mermaid";
const PUPPETEER_PACKAGE = "puppeteer-core";
const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPENDENCIES = [MERMAID_PACKAGE, PUPPETEER_PACKAGE];
const MIN_EXPORT_WIDTH = 1600;
const DEFAULT_THEME = "zinc-light";
const DEFAULT_HTML_PADDING = 40;
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

function isMissingPackageError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Cannot find package") || message.includes("Cannot find module");
}

function installHint(packageName) {
  return `missing dependency \"${packageName}\": run \"cd ${SKILL_DIR} && bun install\" (or \"npm install --no-package-lock\") and retry`;
}

function installAllHint() {
  return `run \"cd ${SKILL_DIR} && bun install\" (or \"npm install --no-package-lock\") and retry`;
}

async function findMissingDependencies() {
  const missing = [];
  for (const dep of DEPENDENCIES) {
    const packageJsonPath = path.join(SKILL_DIR, "node_modules", dep, "package.json");
    try {
      await access(packageJsonPath);
    } catch {
      missing.push(dep);
    }
  }
  return missing;
}

async function commandExists(command) {
  return await new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function runInstall(command, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: SKILL_DIR,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function autoInstallDependencies(missing) {
  const missingList = missing.join(", ");

  const installers = process.versions.bun
    ? [
        { command: "bun", args: ["install"], label: "bun install" },
        { command: "npm", args: ["install", "--no-package-lock"], label: "npm install --no-package-lock" },
      ]
    : [
        { command: "npm", args: ["install", "--no-package-lock"], label: "npm install --no-package-lock" },
        { command: "bun", args: ["install"], label: "bun install" },
      ];

  for (const installer of installers) {
    if (!(await commandExists(installer.command))) {
      continue;
    }
    console.error(`Missing dependencies (${missingList}); running \"${installer.label}\" in ${SKILL_DIR}`);
    await runInstall(installer.command, installer.args);
    return;
  }

  fail(`dependencies not installed (${missingList}) and no package manager found (need bun or npm): ${installAllHint()}`);
}

async function assertDependenciesInstalled() {
  const missing = await findMissingDependencies();

  if (missing.length === 0) {
    return;
  }

  try {
    await autoInstallDependencies(missing);
  } catch (error) {
    fail(`failed to install dependencies automatically: ${error instanceof Error ? error.message : String(error)}`);
  }

  const remaining = await findMissingDependencies();

  if (remaining.length > 0) {
    fail(`dependencies still missing after auto-install (${remaining.join(", ")}): ${installAllHint()}`);
  }
}

function formatLoadFailure(packageName, error) {
  const message = error instanceof Error ? error.message : String(error);
  return `failed to load ${packageName}: ${message}. If this is first use (or dependencies changed), ${installAllHint()}`;
}

function parseArgs(argv) {
  const args = {
    mermaid: "",
    output: "",
    svgOutput: "",
    htmlOutput: "",
    theme: DEFAULT_THEME,
    htmlPadding: DEFAULT_HTML_PADDING,
    chromePath: "",
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
      args.theme = argv[i + 1] ?? DEFAULT_THEME;
      i += 1;
      continue;
    }
    if (arg === "--html-padding") {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      args.htmlPadding = Number.isFinite(value) ? value : DEFAULT_HTML_PADDING;
      i += 1;
      continue;
    }
    if (arg === "--chrome-path") {
      args.chromePath = argv[i + 1] ?? "";
      i += 1;
    }
  }

  return args;
}

const { mermaid, output, svgOutput, htmlOutput, theme, htmlPadding, chromePath, help } = parseArgs(process.argv.slice(2));

if (help) {
  console.log(`Usage:
  bun scripts/render_mermaid.js --output <OUTPUT_PATH>.png <<'MERMAID'
  flowchart TD
    A[Start] --> B[End]
  MERMAID

  node scripts/render_mermaid.js --output <OUTPUT_PATH>.png <<'MERMAID'
  flowchart TD
    A[Start] --> B[End]
  MERMAID

Options:
  --output <path.png>      Required. Output PNG path.
  --svg-output <path.svg>  Optional. Also write SVG output.
  --html-output <path.html> Optional. Also write HTML wrapper output.
  --theme <name>           Optional. Theme name (default: ${DEFAULT_THEME}).
  --html-padding <pixels>  Optional. HTML wrapper padding (default: ${DEFAULT_HTML_PADDING}).
  --mermaid <text>         Optional. Mermaid text (stdin is preferred).
  --chrome-path <path>     Optional. Chrome/Chromium executable path.
  --help, -h               Show this help message.
`);
  process.exit(0);
}

function resolveThemeName(rawTheme, themeMap) {
  const normalized = rawTheme.trim().toLowerCase();
  if (themeMap[normalized]) {
    return normalized;
  }
  const alias = THEME_ALIASES[normalized];
  if (alias && themeMap[alias]) {
    return alias;
  }
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
      // Ignore missing paths and continue searching.
    }
  }

  return "";
}

async function readMermaidFromStdin() {
  if (process.stdin.isTTY) {
    return "";
  }

  process.stdin.setEncoding("utf8");
  let content = "";
  for await (const chunk of process.stdin) {
    content += chunk;
  }
  return content;
}

const mermaidInput = mermaid || (await readMermaidFromStdin());

if (!mermaidInput.trim()) {
  fail("missing Mermaid input: pass --mermaid or provide content via stdin");
}

if (!output) {
  fail("missing required argument --output");
}

const outputPath = path.resolve(output);
if (path.extname(outputPath).toLowerCase() !== ".png") {
  fail("output must end with .png");
}

const svgOutputPath = svgOutput ? path.resolve(svgOutput) : "";
if (svgOutputPath && path.extname(svgOutputPath).toLowerCase() !== ".svg") {
  fail("svg output must end with .svg");
}

const htmlOutputPath = htmlOutput ? path.resolve(htmlOutput) : "";
if (htmlOutputPath && path.extname(htmlOutputPath).toLowerCase() !== ".html") {
  fail("html output must end with .html");
}

await assertDependenciesInstalled();

let renderMermaidSVG;
let THEMES;
try {
  ({ renderMermaidSVG, THEMES } = await import(MERMAID_PACKAGE));
} catch (error) {
  if (isMissingPackageError(error)) {
    fail(installHint(MERMAID_PACKAGE));
  }
  fail(formatLoadFailure(MERMAID_PACKAGE, error));
}

if (typeof renderMermaidSVG !== "function") {
  fail("renderMermaidSVG is not available in library");
}

if (!THEMES || typeof THEMES !== "object") {
  fail("THEMES is not available in library");
}

const resolvedThemeName = resolveThemeName(theme, THEMES);
if (!resolvedThemeName) {
  const availableThemes = Object.keys(THEMES).sort().join(", ");
  fail(`unknown theme \"${theme}\". Available themes: ${availableThemes}. Aliases: default, solarized`);
}

const themeColors = THEMES[resolvedThemeName];

let puppeteer;
try {
  ({ default: puppeteer } = await import(PUPPETEER_PACKAGE));
} catch (error) {
  if (isMissingPackageError(error)) {
    fail(installHint(PUPPETEER_PACKAGE));
  }
  fail(formatLoadFailure(PUPPETEER_PACKAGE, error));
}

const chromeExecutablePath = await resolveChromePath(chromePath);
if (!chromeExecutablePath) {
  fail("missing Chrome/Chromium executable: pass --chrome-path or set CHROME_PATH");
}

try {
  const svg = renderMermaidSVG(mermaidInput, themeColors);
  const html = createHtmlWrapper(svg, themeColors.bg, htmlPadding);

  await mkdir(path.dirname(outputPath), { recursive: true });
  if (svgOutputPath) {
    await mkdir(path.dirname(svgOutputPath), { recursive: true });
    await writeFile(svgOutputPath, svg, "utf8");
  }
  if (htmlOutputPath) {
    await mkdir(path.dirname(htmlOutputPath), { recursive: true });
    await writeFile(htmlOutputPath, html, "utf8");
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromeExecutablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 2400, height: 2400, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate((minWidth) => {
      const svgElement = document.querySelector(".container svg");
      if (!svgElement) {
        return;
      }

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
    if (!containerElement) {
      throw new Error("rendered container is missing in page");
    }
    await containerElement.screenshot({ path: outputPath, type: "png", omitBackground: false });
  } finally {
    await browser.close();
  }

  console.log(`RENDER_SUCCESS: ${outputPath}`);
  console.log(`RENDER_THEME: ${resolvedThemeName}`);
  if (svgOutputPath) {
    console.log(`RENDER_SUCCESS_SVG: ${svgOutputPath}`);
  }
  if (htmlOutputPath) {
    console.log(`RENDER_SUCCESS_HTML: ${htmlOutputPath}`);
  }
} catch (error) {
  fail(`render failed: ${error instanceof Error ? error.message : String(error)}`);
}
