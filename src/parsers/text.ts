import { sha256 } from '../domain/canonical'
import type { SourceBlock, SourceDocument } from '../domain/types'

export const SUPPORTED_EXTENSIONS = ['pdf', 'txt', 'md', 'markdown', 'py', 'ipynb', 'js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'r', 'R', 'sql', 'sh', 'html', 'css', 'json', 'xml', 'yaml', 'yml']
export function extensionOf(name: string) { return name.split('.').pop()?.toLowerCase() ?? '' }
export function guessStudentId(fileName: string) { const stem = fileName.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? ''; return (stem.match(/^([^_\-\s]+)/)?.[1] ?? '').trim() }
export function normalizeText(text: string) { return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/[\t ]+$/gm, '').trim() }
export function makeBlocks(text: string, ext: string): SourceBlock[] {
  const lines = text.split('\n'); const blocks: SourceBlock[] = []; let start = 1; let buffer: string[] = []
  const flush = (end: number) => { const value = buffer.join('\n').trim(); if (value) blocks.push({ block_id: `B${String(blocks.length + 1).padStart(3, '0')}`, text: value, line_start: start, line_end: end, kind: ['py','js','jsx','ts','tsx','java','c','cc','cpp','h','hpp','cs','go','rs','rb','php','swift','kt','r','sql','sh'].includes(ext) ? 'code' : 'paragraph' }); buffer = []; start = end + 1 }
  lines.forEach((line, i) => { if (!line.trim() && buffer.length) flush(i); else if (line.trim()) buffer.push(line) }); if (buffer.length) flush(lines.length)
  return blocks
}
export async function parseText(name: string, bytes: ArrayBuffer | Uint8Array): Promise<SourceDocument> {
  const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes); const ext = extensionOf(name); let text = raw; const warnings: string[] = []
  if (raw.includes('\uFFFD')) warnings.push('文字可能不是 UTF-8，請確認編碼後重新匯入。')
  if (ext === 'ipynb') { try { const notebook = JSON.parse(raw); text = (notebook.cells ?? []).filter((c: any) => c.cell_type === 'code' || c.cell_type === 'markdown').map((c: any) => Array.isArray(c.source) ? c.source.join('') : String(c.source ?? '')).join('\n\n') } catch { warnings.push('Notebook JSON 無法解析。') } }
  text = normalizeText(text); const blocks = makeBlocks(text, ext); const source_sha256 = await sha256(raw); if (!text) warnings.push('檔案沒有可擷取文字。')
  return { id: crypto.randomUUID(), file_name: name, file_type: ext, text, source_sha256, blocks, warnings, needs_review: !text || blocks.length === 0 || warnings.some(w => w.includes('無法')) }
}
export async function parseFile(file: File): Promise<SourceDocument> {
  if (extensionOf(file.name) === 'pdf') {
    const { parsePdf } = await import('./pdf')
    return parsePdf(file.name, await file.arrayBuffer())
  }
  return parseText(file.name, await file.arrayBuffer())
}
