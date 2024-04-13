<script>
	// @ts-nocheck
	import axios from 'axios';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import MaskInput from 'svelte-input-mask';

	const dispatch = createEventDispatcher();
	let id = 0;
	let account_desc = '';
	let account_code = '';
	let account_pid = 0;
	let account_p;
	let account_pid_desc = '';
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
			if (edit == true) {
				account_p = res.data.results.find((account) => account.id == item.account_pid);
				account_pid_desc = account_p.account_desc;
			}
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
				account_desc,
				account_code,
				account_pid: account_p.id
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
				account_pid: account_p.id
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

	function handleChangeSelect(event) {
		account_pid_desc = event.target.options[event.target.selectedIndex].text;
		var account = account_parents.find((account) => account.id == account_p.id);
		var p1 =
			account != undefined &&
			account.account_code.split('.')[0] != null &&
			account.account_code.split('.')[0];

		var p2 =
			account != undefined && account.account_code.split('.')[1] != null
				? account.account_code.split('.')[1]
				: '0';
		axios.get(`${PUBLIC_APP_URL}/api/findAccountplansByCode?p1=${p1}&p2=${p2}`).then((res) => {
			if (p1 != 0 && p2 == 0) {
				if (res.data.results.length > 0) {
					var valor = res.data.results.sort((a, b) => a.account_code.localeCompare(b.account_code));
					console.log(valor);
					var p4 = valor[valor.length - 1].account_code.split('.')[1];
					account_code = p1 + '.' + (parseInt(p4) + 1) + '.' + 0;
				} else {
					account_code = p1 + '.' + 1 + '.' + 0;
				}
			} else if (p2 != 0) {
				if (res.data.results.length > 0) {
					var valor = res.data.results.sort((a, b) => a.account_code.localeCompare(b.account_code));
					var p4 = valor[valor.length - 1].account_code.split('.')[1];
					account_code = p1 + '.' + p2 + '.' + (parseInt(p4) + 1);
				} else {
					account_code = p1 + '.' + p2 + '.' + 1;
				}
			} else {
				if (res.data.results.length > 0) {
					var valor = res.data.results.sort((a, b) => a.account_code.localeCompare(b.account_code));

					var p4 = valor[valor.length - 1].account_code.split('.')[2];
					account_code = p1 + '.' + p2 + '.' + (parseInt(p4) + 1);
				} else {
					account_code = p1 + '-' + p2 + '-' + 1;
				}
			}
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
		<label for="account_pid" class="mr-2">Pertenece a: </label>
		<select
			id="account_pid"
			class="select select-bordered w-full max-w-xs"
			bind:value={account_p}
			on:change={(e) => handleChangeSelect(e)}
		>
			{#each account_parents as account_parent}
				<option value={account_parent}>
					{account_parent.account_desc}
				</option>
			{/each}
		</select>
	</div>
	<div class="mb-4 flex items-center">
		<label for="account_code" class="mr-2">Codigo</label>
		<MaskInput
			class="input input-bordered w-full max-w-xs"
			size={3}
			alwaysShowMask
			bind:value={account_code}
			on:change={(event) => formatAccountCode(event)}
			maskChar="_"
			mask="0.0.0"
		/>
	</div>

	<button
		class="btn btn-primary"
		on:click={edit == true ? handleUpdateObject() : handleCreateObject()}>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>
