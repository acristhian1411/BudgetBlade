<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import axios from 'axios';
	import {getToken} from '../../services/authservice'
	import SortIcon from '../../components/Icons/SortIcon.svelte';
	import ErrorAlert from '../../components/Alerts/ErrorAlert.svelte';
	import Pagination from '$lib/utilities/pagination.svelte';
	import DeleteModal from '$lib/utilities/delete_modal.svelte';
	import Alert from '$lib/utilities/alert.svelte';
	import Modal from '$lib/utilities/modal.svelte';
	import Form from './form.svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import SearchIcon from '../../components/Icons/SearchIcon.svelte';
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
	let person_id = 0;
	let orderBy = 'person_lname';
	let order = 'asc';
	let total_pages;
	let total_items;
	let current_page = 1;
	let items_per_page = '10';
	let url = `${PUBLIC_APP_URL}/api/persons?`;

	function updateData() {
		fetchData();
		closeModal();
	}

	async function fetchData(page = current_page, rows = items_per_page) {
		const token = getToken();
		let config = {
			headers: {
				'authorization': `token: ${token}`
			}
		};
		axios
			// .get('/api/persons')
			.get(`${url}sortBy=${orderBy}&sortOrder=${order}&page=${page}&pageSize=${rows}`, config)
			.then((response) => {
				data = response.data.results;
				current_page = response.data.currentPage;
				total_items = response.data.totalResults;
				total_pages = response.data.totalPages;
			})
			.catch((err) => {
				error = err.request.response;
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

	function ClearError() {
		error = null;
	}
	function deleteRecord() {
		axios.delete(`${PUBLIC_APP_URL}/api/persons/${person_id}`, config).then((res) => {
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
		person_id = data;
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
			url = `${PUBLIC_APP_URL}/api/persons?`;
		} else {
			url = `${PUBLIC_APP_URL}/api/searchpersons?search=${search_param}&`;
		}
		fetchData(1, items_per_page);
	}
	onMount(async () => {
		fetchData();
	});
</script>

{#if error}
	<ErrorAlert message={error} on:clearError={ClearError} />
{/if}
<h3 class="mb-4 text-center text-2xl">Personas</h3>
<div class="flex justify-center">
	<label class="input input-bordered flex items-center gap-2">
		<input type="text" class="grow" placeholder="Buscar" on:change={search} />
		<SearchIcon />
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
							<button on:click={() => sortData('person_id')}>
								<SortIcon />
							</button>
						</div>
					</th>
					<th class="text-center text-lg">
						<div class="flex items-center justify-center">
							Nombre
							<button on:click={() => sortData('person_fname')}
								><SortIcon /></button
							>
						</div>
					</th>
					<th class="text-center text-lg">
						<div class="flex items-center justify-center">
							Apellido
							<button on:click={() => sortData('person_lname')}
								><SortIcon /></button
							>
						</div>
					</th>
					<th class="text-center text-lg">
						<div class="flex items-center justify-center">
							Cédula
							<button on:click={() => sortData('person_idnumber')}
								><SortIcon /></button
							>
						</div>
					</th>
					<th class="text-center text-lg">
						<div class="flex items-center justify-center">
							Tipo
							<button on:click={() => sortData('p_type_id')}
								><SortIcon /></button
							>
						</div>
					</th>
					<th><button class="btn btn-primary" on:click={() => (_new = true)}>Agregar</button></th>
				</tr>
			</thead>
			<tbody>
				{#each data as person, i (person.person_id)}
					<tr class="hover">
						<td>{person.person_id}</td>
						<td class="text-center">{person.person_fname}</td>
						<td class="text-center">{person.person_lname}</td>
						<td class="text-center">{person.person_idnumber}</td>
						<td class="text-center">{person.persontype.p_type_desc}</td>
						<td>
							<a href="/persons/{person.person_id}" class="btn btn-info">Mostrar</a>
						</td>
						<td>
							<button class="btn btn-warning" on:click={() => openEditModal(person)}>Editar</button>
						</td>
						<td>
							<button class="btn btn-secondary" on:click={() => OpenDeleteModal(person.person_id)}
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
