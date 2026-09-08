export interface DesignTokenData{readonly name:string;readonly value:string}
export interface DesignTypographyData{readonly role:string;readonly family:string;readonly weight:string}
export interface DesignSystemData{readonly tokens:readonly DesignTokenData[];readonly typography:readonly DesignTypographyData[];readonly components:readonly string[];readonly principles:readonly string[]}
