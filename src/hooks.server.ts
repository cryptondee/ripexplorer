import { initializeServices } from '$lib/server/startup.js';
import type { Handle } from '@sveltejs/kit';

// Initialize services on server startup
initializeServices();

export const handle: Handle = async ({ event, resolve }) => {
  // Handle the request normally
  const response = await resolve(event);
  
  return response;
};