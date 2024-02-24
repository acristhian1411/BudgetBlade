<script lang="ts">
	import { onMount } from 'svelte';
	import axios from 'axios';
	let data: { id: number; TILL_NAME: string }[] = [];
	let error: any = null;

	onMount(async () => {
		const response = await axios.get('/api/tills');
		data = response.data.results;
	});
</script>

{#if error}
	<p>{error}</p>
{/if}

{#if data}
	<h2>Lista de cajas</h2>
	{#each data as till (till.id)}
		<li>{till.TILL_NAME}</li>
	{/each}
{/if}
