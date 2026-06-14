#!/usr/bin/env node
/**
 * Fail on Button color override anti-patterns that cause invisible text or rose/green clashes.
 */
const { readFileSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else if (/\.(tsx|ts)$/.test(entry)) files.push(full)
  }
  return files
}

let failures = 0

for (const file of walk(SRC)) {
  const content = readFileSync(file, 'utf8')
  const rel = file.replace(/\\/g, '/').replace(`${ROOT.replace(/\\/g, '/')}/`, '')

  const conflictRe = /className="[^"]*text-black[^"]*text-white[^"]*"/g
  for (const match of content.matchAll(conflictRe)) {
    const value = match[0]
    const withoutHover = value.replace(/hover:text-white/g, '')
    if (/text-black/.test(withoutHover) && /(?<!hover:)text-white/.test(withoutHover)) {
      console.error(`FAIL: conflicting text-black + text-white in ${rel}`)
      console.error(`  ${value}`)
      failures++
    }
  }

  const buttonRe = /<Button[^>]*className="[^"]*bg-white[^"/][^"]*"[^>]*>/g
  for (const match of content.matchAll(buttonRe)) {
    const tag = match[0]
    if (tag.includes('variant=')) continue
    if (tag.includes('bg-white/')) continue
    console.error(`FAIL: <Button> with solid bg-white className override in ${rel}`)
    console.error(`  ${tag}`)
    failures++
  }

  const greenButtonRe = /<Button[^>]*className="[^"]*\bbg-green-(?:500|600|700)\b[^"]*"[^>]*>/g
  for (const match of content.matchAll(greenButtonRe)) {
    const tag = match[0]
    if (tag.includes('SuccessButton')) continue
    if (tag.includes('variant="success"')) continue
    console.error(`FAIL: <Button> with green bg className override in ${rel}`)
    console.error(`  ${tag}`)
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures} button antipattern(s) found. Use JackButton, AccentButton, or SuccessButton instead.`)
  process.exit(1)
}

console.log('Button antipattern check passed.')
