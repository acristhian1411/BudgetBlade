<script>
	// @ts-nocheck
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	let id = 0;
	let person_id = 0;
	let person_name = '';
	let t_type_id = 0;
	let t_type_desc = '';
	let TILL_NAME = '';
	let persons = [];
	let TILL_TYPES = [];
	let TILL_ACCOUNT_NUMBER = '';
	export let edit;
	export let item;
	function close() {
		dispatch('close');
	}
	function getPersons() {
		axios
			.get(`/api/persons`)
			.then((res) => {
				console.log(res.data.results);
				persons = res.data.results;
			})
			.catch((err) => {
				console.log(err);
			});
	}
	function getTillTypes() {
		axios
			.get(`/api/tillstypes`)
			.then((res) => {
				TILL_TYPES = res.data.results;
			})
			.catch((err) => {
				console.log(err);
			});
	}
	onMount(() => {
		getPersons();
		getTillTypes();
		if (edit == true) {
			id = item.id;
			person_id = item.person_id;
			t_type_id = item.t_type_id;
			TILL_NAME = item.TILL_NAME;
			TILL_ACCOUNT_NUMBER = item.TILL_ACCOUNT_NUMBER;
		}
	});
	function handlePersons(event) {
		console.log('event', event.target.value);
		person_id = event.target.value;
		person_name = event.target.text;
	}
	function handleTillTypes(event) {
		console.log('event', event.target);
		t_type_id = event.target.value;
		t_type_desc = event.target.text;
	}
	function handleCreateObject() {
		axios
			.post(`/api/tills`, {
				person_id,
				t_type_id,
				TILL_NAME,
				TILL_ACCOUNT_NUMBER
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
			.put(`/api/tills/${id}`, {
				person_id,
				t_type_id,
				TILL_NAME,
				TILL_ACCOUNT_NUMBER
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
	<h3 class="mb-4 text-center text-2xl">Actualizar Caja</h3>
{:else}
	<h3 class="mb-4 text-center text-2xl">Crear Caja</h3>
{/if}
<form>
	<label class="mb-4 flex">
		<span>Descripción</span>
		<input
			type="text"
			placeholder="Descripción"
			bind:value={TILL_NAME}
			class="input input-bordered mb-6 w-full max-w-xs"
		/>
	</label>

	<label class="mb-4 flex">
		<span>Cuenta</span>
		<input
			type="text"
			placeholder="Cuenta"
			bind:value={TILL_ACCOUNT_NUMBER}
			class="input input-bordered mb-6 w-full max-w-xs"
		/>
	</label>
	<div class="mb-4 flex justify-start">
		<label class="mb-4 flex">
			<span>Persona</span>
			<select
				type="text"
				placeholder="Persona"
				bind:value={person_id}
				on:change={(event) => handlePersons(event)}
				class="input input-bordered mb-6 w-full max-w-xs"
			>
				{#each persons as person}
					<option value={person.person_id}>{person.person_fname} {person.person_lname}</option>
				{/each}
			</select>
		</label>
	</div>
	<div class="mb-4 flex justify-start">
		<label class="mb-4 flex">
			<span>Tipo de caja</span>

			<select
				type="text"
				placeholder="Tipo de caja"
				bind:value={t_type_id}
				on:change={handleTillTypes}
				class="input input-bordered mb-6 w-full max-w-xs"
			>
				{#each TILL_TYPES as ttype}
					<option value={ttype.id}>{ttype.t_type_desc}</option>
				{/each}
			</select>
		</label>
	</div>
	<button
		class="btn btn-primary"
		on:click={edit == true ? handleUpdateObject() : handleCreateObject()}>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>
