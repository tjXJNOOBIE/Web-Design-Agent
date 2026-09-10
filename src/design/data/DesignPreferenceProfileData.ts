import type {DesignGenomeData} from './DesignGenomeData.js'
import type {VisualStateData} from './VisualStateData.js'
export interface DesignPreferenceProfileData{readonly version:1;readonly acceptedGenome:DesignGenomeData;readonly rejectedGenomes:readonly DesignGenomeData[];readonly visualState:VisualStateData;readonly notes:readonly string[]}
