<script>
	/** @type {import('./$types').PageData} */
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	let error;
	let accountplan;

	export let data;

	async function fetchData() {
		axios
			.get(`${PUBLIC_APP_URL}/api/accountplans/${data.id}`)
			.then((response) => {
				accountplan = response.data;
			})
			.catch((err) => {
				error = err;
			});
		// })
	}

	onMount(() => {
		fetchData();
	});
</script>

<!-- <h1>{data.id}</h1> -->
{#if error}
	<p>{error}</p>
{/if}
<div class="breadcrumbs text-md mb-4">
	<ul>
		<li><a href="/">Inicio</a></li>
		<li><a href="/accountplans">Planes de cuenta</a></li>
	</ul>
</div>
{#if accountplan}
	<h1 class="text-xl font-bold">Descripción:</h1>
	<p class="text-1xl mb-4">{accountplan.account_desc}</p>
	<h1 class="text-xl font-bold">Código:</h1>
	<p class="text-1xl mb-4">{accountplan.account_code}</p>
{/if}
<!-- <div>{@html data.content}</div> -->
