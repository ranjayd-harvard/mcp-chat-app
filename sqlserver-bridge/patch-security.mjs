// Patches two bugs in @bilims/mcp-sqlserver:
//
// Bug 1 — security.js: QueryValidator uses substring includes() to check for
// forbidden keywords, so column names like "create_date" falsely trigger the
// CREATE keyword block. Fix: switch to word-boundary regex (\bCREATE\b).
//
// Bug 2 — validation.js: escapeIdentifier() wraps values in [brackets], which
// is SQL identifier syntax. These escaped values are then used as string
// literals in WHERE clauses (e.g. WHERE TABLE_SCHEMA = [dbo]), which SQL
// Server interprets as column references → "Invalid column name 'dbo'".
// Fix: use single-quoted strings instead of bracket-quoted identifiers.

import { readFileSync, writeFileSync } from 'node:fs';

function patch(relPath, original, replacement, label) {
  const filePath = new URL(relPath, import.meta.url).pathname;
  const content = readFileSync(filePath, 'utf8');
  if (!content.includes(original)) {
    console.log(`⚠️  ${label}: pattern not found — already patched or package changed`);
    return;
  }
  writeFileSync(filePath, content.replace(original, replacement));
  console.log(`✅ ${label}`);
}

// Bug 1: word-boundary keyword matching
patch(
  './node_modules/@bilims/mcp-sqlserver/dist/security.js',
  'normalizedQuery.includes(forbidden)',
  'new RegExp("\\\\b" + forbidden + "\\\\b").test(normalizedQuery)',
  'security.js — QueryValidator uses word-boundary regex'
);

// Bug 2: single-quoted string values instead of bracket-quoted identifiers
patch(
  './node_modules/@bilims/mcp-sqlserver/dist/validation.js',
  'return `[${cleaned}]`;',
  "return `'${cleaned}'`;",
  'validation.js — escapeIdentifier uses single-quoted strings for WHERE values'
);
