import { json } from '@sveltejs/kit';
import { getProfile, updateProfile, deleteProfile } from '$lib/server/db/profiles.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const profile = await getProfile(params.id);
    
    if (!profile) {
      return json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return json(profile);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const data = await request.json();
    const profile = await updateProfile(params.id, data);
    return json(profile);
  } catch (error) {
    console.error('Failed to update profile:', error);
    return json({ error: 'Failed to update profile' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    await deleteProfile(params.id);
    return json({ success: true });
  } catch (error) {
    console.error('Failed to delete profile:', error);
    return json({ error: 'Failed to delete profile' }, { status: 500 });
  }
};