import type {DesignCandidateData} from './DesignCandidateData.js'
import type {DesignIntentData} from './DesignIntentData.js'
export interface DesignValidationData{readonly designDistancePassed:boolean;readonly browserValidated:boolean;readonly notes:readonly string[]}
export interface DesignGenerationResult{readonly version:1;readonly prompt:string;readonly intent:DesignIntentData;readonly candidates:readonly DesignCandidateData[];readonly validation:DesignValidationData}
