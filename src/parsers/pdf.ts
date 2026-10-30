import { sha256 } from '../domain/canonical'
import type { SourceDocument } from '../domain/types'
/** PDF.js can be injected by an app build; the core never executes embedded PDF content. */
export async function parsePdf(name: string, bytes: ArrayBuffer | Uint8Array, extract?: (bytes: ArrayBuffer | Uint8Array) => Promise<{ text: string; pages?: string[] }>): Promise<SourceDocument> {
  const fallback = () => { const binary = new TextDecoder('latin1').decode(bytes); const strings = [...binary.matchAll(/\(([^()]{1,500})\)/g)].map(m => m[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\(/g, '(').replace(/\\\)/g, ')')); return { text: strings.join(' ').replace(/\s+/g, ' ').trim(), pages: [] } }
  const result = extract ? await extract(bytes) : fallback(); const pages = result.pages ?? (result.text ? [result.text] : []); const blocks = pages.flatMap((text, i) => text.trim() ? [{ block_id: `P${String(i + 1).padStart(3, '0')}`, text: text.trim(), page: i + 1, kind: 'page' as const }] : []); const warnings = result.text ? [] : ['PDF 沒有可選取文字；疑似影像掃描，請改交可選字 PDF 或貼上轉寫內容。']; return { id: crypto.randomUUID(), file_name: name, file_type: 'pdf', text: result.text.trim(), source_sha256: await sha256(new TextDecoder('latin1').decode(bytes)), blocks, warnings, needs_review: !result.text.trim() }
}
