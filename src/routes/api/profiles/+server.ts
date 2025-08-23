import { json } from '@sveltejs/kit';
import { createProfile, getAllProfiles } from '$lib/server/db/profiles.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
  try {
    const profiles = await getAllProfiles();
    return json(profiles);
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    return json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    if (!data.name) {
      return json({ error: 'Name is required' }, { status: 400 });
    }
    
    const profile = await createProfile(data);
    return json(profile, { status: 201 });
  } catch (error) {
    console.error('Failed to create profile:', error);
    return json({ error: 'Failed to create profile' }, { status: 500 });
  }
};