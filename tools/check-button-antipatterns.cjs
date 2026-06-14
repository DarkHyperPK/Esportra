#!/usr/bin/env node
/**
 * Fail on Button color override anti-patterns that cause invisible text or rose/green clashes.
 */
const { readFileSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')

const BUTTON_PRIMITIVE_FILES = [
  'src/components/ui/button-variants.ts',
  'src/components/ui/JackButton.tsx',
  'src/components/management/CommandSurface.tsx',
  'src/components/ui/JackMenuItem.tsx',
]

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else if (/\.(tsx|ts)$/.test(entry)) files.push(full)
  }
  return files
}

function relPath(file) {
  return file.replace(/\\/g, '/').replace(`${ROOT.replace(/\\/g, '/')}/`, '')
}

let failures = 0

for (const rel of BUTTON_PRIMITIVE_FILES) {
  const file = join(ROOT, rel)
  const content = readFileSync(file, 'utf8')

  if (/\bborder-rose\b/.test(content)) {
    console.error(`FAIL: border-rose in button primitive ${rel}`)
    failures++
  }
  if (/\bring-rose\b/.test(content)) {
    console.error(`FAIL: ring-rose in button primitive ${rel}`)
    failures++
  }
  if (/\btext-black\b/.test(content)) {
    console.error(`FAIL: text-black in button primitive ${rel} — use text-matte-black`)
    failures++
  }
}

for (const file of walk(SRC)) {
  const content = readFileSync(file, 'utf8')
  const rel = relPath(file)

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

  const roseStrokeInTag = (tag) => /\b(?:border-rose|ring-rose|hover:border-rose)\b/.test(tag)

  const buttonTagRe = /<(?:Button|button)\b[\s\S]{0,500}?>/g
  const reported = new Set()
  for (const match of content.matchAll(buttonTagRe)) {
    const tag = match[0]
    if (!/\bclassName=/.test(tag) && !roseStrokeInTag(tag)) continue
    if (!roseStrokeInTag(tag)) continue
    const key = tag.replace(/\s+/g, ' ').slice(0, 160)
    if (reported.has(key)) continue
    reported.add(key)
    console.error(`FAIL: button with rose border/ring stroke in ${rel}`)
    console.error(`  ${key}...`)
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures} button antipattern(s) found. Use JackButton, AccentButton, or SuccessButton instead.`)
  process.exit(1)
}

console.log('Button antipattern check passed.')
