<script>
	// @ts-nocheck
	import axios from 'axios';
	import {isLoggedIn, getUserData} from '../../services/authservice.js'
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import MaskInput from 'svelte-input-mask';

	const dispatch = createEventDispatcher();
	let id = 0;
	let TILL_NAME = '';
    let TILL_ACCOUNT_NUMBER = ''
	let account_code = '';
	let person_id = 0;
	let person;
	let person_name = '';
	let persons = [];
    let t_type_id = 0;
	let t_type;
	let t_type_desc = '';
	let t_types = [];
	let user;
	export let edit;
	export let item;

	function close() {
		dispatch('close');
	}

	function OpenAlertMessage(event) {
		dispatch('message', event.detail);
	}

	async function fetchPersons() {
		const token = localStorage.getItem('token');
    	// Configurar los encabezados de la solicitud
		const config = {
			headers: {
				'authorization': `token: ${token}`
			}
		};
		axios.get(`${PUBLIC_APP_URL}/api/persons`,config).then((res) => {
			persons = res.data.results;
			
			if (edit == true) {
				person = res.data.results.find((account) => account.person_id == item.person_id);
				person_name = person.person_fname+' '+person.person_lname;
			}else{
				person = res.data.results.find((account) => account.person_id == user.person_id);
				person_id = person.person_id;
				person_name = person.person_fname+' '+person.person_lname;
			}
		});
	}

    async function fetchTillsTypes() {
		const token = localStorage.getItem('token');

    	// Configurar los encabezados de la solicitud
		const config = {
			headers: {
				'authorization': `token: ${token}`
			}
		};
		axios.get(`${PUBLIC_APP_URL}/api/tillstypes`,config).then((res) => {
			t_types = res.data.results;
			if (edit == true) {
				console.log('item', item.t_type_id)
				console.log(res.data.results);
				t_type = res.data.results.find((account) => account.id == item.t_type_id);
				console.log('t_type', t_type)
				t_type_desc = t_type.t_type_desc;
			}
		});
	}

	onMount(() => {
		user = getUserData();
		console.log('user', user);
		fetchPersons();
		fetchTillsTypes();
		if (edit == true) {
			id = item.id;
			TILL_NAME = item.TILL_NAME;
			TILL_ACCOUNT_NUMBER = item.TILL_ACCOUNT_NUMBER;
			t_type_id = item.t_type_id;
			person_id = item.person_id;
		}
	});
	async function handleCreateObject() {
		axios
			.post(`${PUBLIC_APP_URL}/api/tills`, {
				TILL_NAME,
				TILL_ACCOUNT_NUMBER,
				t_type_id: t_type.id,
				person_id: person.id
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
			.put(`${PUBLIC_APP_URL}/api/tills/${id}`, {
				TILL_NAME,
				account_code,
				person_id: person.id
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
	function formatAccountCode(event) {
		// account_code = event.inputState.maskedValue;
	}

	function handleChangeSelect(event,array,label) {
		console.log('event', event);
		console.log('array', event.target.value)
		[label] = event.target.options[event.target.selectedIndex].text;
		if(array == 'person'){
			person = persons.find((person) => person.person_id == event.target.value);
		}else if(array == 't_type'){
			t_type = t_types.find((ttype) => ttype.id == event.target.value);
		}
    }
</script>

{#if edit == true}
	<h3 class="mb-4 text-center text-2xl">Actualizar Caja</h3>
{:else}
	<h3 class="mb-4 text-center text-2xl">Crear Caja</h3>
{/if}
<form>
	<div class="mb-4 flex items-center">
		<label for="TILL_NAME" class="mr-2">Descripción</label>
		<input type="text" bind:value={TILL_NAME} class="input input-bordered w-full max-w-xs" />
	</div>
    <div class="mb-4 flex items-center">
		<label for="TILL_NAME" class="mr-2">N° de Cuenta</label>
		<input type="text" bind:value={TILL_ACCOUNT_NUMBER} class="input input-bordered w-full max-w-xs" />
	</div>
	<div class="mb-4 flex items-center">
		<label for="person_id" class="mr-2">Pertenece a: </label>
		<select
			id="person_id"
			class="select select-bordered w-full max-w-xs"
			bind:value={person}
			on:change={(e) => handleChangeSelect(e,'person','person_name')}
		>
			{#each persons as person}
				<option value={person}>
					{person.person_fname+' '+person.person_lname}
				</option>
			{/each}
		</select>
	</div>
	<div class="mb-4 flex items-center">
		<label for="person_id" class="mr-2">Tipo de caja: </label>
		<select
			id="t_type_id"
			class="select select-bordered w-full max-w-xs"
			bind:value={t_type}
			on:change={(e) => handleChangeSelect(e,'t_type','t_type_desc')}
		>
			{#each t_types as tp}
				<option value={tp}>
					{tp.t_type_desc}
				</option>
			{/each}
		</select>
	</div>
	<button
		class="btn btn-primary"
		on:click={edit == true ? handleUpdateObject() : handleCreateObject()}>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>