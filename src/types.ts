import { User } from "firebase/auth";

export type Step = "input" | "outline" | "generating" | "result" | "image-studio" | "history" | "calendar";

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  structure: string;
}

export interface ArticleOutline {
  title: string;
  sections: {
    heading: string;
    description: string;
  }[];
}

export interface FullArticle {
  title: string;
  content: {
    heading: string;
    text: string;
    imagePrompt?: string;
    imageUrl?: string;
  }[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    tags: string[];
    slug: string;
    keywordDensity: { [keyword: string]: number };
    readabilityScore: number; // 0-100
    sentiment: "positive" | "neutral" | "informative";
    gapAnalysis: string;
    alternativeTitles: string[];
    fleschKincaidLevel: string;
    vocabularyGaps: string[];
    competitorVocabulary: string[];
  };
  videoScript?: {
    scene: string;
    narrative: string;
    visual: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  cta: {
    text: string;
    buttonText: string;
    type: "sales" | "subscription" | "lead-magnet";
    personalizedHint: string;
  };
  social: {
    platform: string;
    post: string;
  }[];
}

export interface ArticleSnapshot {
  timestamp: number;
  content: { heading: string, text: string }[];
  title: string;
}

export interface SavedArticle {
  id: string;
  userId?: string;
  topic: string;
  timestamp: number;
  article: FullArticle;
  heroImages: string[];
  scheduledDate?: string;
  isPublished?: boolean;
  snapshots?: ArticleSnapshot[];
}

export interface UserProfile {
  name: string;
  defaultTone: string;
  defaultLanguage: string;
  defaultAudience: string;
  defaultFormat: string;
  defaultLength: string;
  defaultStyle: string;
  role: string;
  seoDensity: number;
  credits?: number;
  bio: string;
}
