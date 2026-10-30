import JSZip from 'jszip'
import { parseText, SUPPORTED_EXTENSIONS } from './text'
import { parsePdf } from './pdf'
import type { SourceDocument } from '../domain/types'

export async function parseArchive(file: File): Promise<SourceDocument[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const output: SourceDocument[] = []
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || path.startsWith('/') || path.split('/').some(part => part === '..') || path.split('/').some(part => part.startsWith('.'))) continue
    const name = path.split('/').pop() ?? path; const ext = name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_EXTENSIONS.map(x => x.toLowerCase()).includes(ext)) continue
    const bytes = await entry.async('uint8array')
    output.push(ext === 'pdf' ? await parsePdf(name, bytes) : await parseText(name, bytes))
  }
  return output
}
