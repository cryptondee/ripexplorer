export interface ProfileData {
  id?: string;
  name: string;
  bio?: string;
  website?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  wallet?: string;
  email?: string;
  location?: string;
  avatar?: string;
}

export interface ExtractedData {
  [key: string]: any;
}

export interface ComparisonResult {
  missing: Record<string, any>;
  different: Record<string, { profile: any; extracted: any }>;
  matched: Record<string, any>;
}

export interface SvelteKitFetchedData {
  url: string;
  method: string;
  response: {
    status: number;
    data: any;
  };
}