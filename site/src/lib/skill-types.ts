// site/src/lib/skill-types.ts
//
// Shared type aliases for the skills-catalog submission flow. Mirrors the
// 17-key frontmatter contract the CI validator enforces against PRs landing
// in `skills/*.md`. The `SkillForm` type extends frontmatter with a `body`
// field so a single form payload travels end-to-end (editor -> serializer
// -> URL builder -> validator -> clipboard fallback).
//
// IMPORTANT: this file is the canonical type source for the submission
// helper. The runtime validator in `submission.ts` mirrors these constraints
// without short-circuiting — each rule emits a discrete `ValidationIssue` so
// the UI can surface every problem at once.

export type SkillOrigin = 'internal' | 'community' | 'external';
export type SkillCategory =
  | 'workflow'
  | 'code'
  | 'docs'
  | 'integration'
  | 'productivity'
  | 'testing'
  | 'other';
export type SkillStatus = 'active' | 'experimental' | 'deprecated';
export type Audience = 'beginner' | 'advanced' | 'both';

export interface SkillFrontmatter {
  type: 'skill';
  title: string;
  audience: Audience;
  topics: string[];
  internal: boolean;
  authored: string; // YYYY-MM-DD
  last_reviewed: string; // YYYY-MM-DD
  external_link: string | null;
  deeper_link: string | null;
  ai_summary: string;
  install_command: string;
  skill_id: string;
  origin: SkillOrigin;
  category: SkillCategory;
  status: SkillStatus;
  maintainer: string;
  requires?: string[];
}

export interface SkillForm extends SkillFrontmatter {
  body: string;
}

export interface ValidationIssue {
  field: keyof SkillForm | 'body' | 'frontmatter';
  rule: string;
  message: string;
}
