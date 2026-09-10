import type {DesignCandidateData} from './DesignCandidateData.js'
import type {VisualStateData} from './VisualStateData.js'
export interface DesignRefinementRequest{readonly candidate:DesignCandidateData;readonly visualState:VisualStateData;readonly feedback:string}
