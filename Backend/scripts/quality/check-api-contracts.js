'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const backendSource = path.join(projectRoot, 'Backend', 'src');
const clientRoots = [
  path.join(projectRoot, 'Frontend', 'mobile-app', 'src', 'api'),
  path.join(projectRoot, 'Frontend', 'mobile-app', 'src', 'services'),
  path.join(projectRoot, 'Frontend', 'web', 'src', 'admin', 'lib'),
  path.join(projectRoot, 'Frontend', 'web', 'src', 'lender', 'lib'),
];

function collectFiles(root, predicate) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory()
      ? collectFiles(target, predicate)
      : predicate(target)
        ? [target]
        : [];
  });
}

function cleanRoute(route) {
  const withoutOrigin = route.replace(/^https?:\/\/[^/]+/, '');
  const withoutApi = withoutOrigin.replace(/^\/api(?=\/|$)/, '');
  const withoutQuery = withoutApi.split('?')[0];
  const normalizedParams = withoutQuery
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/:[A-Za-z0-9_]+/g, ':param');
  return (
    `/${normalizedParams}`
      .replace(/:param$/, '')
      .replace(/^\/:param(?=\/)/, '')
      .replace(/\/{2,}/g, '/')
      .replace(/\/$/, '') || '/'
  );
}

function joinRoute(base, method) {
  return cleanRoute(`/${base || ''}/${method || ''}`);
}

const controllerFiles = collectFiles(
  backendSource,
  (file) => file.endsWith('.controller.ts'),
);
const serverRoutes = [];

for (const file of controllerFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const controller = source.match(
    /@Controller\(\s*['"`]([^'"`]*)['"`]\s*\)/,
  );
  if (!controller) continue;

  const methodPattern = /@(Get|Post|Put|Patch|Delete|Sse)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  for (const match of source.matchAll(methodPattern)) {
    serverRoutes.push({
      method: match[1] === 'Sse' ? 'GET' : match[1].toUpperCase(),
      route: joinRoute(controller[1], match[2]),
      file: path.relative(projectRoot, file),
    });
  }
}

function templateText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return (
      node.head.text +
      node.templateSpans.map((span) => `:param${span.literal.text}`).join('')
    );
  }
  return null;
}

const clientFiles = clientRoots.flatMap((root) =>
  collectFiles(root, (file) => /\.(ts|tsx|js|jsx)$/.test(file)),
);
const clientRoutes = new Map();

for (const file of clientFiles) {
  const sourceText = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    const value = templateText(node);
    if (value?.startsWith('/') && !value.startsWith('//')) {
      const route = cleanRoute(value);
      if (!clientRoutes.has(route)) clientRoutes.set(route, new Set());
      clientRoutes.get(route).add(path.relative(projectRoot, file));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function routeMatches(clientRoute, serverRoute) {
  const clientParts = clientRoute.split('/');
  const serverParts = serverRoute.split('/');
  return (
    clientParts.length === serverParts.length &&
    clientParts.every(
      (part, index) =>
        part === serverParts[index] || serverParts[index] === ':param',
    )
  );
}

const ignoredClientRoutes = new Set([
  '/',
  '/:param',
  '/ai-assistant',
  '/socket.io',
]);
const requiredClientContracts = [
  '/auth/login',
  '/auth/register',
  '/auth/session',
  '/kyc/submit',
  '/kyc/my-submission',
  '/kyc/resubmit',
  '/ai-assistant/conversations',
  '/ai-assistant/conversations/:param/messages',
  '/borrower/applications/:param/submit',
  '/borrower/payments/generate-qr',
  '/admin/kyc/pending',
  '/admin/disputes/:param/resolve-canonical',
];
const unmatched = [...clientRoutes.entries()].filter(
  ([clientRoute]) =>
    !ignoredClientRoutes.has(clientRoute) &&
    !serverRoutes.some((server) => routeMatches(clientRoute, server.route)),
);
const missingRequired = requiredClientContracts.filter(
  (required) =>
    !serverRoutes.some((server) => routeMatches(required, server.route)),
);

if (unmatched.length || missingRequired.length) {
  console.error('API contract validation found client routes with no controller:\n');
  for (const [route, files] of unmatched) {
    console.error(`- ${route}`);
    for (const file of files) console.error(`  ${file}`);
  }
  for (const route of missingRequired) {
    console.error(`- required contract ${route}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `API contract validation passed (${serverRoutes.length} controller routes, ${clientRoutes.size} client route patterns).`,
  );
}
