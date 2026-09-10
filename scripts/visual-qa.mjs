import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:5173'
const outputDir = 'visual-qa'
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
})

async function capture(name, viewport, isMobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
  })
  const page = await context.newPage()
  const messages = []

  page.on('console', (message) => {
    messages.push(`[console:${message.type()}] ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    messages.push(`[pageerror] ${error.stack || error.message}`)
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('mangrove-bay-3d-help-seen', '1')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.game3d-shell', { timeout: 30000 })
  await page.waitForTimeout(6000)

  const diagnostics = await page.evaluate(() => {
    const inspect = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        selector,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        display: style.display,
        position: style.position,
        zIndex: style.zIndex,
        visibility: style.visibility,
        opacity: style.opacity,
        transform: style.transform,
      }
    }

    const glCanvas = document.querySelector('canvas')
    let webgl = null
    if (glCanvas) {
      const gl = glCanvas.getContext('webgl2') || glCanvas.getContext('webgl')
      webgl = gl ? {
        drawingBufferWidth: gl.drawingBufferWidth,
        drawingBufferHeight: gl.drawingBufferHeight,
        renderer: gl.getParameter(gl.RENDERER),
        vendor: gl.getParameter(gl.VENDOR),
      } : null
    }

    return {
      title: document.title,
      url: location.href,
      bodyChildren: document.body.children.length,
      rootTextPreview: document.getElementById('root')?.innerText.slice(0, 400) || '',
      elements: [
        inspect('.game3d-shell'),
        inspect('.world-canvas'),
        inspect('canvas'),
        inspect('.game-ui'),
        inspect('.top-hud'),
        inspect('.right-dashboard'),
        inspect('.plant-dock'),
        inspect('.notice-toast'),
      ],
      webgl,
    }
  })

  const screenshotPath = `${outputDir}/${name}.png`
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await fs.writeFile(
    `${outputDir}/${name}.json`,
    `${JSON.stringify({ diagnostics, messages }, null, 2)}\n`,
  )
  await context.close()
}

await capture('mangrove-bay-3d-desktop', { width: 1440, height: 900 })
await capture('mangrove-bay-3d-mobile', { width: 390, height: 844 }, true)
await browser.close()
