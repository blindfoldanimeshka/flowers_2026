/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'app', 'api');
const IMPORT_LINE = "import { withErrorHandler } from '@/lib/errorHandler';";
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

function listRouteFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listRouteFiles(full, out);
      continue;
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

function findMatching(text, start, openChar, closeChar) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 1;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = ch === '\\' && !escaped;
      continue;
    }
    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = ch === '\\' && !escaped;
      continue;
    }
    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = ch === '\\' && !escaped;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      escaped = false;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      escaped = false;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      escaped = false;
      continue;
    }

    if (ch === openChar) depth += 1;
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function parseTopLevelTryCatch(body) {
  const trimmed = body.trim();
  if (!trimmed.startsWith('try')) return null;

  const tryWordIndex = body.indexOf('try');
  const tryBraceOpen = body.indexOf('{', tryWordIndex);
  if (tryBraceOpen === -1) return null;
  const tryBraceClose = findMatching(body, tryBraceOpen, '{', '}');
  if (tryBraceClose === -1) return null;

  const afterTry = body.slice(tryBraceClose + 1).trimStart();
  if (!afterTry.startsWith('catch')) return null;

  const catchWordIndex = body.indexOf('catch', tryBraceClose + 1);
  const catchParamOpen = body.indexOf('(', catchWordIndex);
  const catchParamClose = catchParamOpen !== -1 ? findMatching(body, catchParamOpen, '(', ')') : -1;
  if (catchParamOpen === -1 || catchParamClose === -1) return null;

  const catchBraceOpen = body.indexOf('{', catchParamClose + 1);
  const catchBraceClose = catchBraceOpen !== -1 ? findMatching(body, catchBraceOpen, '{', '}') : -1;
  if (catchBraceOpen === -1 || catchBraceClose === -1) return null;

  const tail = body.slice(catchBraceClose + 1).trim();
  if (tail.length > 0) return null;

  const tryBody = body.slice(tryBraceOpen + 1, tryBraceClose);
  return { tryBody };
}

function ensureImport(content, eol) {
  if (content.includes(IMPORT_LINE)) return content;

  const lines = content.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*import\s.+from\s+['"].+['"];?\s*$/.test(lines[i]) || /^\s*import\s+['"].+['"];?\s*$/.test(lines[i])) {
      lastImport = i;
    }
  }

  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, IMPORT_LINE);
  } else {
    lines.unshift(IMPORT_LINE);
  }

  return lines.join(eol);
}

function transform(content) {
  let cursor = 0;
  let output = '';
  let changed = false;

  while (cursor < content.length) {
    const exportIndex = content.indexOf('export async function ', cursor);
    if (exportIndex === -1) {
      output += content.slice(cursor);
      break;
    }

    output += content.slice(cursor, exportIndex);

    const nameStart = exportIndex + 'export async function '.length;
    const nameMatch = content.slice(nameStart).match(/^([A-Za-z_]\w*)/);
    if (!nameMatch) {
      output += content.slice(exportIndex, exportIndex + 1);
      cursor = exportIndex + 1;
      continue;
    }
    const fnName = nameMatch[1];
    if (!HTTP_METHODS.has(fnName)) {
      output += content.slice(exportIndex, nameStart + fnName.length);
      cursor = nameStart + fnName.length;
      continue;
    }

    const paramsOpen = content.indexOf('(', nameStart + fnName.length);
    if (paramsOpen === -1) {
      output += content.slice(exportIndex, exportIndex + 1);
      cursor = exportIndex + 1;
      continue;
    }
    const paramsClose = findMatching(content, paramsOpen, '(', ')');
    if (paramsClose === -1) {
      output += content.slice(exportIndex, exportIndex + 1);
      cursor = exportIndex + 1;
      continue;
    }

    const bodyOpen = content.indexOf('{', paramsClose + 1);
    if (bodyOpen === -1) {
      output += content.slice(exportIndex, exportIndex + 1);
      cursor = exportIndex + 1;
      continue;
    }
    const bodyClose = findMatching(content, bodyOpen, '{', '}');
    if (bodyClose === -1) {
      output += content.slice(exportIndex, exportIndex + 1);
      cursor = exportIndex + 1;
      continue;
    }

    const paramsRaw = content.slice(paramsOpen + 1, paramsClose);
    const bodyRaw = content.slice(bodyOpen + 1, bodyClose);
    const parsed = parseTopLevelTryCatch(bodyRaw);

    if (!parsed) {
      output += content.slice(exportIndex, bodyClose + 1);
      cursor = bodyClose + 1;
      continue;
    }

    const replacement = `export const ${fnName} = withErrorHandler(async (${paramsRaw}) => {${parsed.tryBody}\n});`;
    output += replacement;
    cursor = bodyClose + 1;
    changed = true;
  }

  if (!changed) return { content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  return { content: ensureImport(output, eol), changed: true };
}

function main() {
  const files = listRouteFiles(API_DIR);
  const changed = [];

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const result = transform(original);
    if (!result.changed) continue;
    fs.writeFileSync(file, result.content, 'utf8');
    changed.push(path.relative(ROOT, file));
  }

  console.log(`Processed route files: ${files.length}`);
  console.log(`Updated files: ${changed.length}`);
  changed.forEach((file) => console.log(`- ${file}`));
}

main();
