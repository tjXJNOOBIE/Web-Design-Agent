import type {DesignCandidateData,DesignPageData} from '../design/data/DesignCandidateData.js'
import type {VisualStateData} from '../design/data/VisualStateData.js'
import {DesignExportBuilder} from '../design/export/DesignExportBuilder.js'
export class PreviewDocumentBuilder{public build(candidate:DesignCandidateData,visualState:VisualStateData,page?:DesignPageData):string{const exported=new DesignExportBuilder().build(candidate,visualState);if(page===undefined)return exported.standaloneHtml;return exported.pages.find(item=>item.path===page.path)?.standaloneHtml??exported.standaloneHtml}}
