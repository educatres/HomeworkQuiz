import { parseText } from './text'
export const CODE_EXTENSIONS = ['py','js','jsx','ts','tsx','java','c','cc','cpp','h','hpp','cs','go','rs','rb','php','swift','kt','r','sql','sh']
export function isCodeFile(name: string) { return CODE_EXTENSIONS.includes(name.split('.').pop()?.toLowerCase() ?? '') }
export { parseText }
