<script>
	// @ts-nocheck
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';

	const dispatch = createEventDispatcher();
	let id = 0;
	let p_type_desc = '';
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
			p_type_desc = item.p_type_desc;
		}
	});
	// http://127.0.0.1:5173/tilltypes
	function handleCreateObject() {
		axios
			.post(`${PUBLIC_APP_URL}/api/persontypes`, {
				p_type_desc
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
			.put(`${PUBLIC_APP_URL}/api/persontypes/${id}`, {
				p_type_desc
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
	<h3 class="mb-4 text-center text-2xl">Actualizar Tipo de Persona</h3>
{:else}
	<h3 class="mb-4 text-center text-2xl">Crear Tipo de Persona</h3>
{/if}
<form>
	<div class="mb-4 flex items-center">
		<span class="mr-2">Descripción</span>
		<input type="text" bind:value={p_type_desc} class="input input-bordered w-full max-w-xs" />
	</div>

	<button
		class="btn btn-primary"
		on:click={edit == true ? handleUpdateObject() : handleCreateObject()}>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>
