import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const { chromium } = await import(process.env.QA_PLAYWRIGHT_MODULE || 'playwright')
const outputDir = process.env.QA_OUTPUT || 'visual-qa'
const baseUrl = process.env.QA_URL || 'http://127.0.0.1:5173'

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  ...(process.env.QA_BROWSER_PATH ? { executablePath: process.env.QA_BROWSER_PATH } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

const report = { viewports: [], errors: [] }

async function inspectViewport(viewport, name) {
  const context = await browser.newContext({
    viewport,
    screen: viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => report.errors.push(error.stack || error.message))
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(message.text()) })
  await page.addInitScript(() => localStorage.setItem('mangrove-bay-3d-help-seen', '1'))
  await page.goto(`${baseUrl}/?mobile-shell-qa=1`)
  await page.waitForSelector('.game3d-shell')
  await page.waitForSelector('.world-canvas canvas', { timeout: 45000 })

  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const box = element.getBoundingClientRect()
      return {
        selector,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        visible: getComputedStyle(element).display !== 'none',
      }
    }
    const utilityButtons = [...document.querySelectorAll('.utility-rail button')].map((button) => {
      const box = button.getBoundingClientRect()
      return { width: box.width, height: box.height }
    })
    return {
      viewport: { width: innerWidth, height: innerHeight },
      metaViewport: document.querySelector('meta[name="viewport"]')?.content || '',
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      shell: rect('.game3d-shell'),
      world: rect('.world-canvas'),
      hud: ['.top-hud', '.left-stack', '.coast-status', '.plant-dock', '.utility-rail', '.notice-toast'].map(rect).filter(Boolean),
      utilityButtons,
    }
  })

  assert.match(layout.metaViewport, /viewport-fit=cover/)
  assert.ok(Math.abs(layout.viewport.width - viewport.width) <= 1, `innerWidth ${layout.viewport.width} != ${viewport.width}`)
  assert.ok(Math.abs(layout.viewport.height - viewport.height) <= 1, `innerHeight ${layout.viewport.height} != ${viewport.height}`)
  assert.ok(layout.scrollWidth <= layout.viewport.width + 1, `horizontal overflow: ${layout.scrollWidth} > ${layout.viewport.width}`)
  assert.ok(layout.scrollHeight <= layout.viewport.height + 1, `vertical overflow: ${layout.scrollHeight} > ${layout.viewport.height}`)

  for (const stage of [layout.shell, layout.world]) {
    assert.ok(stage, 'game stage must exist')
    assert.ok(Math.abs(stage.x) <= 1 && Math.abs(stage.y) <= 1, `${stage.selector} must start at viewport origin`)
    assert.ok(Math.abs(stage.width - layout.viewport.width) <= 1, `${stage.selector} must fill viewport width`)
    assert.ok(Math.abs(stage.height - layout.viewport.height) <= 1, `${stage.selector} must fill viewport height`)
  }

  for (const element of layout.hud.filter((item) => item.visible)) {
    assert.ok(element.x >= -1 && element.y >= -1, `${element.selector} starts outside viewport: ${JSON.stringify(element)}`)
    assert.ok(element.x + element.width <= layout.viewport.width + 1, `${element.selector} overflows horizontally: ${JSON.stringify(element)}`)
    assert.ok(element.y + element.height <= layout.viewport.height + 1, `${element.selector} overflows vertically: ${JSON.stringify(element)}`)
  }

  const dock = layout.hud.find((item) => item.selector === '.plant-dock')
  const rail = layout.hud.find((item) => item.selector === '.utility-rail')
  const overlap = dock && rail && dock.x < rail.x + rail.width && dock.x + dock.width > rail.x && dock.y < rail.y + rail.height && dock.y + dock.height > rail.y
  assert.equal(Boolean(overlap), false, 'plant dock and utility rail must not overlap')

  for (const button of layout.utilityButtons) {
    assert.ok(button.width >= 43.5 && button.height >= 43.5, `utility touch target too small: ${JSON.stringify(button)}`)
  }

  await page.screenshot({ path: `${outputDir}/${name}.png` })

  // Selecting an empty plot must expose the planting CTA without requiring a
  // hidden scroll inside the short landscape details card.
  await page.locator('.utility-rail button[aria-label="เปิดแผนที่แปลง"]').click()
  await page.waitForSelector('.plot-picker')
  await page.locator('.plot-picker button').nth(4).click()
  await page.waitForSelector('.confirm-plant')
  const plotAction = await page.evaluate(() => {
    const card = document.querySelector('.selected-plot-card')
    const button = document.querySelector('.confirm-plant')
    const cardBox = card?.getBoundingClientRect()
    const buttonBox = button?.getBoundingClientRect()
    if (!cardBox || !buttonBox) return null
    const hit = document.elementFromPoint(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2)
    return {
      card: { x: cardBox.x, y: cardBox.y, width: cardBox.width, height: cardBox.height },
      button: { x: buttonBox.x, y: buttonBox.y, width: buttonBox.width, height: buttonBox.height },
      reachable: Boolean(hit && (hit === button || button.contains(hit))),
    }
  })
  assert.ok(plotAction, 'selected plot and confirm planting action must exist')
  assert.ok(plotAction.button.x >= -1 && plotAction.button.y >= -1, `confirm planting starts outside viewport: ${JSON.stringify(plotAction.button)}`)
  assert.ok(plotAction.button.x + plotAction.button.width <= layout.viewport.width + 1, `confirm planting overflows horizontally: ${JSON.stringify(plotAction.button)}`)
  assert.ok(plotAction.button.y + plotAction.button.height <= layout.viewport.height + 1, `confirm planting overflows vertically: ${JSON.stringify(plotAction.button)}`)
  assert.ok(plotAction.button.height >= 43.5, `confirm planting touch target too small: ${JSON.stringify(plotAction.button)}`)
  assert.equal(plotAction.reachable, true, 'confirm planting must be the reachable topmost control at its center point')
  await page.screenshot({ path: `${outputDir}/${name}-plot-confirm.png` })

  report.viewports.push({ name, ...layout, plotAction })
  await context.close()
}

try {
  await inspectViewport({ width: 390, height: 844 }, 'iphone-portrait-390x844')
  await inspectViewport({ width: 844, height: 390 }, 'iphone-landscape-844x390')
  await inspectViewport({ width: 926, height: 428 }, 'iphone-pro-max-landscape-926x428')
  assert.deepEqual(report.errors, [], 'browser console/page errors')
} finally {
  await fs.writeFile(`${outputDir}/mobile-shell-report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
