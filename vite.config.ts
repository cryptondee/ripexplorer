import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		rollupOptions: {
			external: ['bcrypt'],
			output: {
				// Optimize chunk splitting for better caching
				manualChunks: (id) => {
					// Vendor libraries
					if (id.includes('node_modules')) {
						if (id.includes('viem') || id.includes('alchemy-sdk')) {
							return 'vendor-crypto';
						}
						if (id.includes('@prisma/client')) {
							return 'vendor-db';
						}
						if (id.includes('svelte')) {
							return 'vendor-svelte';
						}
						return 'vendor';
					}
					
					// Large component groups
					if (id.includes('/components/card/')) {
						return 'components-card';
					}
					if (id.includes('SetDataManager') || id.includes('TradeTable')) {
						return 'components-data';
					}
				}
			}
		},
		// Optimize build performance
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: false, // Disable in production for smaller files
		chunkSizeWarningLimit: 1000 // Increase limit for large chunks
	},
	ssr: {
		noExternal: []
	},
	// Development optimizations
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..']
		}
	}
});
