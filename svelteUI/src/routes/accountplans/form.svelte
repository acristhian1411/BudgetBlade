<script>
	// @ts-nocheck
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';

	const dispatch = createEventDispatcher();
	let id = 0;
	let account_desc = '';
	let account_code = '';
	let account_pid = 0;
	let account_parents = [];
	export let edit;
	export let item;
	function close() {
		dispatch('close');
	}

	function OpenAlertMessage(event) {
		dispatch('message', event.detail);
	}

	async function fetchParents() {
		axios.get(`${PUBLIC_APP_URL}/api/accountplans`).then((res) => {
			account_parents = res.data.results;
		});
	}

	onMount(() => {
		fetchParents();
		if (edit == true) {
			id = item.id;
			account_desc = item.account_desc;
			account_code = item.account_code;
			account_pid = item.account_pid;
		}
	});
	async function handleCreateObject() {
		axios
			.post(`${PUBLIC_APP_URL}/api/accountplans`, {
				account_desc
			})
			.then((res) => {
				let detail = {
					detail: {
						type: 'success',
						message: res.data.message
					}
				};
				OpenAlertMessage(detail);
				close();
			});
	}
	function handleUpdateObject() {
		axios
			.put(`${PUBLIC_APP_URL}/api/accountplans/${id}`, {
				account_desc,
				account_code,
				account_pid
			})
			.then((res) => {
				let detail = {
					detail: {
						type: 'success',
						message: res.data.message
					}
				};
				OpenAlertMessage(detail);
				close();
			});
	}
</script>

{#if edit == true}
	<h3 class="mb-4 text-center text-2xl">Actualizar Plan de Cuenta</h3>
{:else}
	<h3 class="mb-4 text-center text-2xl">Crear Plan de Cuenta</h3>
{/if}
<form>
	<div class="mb-4 flex items-center">
		<label for="account_desc" class="mr-2">Descripción</label>
		<input type="text" bind:value={account_desc} class="input input-bordered w-full max-w-xs" />
	</div>
	<div class="mb-4 flex items-center">
		<label for="account_code" class="mr-2">Codigo</label>
		<input type="text" bind:value={account_code} class="input input-bordered w-full max-w-xs" />
	</div>
	<div class="mb-4 flex items-center">
		<label for="account_pid" class="mr-2">Pertenece a: </label>
		<select id="account_pid" class="select select-bordered w-full max-w-xs">
			{#each account_parents as account_parent}
				<option value={account_parent.id}>{account_parent.account_desc}</option>
			{/each}
		</select>
	</div>

	<button
		class="btn btn-primary"
		on:click={edit == true ? handleUpdateObject() : handleCreateObject()}>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>
