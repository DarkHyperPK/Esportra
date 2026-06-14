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
  'src/components/ui/button.tsx',
  'src/components/ui/app-buttons.tsx',
]

const { classNameHasColorUtilities } = require('./button-color-classname.cjs')

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

const ENFORCED_SCOPE = [
  /^src\/pages\/tournaments\/brackets\//,
  /^src\/components\/bracket\//,
  /^src\/components\/tournament\//,
  /^src\/components\/notifications\//,
  /^src\/pages\/notifications\//,
  /^src\/pages\/tools\/PublicBracket/,
  /^src\/pages\/organizer\/TournamentManage\.tsx$/,
  /^src\/components\/organizer\/PaymentManagement\.tsx$/,
  /^src\/components\/organizer\/MatchChecker\.tsx$/,
  /^src\/components\/organizer\/br\//,
]

function isEnforcedScope(rel) {
  return ENFORCED_SCOPE.some((pattern) => pattern.test(rel))
}

function hasColorUtilities(value) {
  return classNameHasColorUtilities(value)
}

function extractButtonOpeningTags(content) {
  const tags = []
  const openRe = /<Button\b/g
  let match
  while ((match = openRe.exec(content)) !== null) {
    const start = match.index
    let i = start
    let quote = null
    let braceDepth = 0
  outer:
    while (i < content.length) {
      const ch = content[i]
      if (quote) {
        if (ch === quote && content[i - 1] !== '\\') quote = null
        i++
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
        i++
        continue
      }
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth = Math.max(0, braceDepth - 1)
      if ((ch === '>' || ch === '/') && braceDepth === 0) {
        const next = content[i + 1]
        if (ch === '>' || (ch === '/' && next === '>')) {
          const end = ch === '/' ? i + 2 : i + 1
          tags.push(content.slice(start, end))
          break outer
        }
      }
      i++
    }
  }
  return tags
}

function extractClassNameValue(tag) {
  const quoted = tag.match(/className="([^"]*)"/)
  if (quoted) return quoted[1]

  const cnExpr = tag.match(/className=\{cn\(([\s\S]*)\)\}/)
  if (cnExpr) return cnExpr[1]

  const template = tag.match(/className=\{`([^`]*)`\}/)
  if (template) return template[1]

  const genericExpr = tag.match(/className=\{([^}]+)\}/)
  if (genericExpr) return genericExpr[1]

  return ''
}

function extractNativeButtonOpeningTags(content) {
  const tags = []
  const openRe = /<button\b/g
  let match
  while ((match = openRe.exec(content)) !== null) {
    const start = match.index
    let i = start
    let quote = null
    let braceDepth = 0
  outer:
    while (i < content.length) {
      const ch = content[i]
      if (quote) {
        if (ch === quote && content[i - 1] !== '\\') quote = null
        i++
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
        i++
        continue
      }
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth = Math.max(0, braceDepth - 1)
      if ((ch === '>' || ch === '/') && braceDepth === 0) {
        const next = content[i + 1]
        if (ch === '>' || (ch === '/' && next === '>')) {
          const end = ch === '/' ? i + 2 : i + 1
          tags.push(content.slice(start, end))
          break outer
        }
      }
      i++
    }
  }
  return tags
}


let failures = 0
let scopedColorFailures = 0
let legacyColorViolations = 0

for (const rel of BUTTON_PRIMITIVE_FILES) {
  const file = join(ROOT, rel)
  if (!statSync(file, { throwIfNoEntry: false })) continue
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

  if (BUTTON_PRIMITIVE_FILES.includes(rel)) continue

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

  const reportedColorOverrides = new Set()
  for (const tag of extractButtonOpeningTags(content)) {
    const classValue = extractClassNameValue(tag)
    if (!hasColorUtilities(classValue)) continue
    const key = tag.replace(/\s+/g, ' ').slice(0, 180)
    if (reportedColorOverrides.has(key)) continue
    reportedColorOverrides.add(key)
    if (isEnforcedScope(rel)) {
      scopedColorFailures++
      console.error(`FAIL: <Button> color utilities in className in ${rel}`)
      console.error(`  ${key}...`)
      failures++
    } else {
      legacyColorViolations++
    }
  }
  const reportedNativeIssues = new Set()
  for (const tag of extractNativeButtonOpeningTags(content)) {
    if (!isEnforcedScope(rel)) continue

    const classValue = extractClassNameValue(tag)
    const hasClassNameAttr = /\bclassName=/.test(tag)
    const key = tag.replace(/\s+/g, ' ').slice(0, 180)

    if (/\bvariant=/.test(tag) || /\basChild\b/.test(tag)) {
      if (!reportedNativeIssues.has(`prop:${key}`)) {
        reportedNativeIssues.add(`prop:${key}`)
        console.error(`FAIL: native <button> uses Button-only prop (variant/asChild) in ${rel}`)
        console.error(`  ${key}...`)
        failures++
      }
    }

    if (/\bsize="(?:sm|lg|default|icon|hero)"\b/.test(tag)) {
      if (!reportedNativeIssues.has(`size:${key}`)) {
        reportedNativeIssues.add(`size:${key}`)
        console.error(`FAIL: native <button> uses Button-only size prop in ${rel}`)
        console.error(`  ${key}...`)
        failures++
      }
    }

    if (!hasClassNameAttr) {
      if (!reportedNativeIssues.has(`noclass:${key}`)) {
        reportedNativeIssues.add(`noclass:${key}`)
        console.error(`FAIL: native <button> missing className in ${rel}`)
        console.error(`  ${key}...`)
        failures++
      }
    }
  }
}

if (legacyColorViolations > 0) {
  console.warn(`WARN: ${legacyColorViolations} legacy <Button> color className override(s) outside enforced scope.`)
}

if (failures > 0) {
  console.error(`\n${failures} button antipattern(s) found. Use semantic app-buttons or native <button> for domain colors.`)
  process.exit(1)
}

console.log('Button antipattern check passed.')
