/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ['app', 'lib', 'features', 'components', 'hooks'];
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_FILES = new Set([path.normalize('lib/logger.ts')]);
const METHOD_MAP = {
  log: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};
const CONSOLE_REGEX = /\bconsole\.(log|warn|error|debug)\s*\(/g;
const LOGGER_IMPORT = "import { productionLogger } from '@/lib/productionLogger';";
const dryRun = process.argv.includes('--dry-run');

function walk(dirPath, fileList = []) {
  if (!fs.existsSync(dirPath)) {
    return fileList;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileList);
      continue;
    }

    const ext = path.extname(entry.name);
    if (TARGET_EXTENSIONS.has(ext) && !entry.name.endsWith('.d.ts')) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function hasUseClientDirective(content) {
  const trimmed = content.trimStart();
  return trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
}

function hasLoggerImport(content) {
  return content.includes("from '@/lib/productionLogger'") || content.includes('from "./productionLogger"');
}

function addLoggerImport(content, eol) {
  if (hasLoggerImport(content)) {
    return content;
  }

  const lines = content.split(/\r?\n/);
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*import\s.+from\s+['"].+['"];?\s*$/.test(lines[i]) || /^\s*import\s+['"].+['"];?\s*$/.test(lines[i])) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT);
    return lines.join(eol);
  }

  let insertAt = 0;
  while (insertAt < lines.length) {
    if (/^\s*$/.test(lines[insertAt])) {
      insertAt += 1;
      continue;
    }

    if (/^\s*['"]use (client|server)['"];?\s*$/.test(lines[insertAt])) {
      insertAt += 1;
      continue;
    }

    break;
  }

  lines.splice(insertAt, 0, LOGGER_IMPORT);
  return lines.join(eol);
}

function transformFile(filePath) {
  const relativePath = path.normalize(path.relative(ROOT_DIR, filePath));
  if (EXCLUDED_FILES.has(relativePath)) {
    return { changed: false, skippedClient: false };
  }

  const originalContent = fs.readFileSync(filePath, 'utf8');

  if (!CONSOLE_REGEX.test(originalContent)) {
    return { changed: false, skippedClient: false };
  }

  CONSOLE_REGEX.lastIndex = 0;

  if (hasUseClientDirective(originalContent)) {
    return { changed: false, skippedClient: true };
  }

  const eol = originalContent.includes('\r\n') ? '\r\n' : '\n';
  let content = originalContent.replace(CONSOLE_REGEX, (_, method) => {
    const mapped = METHOD_MAP[method] || 'info';
    return `productionLogger.${mapped}(`;
  });

  content = addLoggerImport(content, eol);

  if (content === originalContent) {
    return { changed: false, skippedClient: false };
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return { changed: true, skippedClient: false };
}

function main() {
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT_DIR, dir)));

  const changedFiles = [];
  const skippedClientFiles = [];

  for (const filePath of files) {
    const result = transformFile(filePath);
    if (result.changed) {
      changedFiles.push(path.relative(ROOT_DIR, filePath));
    }
    if (result.skippedClient) {
      skippedClientFiles.push(path.relative(ROOT_DIR, filePath));
    }
  }

  console.log(`Scanned files: ${files.length}`);
  console.log(`${dryRun ? 'Would update' : 'Updated'} files: ${changedFiles.length}`);
  console.log(`Skipped client files: ${skippedClientFiles.length}`);

  if (changedFiles.length > 0) {
    console.log('Changed files:');
    changedFiles.forEach((file) => console.log(`- ${file}`));
  }

  if (skippedClientFiles.length > 0) {
    console.log('Skipped "use client" files:');
    skippedClientFiles.forEach((file) => console.log(`- ${file}`));
  }
}

main();
