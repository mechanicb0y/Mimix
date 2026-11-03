export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; id: string; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }

export interface BlogPost {
  slug: string
  category: 'guides' | 'product' | 'safety'
  title: string
  description: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  author: string
  imageAlt: string
  body: BlogBlock[]
}

export interface LegalSection {
  id: string
  heading: string
  paragraphs: string[]
  list?: string[]
}

export interface LegalDoc {
  title: string
  seo: { title: string; description: string }
  updated: string
  intro: string
  sections: LegalSection[]
}
