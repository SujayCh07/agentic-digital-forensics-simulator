#!/usr/bin/env node
/**
 * record-demo.js — records a 60s video of EchoLocate running.
 * Usage: node scripts/record-demo.js [output.webm]
 * Requires the app to be running at http://localhost:3000
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUTPUT =
  process.argv[2] ||
  path.join(__dirname, "../recordings/demo.webm");
const RECORD_DURATION_MS = 62000; // 62 seconds

async function record() {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: path.dirname(OUTPUT),
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const investigateButton = page.getByRole("button", { name: /investigate/i }).first();
  if ((await investigateButton.count()) > 0) {
    await investigateButton.click();
    console.log("EchoLocate investigation started.");
  }

  console.log(`Recording for ${RECORD_DURATION_MS / 1000}s...`);
  await page.waitForTimeout(RECORD_DURATION_MS);

  console.log("Saving recording...");
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (videoPath && videoPath !== OUTPUT) {
    fs.renameSync(videoPath, OUTPUT);
  }

  console.log(`Saved: ${OUTPUT}`);
}

record().catch((err) => {
  console.error("Recording failed:", err.message);
  console.error(
    "Make sure the app is running: ./run-start.sh or ./run.sh",
  );
  process.exit(1);
});
