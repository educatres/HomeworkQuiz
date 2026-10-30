import { parseText } from './text'
export async function parseNotebook(name: string, data: ArrayBuffer | Uint8Array) { return parseText(name, data) }
