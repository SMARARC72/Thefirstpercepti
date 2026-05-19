import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const outputDir = path.join(appDir, "output", "playwright");
const port = Number(process.env.SMOKE_PORT ?? 5187);
const baseUrl = `http://127.0.0.1:${port}`;
const viteBin = path.join(appDir, "node_modules", "vite", "bin", "vite.js");

mkdirSync(outputDir, { recursive: true });

const server = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: appDir,
  env: { ...process.env, CI: "1" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    if (server.exitCode !== null) {
      throw new Error(`Vite server exited early with code ${server.exitCode}\n${serverLog}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${baseUrl}\n${serverLog}`);
}

function stopServer() {
  if (server.exitCode !== null || !server.pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  server.kill("SIGTERM");
}

async function canvasHasPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#perception-map");
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let index = 0; index < data.length; index += 64) {
      if (data[index] || data[index + 1] || data[index + 2]) return true;
    }

    return false;
  });
}

async function readHook(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function runSmoke() {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "The First Perception" }).waitFor();
    await page.screenshot({ path: path.join(outputDir, "title-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: "Begin" }).click();
    await page.locator("#creation-name").fill("Ira Smoke");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("input[name='form'][value='human']").check({ force: true });
    await page.locator("#form-description").fill("A red thread around one wrist.");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#first-perception").fill("Grey ash fell upward beside a broken market bell.");
    await page.locator("#dominant-sense").selectOption("sight");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#capability-claim").fill("I can hear the shape of a lie before it becomes language.");
    await page.locator("#primary-domain").selectOption("lore");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("input[name='posture'][value='witness']").check({ force: true });
    await page.locator("#posture-description").fill("Record first, intervene before silence becomes permission.");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#optional-details").fill("Keeps names in a paper ledger that never dries.");
    await page.locator("#desired-item").fill("a cracked brass lens");
    await page.locator("#fear").fill("being remembered incorrectly");
    await page.locator("#left-behind").fill("a room full of sleeping bells");
    await page.screenshot({ path: path.join(outputDir, "creation-step-six.png"), fullPage: true });
    await page.getByRole("button", { name: "Enter The World" }).click();

    await page.locator("#command-input").waitFor();
    let hook = await readHook(page);
    assert(hook.mode === "gameplay", "Expected gameplay mode after creation.");
    assert(hook.game.onboardingVisible === true, "Expected first-turn onboarding to be visible.");
    await page.screenshot({ path: path.join(outputDir, "gameplay-desktop.png"), fullPage: true });

    await page.locator("#command-input").fill("Look around carefully");
    await page.locator("#command-form button[type='submit']").click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.turn === 1);
    hook = await readHook(page);
    assert(hook.game.latestFate, "Expected a fate record after command submission.");
    assert(hook.game.latestTale.turn === 1, "Expected the tale log to advance to turn 1.");

    await page.getByRole("button", { name: "Save" }).click();
    const hasSave = await page.evaluate(() => localStorage.getItem("the-first-perception.save.v1") !== null);
    assert(hasSave, "Expected localStorage save payload.");

    const elapsedBefore = hook.elapsedMs;
    await page.evaluate(() => window.advanceTime(2500));
    await page.waitForFunction(
      (before) => JSON.parse(window.render_game_to_text()).elapsedMs >= before + 2500,
      elapsedBefore,
    );

    await page.getByRole("tab", { name: "World" }).click();
    await page.waitForTimeout(100);
    assert(await canvasHasPixels(page), "Expected non-blank perception map canvas.");

    await page.getByRole("button", { name: "Title" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#command-input").waitFor();
    hook = await readHook(page);
    assert(hook.game.turn === 1, "Expected continue flow to restore saved turn.");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/?demo=1`, { waitUntil: "networkidle" });
    await page.locator("#command-input").waitFor();
    await page.getByRole("tab", { name: "World" }).click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(outputDir, "gameplay-mobile-world.png"), fullPage: true });

    const horizontalOverflow = await page.evaluate(() => {
      const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      return width - window.innerWidth;
    });
    assert(horizontalOverflow <= 2, `Expected no mobile horizontal overflow, saw ${horizontalOverflow}px.`);
    assert(await canvasHasPixels(page), "Expected non-blank mobile perception map canvas.");

    assert(pageErrors.length === 0, `Page errors: ${pageErrors.join("\n")}`);
    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join("\n")}`);

    console.log("web smoke passed");
    console.log(`screenshots: ${outputDir}`);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

runSmoke()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    stopServer();
  });
