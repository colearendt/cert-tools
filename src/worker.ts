/**
 * Origin Certificate PFX Generator - Cloudflare Worker
 * 
 * Serves static Astro build and handles any API routes
 */

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Serve static assets from the dist folder
    // The ASSETS binding is automatically provided by Workers Assets
    return env.ASSETS.fetch(request);
  },
};
