<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import Pagination from '$lib/utilities/pagination.svelte';
	let data = [];
	let error = null;
	let orderBy = 'TILL_NAME';
	let order = 'asc';
	let total_pages;
	let total_items;
	let current_page = 1;
	let items_per_page = '10';
	let url = `http://127.0.0.1:3000/api/tills?`;

	function fetchData(page = current_page, rows = items_per_page) {
		axios
			// .get('/api/tills')
			.get(`${url}orderBy=${orderBy}&order=${order}&page=${page}&itemsPerPage=${rows}`)
			.then((response) => {
				data = response.data.results;
				current_page = response.data.currentPage;
				total_items = response.data.totalItems;
				total_pages = response.data.totalResults;
				console.log(data);
			})
			.catch((err) => {
				error = err;
			});
	}

	function handleRowsPerPage(event) {
		items_per_page = event.detail.value;
		fetchData(current_page, event.detail.value);
	}
	function handlePage(event) {
		current_page = event.detail.value;
		fetchData(event.detail.value, items_per_page);
	}

	onMount(async () => {
		fetchData();
	});
</script>

{#if error}
	<p>{error}</p>
{/if}
<h3 class="mb-4 text-center text-2xl">Cajas</h3>

<div class="flex justify-center">
	<label class="input input-bordered flex items-center gap-2">
		<input type="text" class="grow" placeholder="Search" />
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 16 16"
			fill="currentColor"
			class="h-4 w-4 opacity-70"
			><path
				fill-rule="evenodd"
				d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
				clip-rule="evenodd"
			/></svg
		>
	</label>
</div>
{#if data}
	<div class="overflow-x-auto">
		<table class="table w-full">
			<thead>
				<tr>
					<th>ID</th>
					<th>Descripcion</th>
					<th><button class="btn btn-primary">Agregar</button></th>
				</tr>
			</thead>
			<tbody>
				{#each data as till (till.id)}
					<tr class="hover">
						<td>{till.id}</td>
						<td>{till.TILL_NAME}</td>
						<td><button class="btn btn-warning">Editar</button></td>
						<td><button class="btn btn-secondary">Eliminar</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<Pagination
			{current_page}
			{total_items}
			{total_pages}
			{items_per_page}
			on:page={handlePage}
			on:row={handleRowsPerPage}
		/>
	</div>
{/if}
