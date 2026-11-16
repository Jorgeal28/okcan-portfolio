// Genera projects.json a partir de las carpetas dentro de /projects
// Uso: node scripts/build-manifest.mjs <carpeta-del-sitio>
//
// Estructura esperada:
//   projects/01-carbon-motives/01-foto.jpg, 02-foto.jpg, ...
//   projects/04-hyundai/01-portada.png, 51-exterior/01-foto.png, ...
// - El orden de proyectos = orden alfabético de las carpetas (por eso el prefijo 01-, 02-...)
// - Dentro de un proyecto: primero las imágenes de la carpeta y luego las de cada subcarpeta
//   (orden alfabético "natural": 2 antes que 10)
// - La primera imagen es la portada del portfolio
// - El título sale del nombre de la carpeta: "01-carbon-motives" -> "Carbon Motives"
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const projectsDir = join(root, 'projects');
const IMG = /\.(jpe?g|png|webp|avif|gif)$/i;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

if (!existsSync(projectsDir)) {
  console.error(`No existe ${projectsDir}`);
  process.exit(1);
}

function collect(dir, rel) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => collator.compare(a.name, b.name));
  const out = entries.filter(e => e.isFile() && IMG.test(e.name)).map(e => `${rel}/${encodeURIComponent(e.name)}`);
  for (const d of entries.filter(e => e.isDirectory())) {
    out.push(...collect(join(dir, d.name), `${rel}/${encodeURIComponent(d.name)}`));
  }
  return out;
}

const projects = readdirSync(projectsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort(collator.compare)
  .map(folder => {
    const images = collect(join(projectsDir, folder), `projects/${encodeURIComponent(folder)}`);
    const clean = folder.replace(/^\d+[-_ ]*/, '');
    const title = clean.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || folder;
    const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || folder;
    return { slug, title, images };
  })
  .filter(p => p.images.length > 0);

writeFileSync(join(root, 'projects.json'), JSON.stringify({ projects }, null, 2));
console.log(`projects.json: ${projects.length} proyectos, ${projects.reduce((n, p) => n + p.images.length, 0)} imágenes`);
