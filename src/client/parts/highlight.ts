/**
 * Tiny dependency-free syntax highlighter.
 *
 * Enough to make code readable in the file preview: comments, strings,
 * numbers, keywords and punctuation get distinct token classes. It is a
 * regex lexer, not a full parser — deliberately small and safe on arbitrary
 * text (no dangerouslySetInnerHTML; callers render tokens as React nodes).
 */
export type TokenKind = 'plain' | 'comment' | 'string' | 'number' | 'keyword' | 'type' | 'func'

export interface Token {
  text: string
  kind: TokenKind
}

const KEYWORDS = new Set([
  // JS/TS
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'new', 'delete', 'typeof', 'instanceof',
  'class', 'extends', 'super', 'this', 'import', 'export', 'from', 'as', 'default',
  'async', 'await', 'try', 'catch', 'finally', 'throw', 'yield', 'in', 'of',
  'interface', 'type', 'enum', 'implements', 'public', 'private', 'protected',
  'readonly', 'static', 'abstract', 'get', 'set', 'declare', 'namespace', 'void',
  'null', 'undefined', 'true', 'false',
  // Python
  'def', 'lambda', 'pass', 'with', 'elif', 'not', 'and', 'or', 'is', 'None',
  'True', 'False', 'self', 'raise', 'global', 'nonlocal',
  // Go / Rust / general
  'func', 'package', 'struct', 'map', 'chan', 'go', 'defer', 'var', 'fn', 'mut',
  'impl', 'trait', 'pub', 'use', 'mod', 'match', 'loop',
  // SQL / shell-ish
  'select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'table',
])

const TYPES = new Set([
  'string', 'number', 'boolean', 'any', 'unknown', 'never', 'object', 'symbol',
  'int', 'float', 'str', 'bool', 'byte', 'rune', 'error', 'Promise', 'Array',
  'Record', 'Map', 'Set',
])

// Longest-first so `//` wins over `/`, `"""` over `"`.
const TOKEN_RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|\"(?:\\.|[^\"\\])*\"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g

/** Tokenize one line. Multi-line block comments are approximated per line. */
export function highlight(line: string): Token[] {
  const out: Token[] = []
  let last = 0
  TOKEN_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > last) out.push({ text: line.slice(last, match.index), kind: 'plain' })
    const raw = match[0]
    if (match[1] !== undefined) {
      out.push({ text: raw, kind: raw.startsWith('//') || raw.startsWith('#') || raw.startsWith('/*') ? 'comment' : 'string' })
    } else if (match[2] !== undefined) {
      out.push({ text: raw, kind: 'number' })
    } else {
      const kind: TokenKind = KEYWORDS.has(raw)
        ? 'keyword'
        : TYPES.has(raw)
          ? 'type'
          : lookAheadIsCall(line, match.index + raw.length)
            ? 'func'
            : 'plain'
      out.push({ text: raw, kind })
    }
    last = match.index + raw.length
  }
  if (last < line.length) out.push({ text: line.slice(last), kind: 'plain' })
  return out
}

function lookAheadIsCall(line: string, index: number): boolean {
  let i = index
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i += 1
  return line[i] === '('
}

export function languageOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'javascript'
  if (['py', 'pyw'].includes(ext)) return 'python'
  if (['go'].includes(ext)) return 'go'
  if (['rs'].includes(ext)) return 'rust'
  if (['json'].includes(ext)) return 'json'
  if (['css', 'scss', 'less'].includes(ext)) return 'css'
  if (['html', 'htm', 'xml', 'svg'].includes(ext)) return 'markup'
  if (['md', 'markdown'].includes(ext)) return 'markdown'
  if (['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'].includes(ext)) return 'shell'
  if (['yml', 'yaml'].includes(ext)) return 'yaml'
  if (['sql'].includes(ext)) return 'sql'
  return 'text'
}
