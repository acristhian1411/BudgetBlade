<script>
	/** @type {import('./$types').PageData} */
	import axios from 'axios';
	import {getToken} from '../../../services/authservice'
	import { onMount } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	let error;
	let till;

	export let data;

	async function fetchData() {
		const token = getToken();
		let config = {
			headers: {
				'authorization': `token: ${token}`
			}
		};
		axios
			.get(`${PUBLIC_APP_URL}/api/tills/${data.id}`, config)
			.then((response) => {
				till = response.data;
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
		<li><a href="/tills">Cajas</a></li>
	</ul>
</div>
{#if till}
	<section>
		<div class="mb-4 flex content-center items-start justify-start gap-2">
			<h1 class="text-xl font-bold">Descripción:</h1>
			<p class="text-1xl mb-4 flex self-center">{till.TILL_NAME}</p>
		</div>
		<div class="mb-4 flex items-start gap-2">
			<h1 class="text-xl font-bold">Código:</h1>
			<p class="text-1xl mb-4">{till.TILL_ACCOUNT_NUMBER}</p>
		</div>
	</section>
{/if}

<!-- <div>{@html data.content}</div> -->
