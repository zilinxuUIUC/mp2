import { mkdir, readFile, writeFile } from 'node:fs/promises'

// GitHub Pages serves real files for direct links, without an inline redirect script.
const html = await readFile('dist/index.html', 'utf8')
for (const route of ['gallery', ...Array.from({ length: 151 }, (_, i) => `pokemon/${i + 1}`)]) {
  await mkdir(`dist/${route}`, { recursive: true })
  await writeFile(`dist/${route}/index.html`, html)
}
await writeFile('dist/404.html', html)
