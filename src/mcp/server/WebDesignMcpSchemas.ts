import {z} from 'zod'

import {WEB_DESIGN_AGENT_REQUEST_LIMITS} from '../../design/validation/WebDesignAgentRequestLimits.js'

const shortText = z.string().min(1).max(2_000)
const designLabel = z.string().min(1).max(200)

export const promptSchema = z
  .string()
  .min(1)
  .max(WEB_DESIGN_AGENT_REQUEST_LIMITS.promptCharacters)

export const feedbackSchema = z
  .string()
  .max(WEB_DESIGN_AGENT_REQUEST_LIMITS.feedbackCharacters)

export const publicUrlSchema = z
  .string()
  .min(1)
  .max(WEB_DESIGN_AGENT_REQUEST_LIMITS.urlCharacters)

export const pagePathSchema = z
  .string()
  .min(1)
  .max(WEB_DESIGN_AGENT_REQUEST_LIMITS.pagePathCharacters)
  .startsWith('/')

export const visualStateSchema = z.object({
  density: z.number().min(0).max(1),
  spacingScale: z.number().positive().max(4),
  radius: z.number().min(0).max(128),
  fontScale: z.number().positive().max(4),
  heroScale: z.number().positive().max(4),
  contrast: z.number().positive().max(4),
  depth: z.number().min(0).max(1),
  motion: z.number().min(0).max(1),
})

export const genomeSchema = z.object({
  composition: designLabel,
  navigation: designLabel,
  heroStrategy: designLabel,
  typography: designLabel,
  density: z.number().min(0).max(1),
  geometry: designLabel,
  surfaceModel: designLabel,
  depth: z.number().min(0).max(1),
  motion: designLabel,
  contentRhythm: designLabel,
  imageryStrategy: designLabel,
})

export const designSystemSchema = z.object({
  tokens: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        value: z.string().min(1).max(1_000),
      }),
    )
    .max(256),
  typography: z
    .array(
      z.object({
        role: designLabel,
        family: designLabel,
        weight: designLabel,
      }),
    )
    .max(64),
  components: z.array(designLabel).max(256),
  principles: z.array(shortText).max(64),
})

export const candidateSchema = z.object({
  id: z.enum(['A', 'B', 'C']),
  title: designLabel,
  thesis: shortText,
  genome: genomeSchema,
  designSystem: designSystemSchema,
  document: z.object({
    html: z.string().min(1).max(350_000),
    css: z.string().min(1).max(150_000),
    javascript: z.string().max(150_000),
  }),
  pages: z
    .array(
      z.object({
        path: pagePathSchema,
        title: designLabel,
        html: z.string().min(1).max(250_000),
        javascript: z.string().max(100_000),
      }),
    )
    .max(WEB_DESIGN_AGENT_REQUEST_LIMITS.pageCount),
  visualState: visualStateSchema,
  critique: z.array(shortText).max(128),
  browserEvidence: z.array(shortText).max(128),
})

export const conceptSchema = z.object({
  id: z.enum(['A', 'B', 'C']),
  title: designLabel,
  thesis: shortText,
  imageUrl: publicUrlSchema,
})

export const preferenceProfileSchema = z.object({
  version: z.literal(1),
  acceptedGenome: genomeSchema,
  rejectedGenomes: z.array(genomeSchema).max(12),
  visualState: visualStateSchema,
  notes: z.array(shortText).max(100),
})
