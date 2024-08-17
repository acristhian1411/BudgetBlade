<script>
	import '../app.pcss';
	import {onMount} from 'svelte';
	import {goto} from '$app/navigation';
	import {isLoggedIn} from '../services/authservice.js'
	import Headers from '../components/Commons/Headers.svelte';
	import Sidebar from '../components/Commons/Sidebar.svelte';
	import Login from './login/+page.svelte'
	
	let logged 
	onMount(async () => {
		logged = isLoggedIn();
		if (!logged) {
			goto('/login');
		}
	});
	
</script>

{#if logged == true}
	<Headers/>
	<Sidebar/>
	<div class="p-4 sm:ml-64">
		<div class="mt-14 rounded-lg border-0 p-4 dark:border-gray-700">
			<slot />
		</div>
	</div>
	{:else}
	<div class="p-4 sm:ml-64">
		<div class="mt-14 rounded-lg border-0 p-4 dark:border-gray-700">
			<slot />
		</div>
	</div>
{/if}
