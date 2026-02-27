// scan_getRazorpayKeys.js
// Scans the workspace for imports/usages of `getRazorpayKeys` and reports files that reference it.
// Usage: node scripts/scan_getRazorpayKeys.js

const fs = require('fs')
const path = require('path')

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir)
  files.forEach((file) => {
    const full = path.join(dir, file)
    try {
      const stat = fs.statSync(full)
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file.startsWith('.')) return
        walk(full, filelist)
      } else {
        filelist.push(full)
      }
    } catch (e) {
      // ignore
    }
  })
  return filelist
}

const repoRoot = path.resolve(__dirname, '..')
const files = walk(repoRoot)
const hits = []
for (const f of files) {
  if (!f.endsWith('.ts') && !f.endsWith('.tsx') && !f.endsWith('.js') && !f.endsWith('.jsx')) continue
  try {
    const content = fs.readFileSync(f, 'utf8')
    if (content.includes('getRazorpayKeys')) {
      hits.push(f)
    }
  } catch (e) {}
}

if (hits.length === 0) {
  console.log('No references to getRazorpayKeys found in scanned files.')
} else {
  console.log('Found references to getRazorpayKeys in:')
  hits.forEach(h => console.log(' -', path.relative(repoRoot, h)))
}
