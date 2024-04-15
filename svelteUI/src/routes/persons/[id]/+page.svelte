<script>
	/** @type {import('./$types').PageData} */
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';

	let error;
	let person;

	export let data;

	async function fetchData() {
		axios
			.get(`${PUBLIC_APP_URL}/api/persons/${data.id}`)
			.then((response) => {
				person = response.data;
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
		<li><a href="/persons">Personas</a></li>
	</ul>
</div>
{#if person}
	<section>
		<div class="mb-4 flex content-center items-start justify-start gap-2">
			<h1 class="text-xl font-bold">Nombres y apellido:</h1>
			<p class="text-1xl mb-4 flex self-center">
				{person.person_fname + ' ' + person.person_lname}
			</p>
		</div>
		<div class="mb-4 flex items-start gap-2">
			<h1 class="text-xl font-bold">Cédula:</h1>
			<p class="text-1xl mb-4">{person.person_idnumber}</p>
		</div>
		<div class="mb-4 flex items-start gap-2">
			<h1 class="text-xl font-bold">Fecha de nacimiento:</h1>
			<p class="text-1xl mb-4">{new Date(person.birthDate).toLocaleDateString()}</p>
		</div>
		<div class="mb-4 flex items-start gap-2">
			<h1 class="text-xl font-bold">Tipo:</h1>
			<p class="text-1xl mb-4">{person.persontype.p_type_desc}</p>
		</div>
	</section>
{/if}
