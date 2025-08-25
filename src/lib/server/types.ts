export interface ExtractedData {
  [key: string]: any;
}

export interface SvelteKitFetchedData {
  url: string;
  method: string;
  response: {
    status: number;
    data: any;
  };
}