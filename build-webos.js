const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = __dirname;
const jsDir = path.join(root, 'js');

async function transformFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const result = await esbuild.transform(source, {
    loader: 'js',
    target: 'es2015',
    minifySyntax: false,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    sourcemap: false,
  });
  fs.writeFileSync(filePath, result.code, 'utf8');
}

async function main() {
  const files = fs.readdirSync(jsDir)
    .filter(name => name.endsWith('.js'))
    .map(name => path.join(jsDir, name));

  for (const file of files) {
    await transformFile(file);
  }

  console.log(`Transpiled ${files.length} JS files for webOS packaging.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
