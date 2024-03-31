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
	export let edit;
	export let item;
	function close() {
		dispatch('close');
	}

	function OpenAlertMessage(event) {
		dispatch('message', event.detail);
	}

	onMount(() => {
		if (edit == true) {
			id = item.id;
			account_desc = item.account_desc;
			account_code = item.account_code;
			account_pid = item.account_pid;
		}
	});
	// http://127.0.0.1:5173/tilltypes
	function handleCreateObject() {
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
</script>

{#if edit == true}
	<h3 class="mb-4 text-center text-2xl">Actualizar Plan de Cuenta</h3>
{:else}
	<h3 class="mb-4 text-center text-2xl">Crear Plan de Cuenta</h3>
{/if}
<form>
	<div class="mb-4 flex items-center">
		<span class="mr-2">Descripción</span>
		<input type="text" bind:value={account_desc} class="input input-bordered w-full max-w-xs" />
	</div>
	<div class="mb-4 flex items-center">
		<span class="mr-2">Codigo</span>
		<input type="text" bind:value={account_code} class="input input-bordered w-full max-w-xs" />
	</div>

	<button
		class="btn btn-primary"
		on:click={edit == true ? handleUpdateObject() : handleCreateObject()}>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>
