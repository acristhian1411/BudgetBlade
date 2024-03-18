<script>
	// @ts-nocheck
	import { getToken } from '../../services/auth';
	import { onMount } from 'svelte';
	import axios from 'axios';
	import Pagination from '$lib/utilities/pagination.svelte';
	import DeleteModal from '$lib/utilities/delete_modal.svelte';
	import Alert from '$lib/utilities/alert.svelte';
	import Modal from '$lib/utilities/modal.svelte';
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

	function updateData() {
		fetchData();
		closeModal();
	}

	async function fetchData(page = current_page, rows = items_per_page) {
		const token = await getToken();
		axios
			// .get('/api/tillstypes')
			.get(`${url}sortBy=${orderBy}&sortOrder=${order}&page=${page}&pageSize=${rows}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			})
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
	function sortData(param) {
		orderBy = param;
		if (order == 'asc') {
			order = 'desc';
		} else {
			order = 'asc';
		}
		fetchData(current_page, items_per_page);
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
	<div
		class="relative rounded border border-red-400 bg-red-100 px-4 py-2 text-red-700"
		role="alert"
	>
		<strong class="font-bold">Error:</strong>
		<span class="block sm:inline">{error}</span>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span class="absolute bottom-0 right-0 top-0 px-4 py-3" on:click={() => (error = null)}>
			<svg
				class="h-6 w-6 fill-current text-red-500"
				role="button"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
			>
				<title>Close</title>
				<path
					d="M14.348 14.849c-.469.469-1.229.469-1.697 0L10 11.819l-2.651 3.029c-.469.469-1.228.469-1.697 0-.469-.469-.469-1.228 0-1.697l2.756-3.15L5.652 5.151c-.469-.469-.469-1.229 0-1.697.469-.469 1.228-.469 1.697 0l3.65 4.17 3.65-4.17c.469-.469 1.228-.469 1.697 0 .469.469.469 1.228 0 1.697l-2.756 3.15 2.756 3.15c.469.469.469 1.228 0 1.697z"
				/>
			</svg>
		</span>
	</div>
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
	<Modal on:close={() => updateData()}>
		<Form {edit} on:message={OpenAlertMessage} on:close={() => updateData()} />
	</Modal>
{/if}
{#if edit == true}
	<Modal on:close={() => updateData()}>
		<Form {edit} {item} on:message={OpenAlertMessage} on:close={() => updateData()} />
	</Modal>
{/if}
{#if data}
	<div class="overflow-x-auto">
		<table class="table w-full">
			<thead>
				<tr>
					<th class="text-center text-lg">
						<div class="flex items-center">
							ID
							<button on:click={() => sortData('id')}
								><svg
									class="ms-1.5 h-3 w-3"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
									/>
								</svg></button
							>
						</div>
					</th>
					<th class="text-center text-lg">
						<div class="flex items-center justify-center">
							Descripcion
							<button on:click={() => sortData('t_type_desc')}
								><svg
									class="ms-1.5 h-3 w-3"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
									/>
								</svg></button
							>
						</div>
					</th>
					<th><button class="btn btn-primary" on:click={() => (_new = true)}>Agregar</button></th>
				</tr>
			</thead>
			<tbody>
				{#each data as t_type, i (t_type.id)}
					<tr class="hover">
						<td>{t_type.id}</td>
						<td class="text-center">{t_type.t_type_desc}</td>
						<td>
							<a href="/tilltypes/{t_type.id}" class="btn btn-info">Mostrar</a>
						</td>
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
