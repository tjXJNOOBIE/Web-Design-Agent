import type {DesignConceptData} from './DesignConceptData.js'
import type {DesignPreferenceProfileData} from './DesignPreferenceProfileData.js'
import type {DesignSourceMode} from './DesignIntentData.js'
export interface DesignGenerationRequest{readonly prompt:string;readonly sourceMode?:DesignSourceMode;readonly referenceImageUrl?:string;readonly targetUrl?:string;readonly selectedConcept?:DesignConceptData;readonly pages?:readonly string[];readonly preferenceProfile?:DesignPreferenceProfileData}
