import { json } from '@sveltejs/kit';
import { getProfile } from '$lib/server/db/profiles.js';
import { fetchHTML } from '$lib/server/services/fetcher.js';
import { extractSvelteKitData, sanitizeExtractedData } from '$lib/server/services/parser.js';
import { normalizeData } from '$lib/server/services/normalizer.js';
import { compareProfileWithExtracted } from '$lib/server/services/comparator.js';
import { prisma } from '$lib/server/db/client.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { profileId, targetUrl } = await request.json();
    
    if (!profileId || !targetUrl) {
      return json({ error: 'Profile ID and target URL are required' }, { status: 400 });
    }
    
    const profile = await getProfile(profileId);
    if (!profile) {
      return json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const html = await fetchHTML(targetUrl);
    const extractedRaw = extractSvelteKitData(html);
    const extractedClean = sanitizeExtractedData(extractedRaw);
    const extractedNormalized = normalizeData(extractedClean);
    
    const profileData = {
      id: profile.id,
      name: profile.name,
      bio: profile.bio || undefined,
      website: profile.website || undefined,
      twitter: profile.twitter || undefined,
      github: profile.github || undefined,
      linkedin: profile.linkedin || undefined,
      wallet: profile.wallet || undefined,
      email: profile.email || undefined,
      location: profile.location || undefined,
      avatar: profile.avatar || undefined,
    };
    
    const comparisonResult = compareProfileWithExtracted(profileData, extractedNormalized);
    
    const comparison = await prisma.comparison.create({
      data: {
        profileId,
        targetUrl,
        extractedData: JSON.stringify(extractedNormalized),
        differences: JSON.stringify(comparisonResult),
      },
    });
    
    return json({
      comparison: comparisonResult,
      extractedData: extractedNormalized,
      comparisonId: comparison.id
    });
    
  } catch (error) {
    console.error('Comparison failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: `Comparison failed: ${message}` }, { status: 500 });
  }
};