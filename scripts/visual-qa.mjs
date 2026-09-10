import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:5173'
const outputDir = 'visual-qa'
const saveKey = 'mangrove-bay-3d-save-v2'
const helpKey = 'mangrove-bay-3d-help-seen'

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

function developedGame(game) {
  const species = ['rhizophora', 'avicennia', 'sonneratia']
  const ages = [8, 6, 4, 2]
  const plots = game.plots.map((plot, index) => {
    if (index >= 14) return { ...plot, species: null, age: 0, health: 100, dead: false }
    const dead = index === 13
    return {
      ...plot,
      species: species[index % species.length],
      age: ages[index % ages.length] + Math.floor(index / 6),
      health: dead ? 4 : 78 + (index * 7) % 22,
      dead,
    }
  })

  return {
    ...game,
    day: 24,
    coins: 1640,
    gems: 28,
    estimatedCarbon: 18.6,
    credits: 8.4,
    biodiversity: 58,
    community: 49,
    coastal: 54,
    marketPrice: 104,
    activeSpecies: 'sonneratia',
    plots,
    event: null,
    upgrades: { nursery: 2, mrv: 2, community: 2 },
    stats: { planted: 14, dead: 1, verified: 32.6, sold: 11 },
    claimedChapters: [0, 1, 2],
    log: [
      { day: 24, type: 'carbon', text: 'ป่าฟื้นตัวและผ่าน MRV รอบล่าสุดแล้ว' },
      { day: 23, type: 'reward', text: 'ชุมชนสร้างรายได้กลับเข้าโครงการ' },
      ...(game.log || []),
    ].slice(0, 8),
  }
}

async function preparePage(page, scenario = 'initial') {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(({ helpKey: key }) => {
    localStorage.setItem(key, '1')
  }, { helpKey })

  if (scenario === 'developed') {
    await page.evaluate(({ saveKey: key }) => {
      const raw = localStorage.getItem(key)
      if (!raw) throw new Error('Game save was not initialized')
      const game = JSON.parse(raw)
      const species = ['rhizophora', 'avicennia', 'sonneratia']
      const ages = [8, 6, 4, 2]
      game.day = 24
      game.coins = 1640
      game.gems = 28
      game.estimatedCarbon = 18.6
      game.credits = 8.4
      game.biodiversity = 58
      game.community = 49
      game.coastal = 54
      game.marketPrice = 104
      game.activeSpecies = 'sonneratia'
      game.event = null
      game.upgrades = { nursery: 2, mrv: 2, community: 2 }
      game.stats = { planted: 14, dead: 1, verified: 32.6, sold: 11 }
      game.claimedChapters = [0, 1, 2]
      game.plots = game.plots.map((plot, index) => {
        if (index >= 14) return { ...plot, species: null, age: 0, health: 100, dead: false }
        const dead = index === 13
        return {
          ...plot,
          species: species[index % species.length],
          age: ages[index % ages.length] + Math.floor(index / 6),
          health: dead ? 4 : 78 + (index * 7) % 22,
          dead,
        }
      })
      game.log = [
        { day: 24, type: 'carbon', text: 'ป่าฟื้นตัวและผ่าน MRV รอบล่าสุดแล้ว' },
        { day: 23, type: 'reward', text: 'ชุมชนสร้างรายได้กลับเข้าโครงการ' },
        ...(game.log || []),
      ].slice(0, 8)
      localStorage.setItem(key, JSON.stringify(game))
    }, { saveKey })
  }

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.game3d-shell', { timeout: 30000 })
  await page.waitForSelector('canvas', { timeout: 30000 })
  await page.waitForTimeout(6000)
}

