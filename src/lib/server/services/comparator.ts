import type { ProfileData, ExtractedData, ComparisonResult } from '../types.js';

export function compareProfileWithExtracted(profile: ProfileData, extracted: ExtractedData): ComparisonResult {
  const result: ComparisonResult = {
    missing: {},
    different: {},
    matched: {}
  };
  
  const profileFields = {
    name: profile.name,
    bio: profile.bio,
    website: profile.website,
    twitter: profile.twitter,
    github: profile.github,
    linkedin: profile.linkedin,
    wallet: profile.wallet,
    email: profile.email,
    location: profile.location,
    avatar: profile.avatar
  };
  
  const mappings = createFieldMappings(extracted);
  
  for (const [profileKey, profileValue] of Object.entries(profileFields)) {
    if (!profileValue) continue;
    
    const matchedKeys = mappings[profileKey] || [];
    const extractedValue = findBestMatch(profileValue, matchedKeys, extracted);
    
    if (extractedValue === null) {
      result.missing[profileKey] = profileValue;
    } else if (normalizeForComparison(profileValue) === normalizeForComparison(extractedValue)) {
      result.matched[profileKey] = profileValue;
    } else {
      result.different[profileKey] = {
        profile: profileValue,
        extracted: extractedValue
      };
    }
  }
  
  return result;
}

function createFieldMappings(extracted: ExtractedData): Record<string, string[]> {
  const mappings: Record<string, string[]> = {
    name: [],
    bio: [],
    website: [],
    twitter: [],
    github: [],
    linkedin: [],
    wallet: [],
    email: [],
    location: [],
    avatar: []
  };
  
  const keys = Object.keys(extracted);
  
  keys.forEach(key => {
    const lowerKey = key.toLowerCase();
    
    // rip.fun specific mappings
    if (key === 'username' || lowerKey.includes('name') || lowerKey.includes('title') || lowerKey.includes('displayname')) {
      mappings.name.push(key);
    }
    
    if (lowerKey.includes('bio') || lowerKey.includes('description') || lowerKey.includes('about') || lowerKey.includes('summary')) {
      mappings.bio.push(key);
    }
    
    if (lowerKey.includes('website') || lowerKey.includes('url') || lowerKey.includes('homepage') || lowerKey.includes('site')) {
      mappings.website.push(key);
    }
    
    if (lowerKey.includes('twitter') || lowerKey.includes('x.com')) {
      mappings.twitter.push(key);
    }
    
    if (lowerKey.includes('github')) {
      mappings.github.push(key);
    }
    
    if (lowerKey.includes('linkedin')) {
      mappings.linkedin.push(key);
    }
    
    // rip.fun wallet mappings - both smart wallet and owner wallet
    if (lowerKey.includes('wallet') || lowerKey.includes('address') || lowerKey.includes('eth') || lowerKey.includes('crypto') || 
        key === 'smart_wallet_address' || key === 'owner_wallet_address') {
      mappings.wallet.push(key);
    }
    
    if (lowerKey.includes('email') || lowerKey.includes('mail')) {
      mappings.email.push(key);
    }
    
    if (lowerKey.includes('location') || lowerKey.includes('city') || lowerKey.includes('country') || lowerKey.includes('region')) {
      mappings.location.push(key);
    }
    
    if (lowerKey.includes('avatar') || lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('picture') || key === 'avatar') {
      mappings.avatar.push(key);
    }
  });
  
  return mappings;
}

function findBestMatch(profileValue: string, candidateKeys: string[], extracted: ExtractedData): string | null {
  for (const key of candidateKeys) {
    const extractedValue = extracted[key];
    if (extractedValue !== null && extractedValue !== undefined) {
      const valueStr = String(extractedValue);
      
      if (isCloseMatch(profileValue, valueStr)) {
        return valueStr;
      }
    }
  }
  
  return null;
}

function isCloseMatch(profileValue: string, extractedValue: string): boolean {
  const profileNorm = normalizeForComparison(profileValue);
  const extractedNorm = normalizeForComparison(extractedValue);
  
  if (profileNorm === extractedNorm) return true;
  
  if (profileValue.includes('@') && extractedValue.includes('@')) {
    return profileNorm === extractedNorm;
  }
  
  if (profileValue.startsWith('http') && extractedValue.startsWith('http')) {
    return profileNorm === extractedNorm;
  }
  
  const similarity = calculateSimilarity(profileNorm, extractedNorm);
  return similarity > 0.8;
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  return 1 - distance / Math.max(len1, len2);
}