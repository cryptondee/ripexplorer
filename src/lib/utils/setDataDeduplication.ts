// Global request deduplication for set data fetching
// This prevents multiple concurrent requests for the same set ID

const ongoingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch(setId: string, fetchFunction: () => Promise<any>): Promise<any> {
  // Check if request is already ongoing
  if (ongoingRequests.has(setId)) {
    console.log(`⏳ SetData: Waiting for ongoing request for set ${setId}`);
    return await ongoingRequests.get(setId);
  }

  console.log(`🚀 SetData: Starting new request for set ${setId}`);
  
  // Create and store the promise
  const promise = fetchFunction();
  ongoingRequests.set(setId, promise);

  try {
    const result = await promise;
    ongoingRequests.delete(setId); // Clean up on success
    return result;
  } catch (error) {
    ongoingRequests.delete(setId); // Clean up on error
    throw error;
  }
}

// Clear all ongoing requests (useful for debugging or component unmounting)
export function clearOngoingRequests() {
  ongoingRequests.clear();
}

// Get current ongoing requests (for debugging)
export function getOngoingRequestsCount() {
  return ongoingRequests.size;
}