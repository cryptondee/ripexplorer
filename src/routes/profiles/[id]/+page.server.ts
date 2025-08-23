import { error } from '@sveltejs/kit';
import { getProfile } from '$lib/server/db/profiles.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  const profile = await getProfile(params.id);
  
  if (!profile) {
    throw error(404, 'Profile not found');
  }
  
  return {
    profile
  };
};