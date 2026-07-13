'use strict';

const fs = require('fs');
const path = require('path');

const lenderRoot = path.resolve(__dirname, '..', 'src', 'modules', 'lender');
const maxServiceLines = 650;
const allowedCrossFeatureServices = new Set([
  '../lender-notifications/lender-notification-writer.service',
]);

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  });
}

const violations = [];
const serviceFiles = collectFiles(lenderRoot).filter((file) =>
  file.endsWith('.service.ts'),
);

serviceFiles.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(lenderRoot, file);
  const lineCount = source.split(/\r?\n/).length;

  if (lineCount > maxServiceLines) {
    violations.push(
      `${relativeFile} has ${lineCount} lines; the limit is ${maxServiceLines}.`,
    );
  }

  const feature = relativeFile.split(path.sep)[0];
  const importPattern = /from\s+['"]([^'"]+\.service)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const importPath = match[1];
    if (!importPath.startsWith('../')) continue;

    const importedFeature = importPath.split('/')[1];
    if (importedFeature === '..') continue;
    if (
      importedFeature &&
      importedFeature !== feature &&
      !allowedCrossFeatureServices.has(importPath)
    ) {
      violations.push(
        `${relativeFile} imports the cross-feature service ${importPath}. Depend on a narrow writer/port instead.`,
      );
    }
  }
});

if (violations.length > 0) {
  console.error('Lender architecture check failed:\n');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(
    `Lender architecture check passed (${serviceFiles.length} services, max ${maxServiceLines} lines).`,
  );
}
