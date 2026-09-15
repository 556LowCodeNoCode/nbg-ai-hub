import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGlossaryLink from '../src/plugins/remark-glossary-link.ts';

const md = `# Title

Working with the cli and agents on a daily basis is core. Type your prompt, wait for the model to respond, then iterate. Check the README in the repo.`;

console.log('FACTORY-CALL: loading plugin...');
const plugin = remarkGlossaryLink({ glossaryDir: '../glossary', excludePaths: ['/news/published/'] });
console.log('FACTORY-RAN');

const file = await unified()
  .use(remarkParse)
  .use(plugin)
  .use(remarkStringify)
  .process({ value: md, path: '/Users/test/page.md' });

console.log('OUTPUT (length=' + String(file).length + '):');
console.log(String(file));
