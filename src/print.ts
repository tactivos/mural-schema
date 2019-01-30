import {
  ArrayAst,
  Ast,
  FunctionAst,
  LiteralAst,
  ObjectAst,
  ObjectPropertyAst,
  RegExpAst,
  UnionAst,
  ValueAst,
} from './ast';

import { PrintOptions } from './types';

const padd = (s: string) => s.replace(/\n/g, '\n  ');

const printArray = (ast: ArrayAst, options: PrintOptions): string =>
  ast.item.type === 'union'
    ? `[${ast.item.items.map(i => printAny(i, options))}]`
    : `[${printAny(ast.item, options)}]`;

const printFunction = (ast: FunctionAst, options: PrintOptions): string =>
  ast.key.join('.') === 'ref'
    ? options.quote
      ? `'${ast.name}'`
      : `${ast.name}`
    : `'${ast.name}'`;

const printLiteral = (ast: LiteralAst): string =>
  typeof ast.value === 'string'
    ? `'"${ast.value}"'`
    : `${ast.value}`;

const isUndefined = (ast: Ast): boolean =>
  ast.type === 'value' && ast.value === undefined;

const printObjectProperty = (
  { ast, key }: ObjectPropertyAst,
  options: PrintOptions,
) => {
  if (
    ast.type === 'union'
    && ast.items.length === 2
    && ast.items.some(isUndefined)
  ) {
    const other = ast.items.find(i => !isUndefined(i));
    if (other) {
      return `'${key}?': ${padd(printAny(other, options))}`;
    }
  }

  return `${key}: ${padd(printAny(ast, options))}`;
};

const printObject = (ast: ObjectAst, options: PrintOptions): string =>
  `{${!ast.strict ? '\n  $strict: false,' : ''
    }${
    ast.extendsFrom
      .map(e => `\n  ...${e},`)
      .join('')
    }${
    ast.properties
      .map(p => `\n  ${printObjectProperty(p, options)},`)
    . join('')
    }\n}`;

const printRegExp = (ast: RegExpAst): string => ast.value.toString();

const printUnion = (ast: UnionAst, options: PrintOptions): string => {
  const useString = ast.items.every(i =>
    i.type === 'function' && (options.quote || i.key.join('.') !== 'ref')
    || i.type === 'value'
    || i.type === 'literal',
  );

  const allowUndefined = ast.items.find(isUndefined);

  if (useString && ast.items.length === 2 && allowUndefined) {
    const item = ast.items.find(i => i !== allowUndefined);
    if (item) {
      return `'${printAny(item, options).replace(/'/g, '')}?'`;
    }
  }

  const items = ast.items.map(i => printAny(i, options));

  return useString
    ? `'${items.join('|').replace(/'/g, '')}'`
    : `[[${items.join(',')}]]`;
};

const printValue = <T>(ast: ValueAst<T>): string =>
  typeof ast.value === 'string'
    ? `'${ast.value}'`
    : `${ast.value}`;

const printAny = (ast: Ast, options: PrintOptions): string => {
  switch (ast.type) {
    case 'array': return printArray(ast, options);
    case 'function': return printFunction(ast, options);
    case 'literal': return printLiteral(ast);
    case 'object': return printObject(ast, options);
    case 'regexp': return printRegExp(ast);
    case 'union': return printUnion(ast, options);
    case 'value': return printValue(ast);
    default: return '';
  }
};

export const print = (items: Ast[], options: PrintOptions) => `${
  items.map(i => `${
    options.useExport ? 'export ' : ''
  }const ${i.key} = ${printAny(i, options)};\n\n`).join('')
  }${
    options.useExport
     ? ''
     : `module.exports = {${
        items.map(i => i.key).sort().map(n => `\n  ${n},`).join('')
        }\n};\n`
  }`;
