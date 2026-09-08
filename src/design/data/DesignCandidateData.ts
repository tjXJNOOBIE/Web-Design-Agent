import type {DesignGenomeData} from './DesignGenomeData.js'
import type {DesignSystemData} from './DesignSystemData.js'
import type {VisualStateData} from './VisualStateData.js'
export type DesignCandidateId='A'|'B'|'C'
export interface DesignDocumentData{readonly html:string;readonly css:string;readonly javascript:string}
export interface DesignPageData{readonly path:string;readonly title:string;readonly html:string;readonly javascript:string}
export interface DesignCandidateData{readonly id:DesignCandidateId;readonly title:string;readonly thesis:string;readonly genome:DesignGenomeData;readonly designSystem:DesignSystemData;readonly document:DesignDocumentData;readonly pages:readonly DesignPageData[];readonly visualState:VisualStateData;readonly critique:readonly string[];readonly browserEvidence:readonly string[]}
