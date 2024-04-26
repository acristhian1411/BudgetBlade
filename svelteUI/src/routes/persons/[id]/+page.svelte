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
		<div class="card bg-base-100 w-96 h-90 shadow-xl">
			<figure><img src="/images/{person.person_photo}" alt="Avatar" /></figure>
			<div class="card-body">
				<h2 class="card-title">{person.person_fname + ' ' + person.person_lname}</h2>
				<p>Cédula: {person.person_idnumber}</p>
				<p>Fecha de nacimiento: {new Date(person.birthDate).toLocaleDateString()}</p>
				<p class="text-1xl mb-4">Tipo: {person.persontype.p_type_desc}</p>
			</div>
		</div>
	</section>
{/if}
