<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-semibold text-gray-900">rip.fun Data Extractor</h1>
				</div>
				<div class="flex items-center space-x-4">
					<a href="/" class="text-gray-600 hover:text-gray-900">Home</a>
					<a href="/extract" class="text-gray-600 hover:text-gray-900">Extractor</a>
					<a href="/trade-finder" class="text-gray-600 hover:text-gray-900">Trade Finder</a>
				</div>
			</div>
		</div>
	</nav>
	
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		{@render children?.()}
	</main>
</div>