async function diagnosticsFor(page) {
  return page.evaluate(() => {
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

    const canvas = document.querySelector('canvas')
    let webgl = null
    if (canvas) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
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
      rootTextPreview: document.getElementById('root')?.innerText.slice(0, 500) || '',
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
}

async function capture(name, viewport, { isMobile = false, scenario = 'initial' } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
  })
  const page = await context.newPage()
  const messages = []

  page.on('console', (message) => messages.push(`[console:${message.type()}] ${message.text()}`))
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.stack || error.message}`))

  await preparePage(page, scenario)
  const diagnostics = await diagnosticsFor(page)
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: false })
  await fs.writeFile(
    `${outputDir}/${name}.json`,
    `${JSON.stringify({ diagnostics, messages, scenario }, null, 2)}\n`,
  )
  await context.close()
}

async function exerciseCoreLoop() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const messages = []
  page.on('console', (message) => messages.push(`[console:${message.type()}] ${message.text()}`))
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.stack || error.message}`))

  await preparePage(page)
  const canvas = page.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('3D canvas has no bounding box')

  const candidates = [
    [0.47, 0.35], [0.53, 0.39], [0.42, 0.43], [0.50, 0.47],
    [0.58, 0.46], [0.37, 0.53], [0.46, 0.57], [0.56, 0.59],
    [0.64, 0.53], [0.34, 0.64], [0.45, 0.66], [0.56, 0.68],
  ]

  let plantedAt = null
  for (const [xRatio, yRatio] of candidates) {
    await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio)
    await page.waitForTimeout(350)
    const planted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).stats.planted, saveKey)
    if (planted > 0) {
      plantedAt = { xRatio, yRatio }
      break
    }
  }
  if (!plantedAt) throw new Error('Could not plant by clicking any visible 3D plot')

  const afterPlant = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey)
  if (afterPlant.stats.planted !== 1 || afterPlant.coins >= 960) {
    throw new Error(`Planting state invalid: ${JSON.stringify(afterPlant.stats)}`)
  }

  await page.locator('.next-day-button').click()
  await page.waitForTimeout(600)
  const afterDay = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey)
  if (afterDay.day !== 2 || !afterDay.plots.some((plot) => plot.species && plot.age >= 1)) {
    throw new Error('End-day action did not advance growth')
  }

  await page.evaluate((key) => {
    const game = JSON.parse(localStorage.getItem(key))
    game.estimatedCarbon = 12
    game.coins = 1000
    game.event = null
    localStorage.setItem(key, JSON.stringify(game))
  }, saveKey)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.carbon-panel .primary-game-button')
  await page.waitForTimeout(1200)

  await page.locator('.carbon-panel .primary-game-button').click()
  await page.waitForTimeout(600)
  const afterMrv = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey)
  if (afterMrv.estimatedCarbon !== 0 || afterMrv.credits <= 0 || afterMrv.stats.verified <= 0) {
    throw new Error('MRV action did not issue verified credits')
  }

  const coinsBeforeSale = afterMrv.coins
  const creditsBeforeSale = afterMrv.credits
  await page.locator('.market-actions button').first().click()
  await page.waitForTimeout(500)
  const afterSale = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey)
  if (afterSale.coins <= coinsBeforeSale || afterSale.credits >= creditsBeforeSale) {
    throw new Error('Carbon market sale did not update resources')
  }

  await page.screenshot({ path: `${outputDir}/mangrove-bay-3d-core-loop.png`, fullPage: false })
  await fs.writeFile(
    `${outputDir}/mangrove-bay-3d-core-loop.json`,
    `${JSON.stringify({
      passed: true,
      plantedAt,
      afterPlant: {
        day: afterPlant.day,
        coins: afterPlant.coins,
        planted: afterPlant.stats.planted,
      },
      afterDay: {
        day: afterDay.day,
        estimatedCarbon: afterDay.estimatedCarbon,
      },
      afterMrv: {
        credits: afterMrv.credits,
        verified: afterMrv.stats.verified,
      },
      afterSale: {
        coins: afterSale.coins,
        credits: afterSale.credits,
      },
      messages,
    }, null, 2)}\n`,
  )
  await context.close()
}

await capture('mangrove-bay-3d-desktop', { width: 1440, height: 900 })
await capture('mangrove-bay-3d-mobile', { width: 390, height: 844 }, { isMobile: true })
await capture('mangrove-bay-3d-developed-desktop', { width: 1440, height: 900 }, { scenario: 'developed' })
await capture('mangrove-bay-3d-developed-mobile', { width: 390, height: 844 }, { isMobile: true, scenario: 'developed' })
await exerciseCoreLoop()
await browser.close()
