import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const desktopZoom = 'const responsiveZoom = Math.max(13, Math.min(46, Math.min(size.width / 29, size.height / 22)))'
const responsiveZoom = `const responsiveZoom = size.width < 600
      ? 22
      : size.width < 900
        ? 30
        : Math.max(30, Math.min(46, Math.min(size.width / 29, size.height / 22)))`

const contactShadowBlock = `      <ContactShadows
        position={[0, -0.54, 0]}
        opacity={0.3}
        scale={34}
        blur={2.7}
        far={16}
        resolution={256}
      />
`

function naturalWorldRenderFix() {
  return {
    name: 'natural-world-render-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/MangroveWorld3DNatural.jsx')) return null

      const fixed = code
        .replace('  ContactShadows,\n', '')
        .replace(desktopZoom, responsiveZoom)
        .replace(contactShadowBlock, '')

      return fixed === code ? null : { code: fixed, map: null }
    },
  }
}

export default defineConfig({
  plugins: [naturalWorldRenderFix(), react()],
})
