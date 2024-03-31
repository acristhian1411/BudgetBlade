<script>
	/** @type {import('./$types').PageData} */
	import axios from 'axios';
	import { onMount } from 'svelte';
	let error;
	let tilltype;

	export let data;

	async function fetchData() {
		axios
			.get(`http://127.0.0.1:3000/api/tillstypes/${data.id}`)
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
<div class="breadcrumbs text-md mb-4">
	<ul>
		<li><a href="/">Inicio</a></li>
		<li><a href="/tilltypes">Tipos de caja</a></li>
	</ul>
</div>
{#if tilltype}
	<h1 class="text-xl font-bold">Descripcion:</h1>
	<p class="text-1xl">{tilltype.t_type_desc}</p>
{/if}
<!-- <div>{@html data.content}</div> -->
