<script>
	/** @type {import('./$types').PageData} */
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	let error;
	let tilltype;

	export let data;

	async function fetchData() {
		axios
			.get(`${PUBLIC_APP_URL}/api/accountplans/${data.id}`)
			.then((response) => {
				tilltype = response.data;
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
<div class="breadcrumbs text-sm">
	<ul>
		<li><a href="/">Inicio</a></li>
		<li><a href="/accountplans">Planes de cuenta</a></li>
	</ul>
</div>
{#if tilltype}
	<h1 class="text-2xl font-bold">Descripcion:</h1>
	<p class="text-1xl">{tilltype.account_desc}</p>
{/if}
<!-- <div>{@html data.content}</div> -->
