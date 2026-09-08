import {readFile} from 'node:fs/promises'
import path from 'node:path'
export class WebDesignMcpAppDocumentReader{public constructor(private readonly documentPath=path.resolve(import.meta.dirname,'../../mcp-app.html')){}public read():Promise<string>{return readFile(this.documentPath,'utf8')}}
