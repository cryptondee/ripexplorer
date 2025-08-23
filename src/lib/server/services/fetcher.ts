interface FetchOptions {
  maxRetries?: number;
  initialTimeout?: number;
  maxTimeout?: number;
  retryDelay?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchHTML(url: string, options: FetchOptions = {}): Promise<string> {
  const {
    maxRetries = 3,
    initialTimeout = 15000, // Start with 15 seconds
    maxTimeout = 45000, // Maximum 45 seconds
    retryDelay = 1000 // Base delay between retries
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }
      
      // Increase timeout with each retry, but cap at maxTimeout
      const currentTimeout = Math.min(initialTimeout + (attempt * 5000), maxTimeout);
      
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1} - Fetching ${url} with ${currentTimeout}ms timeout`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentTimeout);
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status >= 500 && attempt < maxRetries) {
            throw new Error(`Server error ${response.status} - will retry`);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('text/html')) {
          throw new Error('Response is not HTML content');
        }
        
        const html = await response.text();
        console.log(`Successfully fetched ${url} on attempt ${attempt + 1}`);
        return html;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry for certain types of errors
      if (lastError.message.includes('Only HTTP and HTTPS URLs are allowed') ||
          lastError.message.includes('Response is not HTML content') ||
          (lastError.message.includes('HTTP error') && !lastError.message.includes('will retry'))) {
        break;
      }
      
      // If this is the last attempt, don't delay
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // If we get here, all attempts failed
  const errorMessage = lastError?.message || 'Unknown error';
  if (errorMessage.includes('aborted')) {
    throw new Error(`Failed to fetch HTML from ${url}: Request timed out after multiple attempts. The page may be loading slowly or experiencing issues.`);
  }
  
  throw new Error(`Failed to fetch HTML from ${url} after ${maxRetries + 1} attempts: ${errorMessage}`);
}