<script>
	// @ts-nocheck

	import { onMount } from 'svelte';
	import axios from 'axios';
	import Pagination from '$lib/utilities/pagination.svelte';
	import DeleteModal from '$lib/utilities/delete_modal.svelte';
	import Alert from '$lib/utilities/alert.svelte';
	import Form from './form.svelte';
	let data = [];
	let error = null;
	let openAlert = false;
	let _new = false;
	let edit = false;
	let item = null;
	let search_param = '';
	let openDeleteModal = false;
	let alertMessage = '';
	let alertType = '';
	let id = 0;
	let orderBy = 't_type_desc';
	let order = 'asc';
	let total_pages;
	let total_items;
	let current_page = 1;
	let items_per_page = '10';
	let url = `http://127.0.0.1:3000/api/tillstypes?`;

	function fetchData(page = current_page, rows = items_per_page) {
		axios
			// .get('/api/tillstypes')
			.get(`${url}orderBy=${orderBy}&order=${order}&page=${page}&pageSize=${rows}`)
			.then((response) => {
				data = response.data.results;
				current_page = response.data.currentPage;
				total_items = response.data.totalResults;
				total_pages = response.data.totalPages;
			})
			.catch((err) => {
				error = err;
			});
	}

	function closeAlert() {
		openAlert = false;
	}

	function OpenAlertMessage(event) {
		openAlert = true;
		alertType = event.detail.type;
		alertMessage = event.detail.message;
	}

	function deleteRecord() {
		axios.delete(`http://127.0.0.1:3000/api/tillstypes/${id}`).then((res) => {
			let detail = {
				detail: {
					type: 'delete',
					message: res.data.message
				}
			};
			OpenAlertMessage(detail);
			closeDeleteModal();
		});
	}
	function openEditModal(data) {
		edit = true;
		item = data;
		_new = false;
	}
	function closeModal() {
		edit = false;
		_new = false;
	}
	function openNewModal() {
		edit = false;
		item = null;
		_new = true;
	}
	function closeDeleteModal() {
		openDeleteModal = false;
		fetchData();
	}
	function OpenDeleteModal(data) {
		id = data;
		openDeleteModal = true;
	}
	function handleRowsPerPage(event) {
		items_per_page = event.detail.value;
		fetchData(current_page, event.detail.value);
	}
	function handlePage(event) {
		current_page = event.detail.value;
		fetchData(event.detail.value, items_per_page);
	}
	function search(event) {
		search_param = event.target.value;
		if (search_param == '') {
			url = `http://127.0.0.1:3000/api/tillstypes?`;
		} else {
			url = `http://127.0.0.1:3000/api/searchtillstypes?t_type_desc=${search_param}&`;
		}
		fetchData(1, items_per_page);
	}
	onMount(async () => {
		fetchData();
	});
</script>

{#if error}
	<p>{error}</p>
{/if}
<h3 class="mb-4 text-center text-2xl">Tipos de Cajas</h3>

<div class="flex justify-center">
	<label class="input input-bordered flex items-center gap-2">
		<input type="text" class="grow" placeholder="Search" on:change={search} />
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
{#if openAlert}
	<Alert {alertMessage} {alertType} on:close={closeAlert} />
{/if}
{#if openDeleteModal}
	<dialog class="modal modal-open">
		<DeleteModal on:close={closeDeleteModal} on:confirm={deleteRecord} />
	</dialog>
{/if}
{#if _new == true}
	<dialog class="modal modal-open">
		<Form {edit} on:message={OpenAlertMessage} on:close={() => closeModal()} />
	</dialog>
{/if}
{#if edit == true}
	<dialog class="modal modal-open">
		<Form {edit} {item} on:message={OpenAlertMessage} on:close={() => closeModal()} />
	</dialog>
{/if}
{#if data}
	<div class="overflow-x-auto">
		<table class="table w-full">
			<thead>
				<tr>
					<th class="text-lg">#</th>
					<th class="text-lg">ID</th>
					<th class="text-center text-lg">Descripcion</th>
					<th><button class="btn btn-primary" on:click={() => (_new = true)}>Agregar</button></th>
				</tr>
			</thead>
			<tbody>
				{#each data as t_type, i (t_type.id)}
					<tr class="hover">
						<td>{i + 1}</td>
						<td>{t_type.id}</td>
						<td class="text-center">{t_type.t_type_desc}</td>
						<td>
							<button class="btn btn-warning" on:click={() => openEditModal(t_type)}>Editar</button>
						</td>
						<td>
							<button class="btn btn-secondary" on:click={() => OpenDeleteModal(t_type.id)}
								>Eliminar</button
							></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
		<Pagination
			{current_page}
			{total_pages}
			{items_per_page}
			on:page={handlePage}
			on:row={handleRowsPerPage}
		/>
	</div>
{/if}
