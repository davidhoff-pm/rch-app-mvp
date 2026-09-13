/**
 * Garde-fou design system : aucune couleur hexadécimale en dur dans les
 * composants et écrans. Toutes les couleurs passent par les tokens de
 * src/theme/designSystem.js (cf. CLAUDE.md, section "Design system").
 *
 * Exceptions volontaires :
 * - designSystem.js : c'est la source des tokens.
 * - ExportScreen.js : gabarit HTML/CSS du PDF, hors runtime React Native.
 * - dataGenerator.js : outil de dev.
 * - le noir des ombres ('#000' / '#000000'), standard React Native.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..');
const EXCLUDED_FILES = new Set([
  path.join(SRC, 'theme', 'designSystem.js'),
  path.join(SRC, 'screens', 'ExportScreen.js'),
  path.join(SRC, 'utils', 'dataGenerator.js'),
]);
const ALLOWED_HEX = new Set(['#000', '#000000']);
const HEX_LITERAL = /(["'`])(#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?)\1/g;

function listJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') listJsFiles(p, acc);
    } else if (p.endsWith('.js')) {
      acc.push(p);
    }
  }
  return acc;
}

describe('design system', () => {
  it("n'a aucune couleur hexadécimale en dur hors designSystem.js", () => {
    const offenders = [];
    for (const file of listJsFiles(SRC)) {
      if (EXCLUDED_FILES.has(file)) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(\*|\/\/)/.test(line)) return; // commentaires
        for (const m of line.matchAll(HEX_LITERAL)) {
          if (!ALLOWED_HEX.has(m[2].toUpperCase()) && !ALLOWED_HEX.has(m[2])) {
            offenders.push(`${path.relative(SRC, file)}:${i + 1} ${m[2]}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
