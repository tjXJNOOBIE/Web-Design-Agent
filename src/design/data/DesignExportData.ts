export interface DesignPageExportData{readonly path:string;readonly title:string;readonly html:string;readonly javascript:string;readonly standaloneHtml:string}
export interface DesignExportData{readonly html:string;readonly css:string;readonly javascript:string;readonly standaloneHtml:string;readonly pages:readonly DesignPageExportData[]}
