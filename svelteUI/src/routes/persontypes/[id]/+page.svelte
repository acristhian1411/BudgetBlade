<script>
	/** @type {import('./$types').PageData} */
	import axios from 'axios';
	import {getToken} from '../../../services/authservice'
	import { onMount } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';

	let error;
	let tilltype;

	export let data;

	async function fetchData() {
		const token = getToken();
		let config = {
			headers: {
				'authorization': `token: ${token}`
			}
		};
		axios
			.get(`${PUBLIC_APP_URL}/api/persontypes/${data.id}`, config)
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
		<li><a href="/persontypes">Tipos de personas</a></li>
	</ul>
</div>
{#if tilltype}
	<h1 class="text-xl font-bold">Descripcion:</h1>
	<p class="text-1xl">{tilltype.p_type_desc}</p>
{/if}
<!-- <div>{@html data.content}</div> -->
