import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import type {WebDesignMcpServerBuilder} from '../server/WebDesignMcpServerBuilder.js'
export class WebDesignMcpStdioServer{public constructor(private readonly builder:WebDesignMcpServerBuilder){}public async start():Promise<void>{await this.builder.build().connect(new StdioServerTransport())}}
