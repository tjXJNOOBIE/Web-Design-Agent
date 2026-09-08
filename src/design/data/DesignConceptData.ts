export interface DesignConceptData{readonly id:'A'|'B'|'C';readonly title:string;readonly thesis:string;readonly imageUrl:string}
export interface DesignConceptSetData{readonly prompt:string;readonly concepts:readonly DesignConceptData[]}
