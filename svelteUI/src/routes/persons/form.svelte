<script>
	// @ts-nocheck
	import axios from 'axios';
	import { onMount } from 'svelte';
	import {getToken} from '../../services/authservice'
	import { createEventDispatcher } from 'svelte';
	import {fail} from '@sveltejs/kit';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import Dropzone from "svelte-file-dropzone";
	import { createFormData } from './helper'; 

	const dispatch = createEventDispatcher();
	let person_id = 0;
	let person_fname = '';
	let person_lname = '';
	let person_idnumber = '';
	let person_photo = '';
	let newFile;
	let birthDate = '';
	let p_type_id;
	let p_type_desc = '';
	let person_types = [];
	let p_types_selected;
	let can_upload = false;
	let step = 0;
	let files = {
		accepted: [],
		rejected: []
  	};
	let user_name = '';
	let user_password = '';
	export let edit;
	export let item;
	let token;
	let config;
	let formData = new FormData();
	function close() {
		dispatch('close');
	}

	function handleFilesSelect(e) {
		const { acceptedFiles, fileRejections } = e.detail;
		person_photo = `${getImageUrl(acceptedFiles[0])}`;	
		if (files.accepted.length > 0) {
			files.accepted.splice(0, 1); // Eliminar la primera imagen (solo se permite una)
		}

		// Actualizar la lista de archivos aceptados y rechazados
		files.accepted = [...acceptedFiles];
		files.rejected = [...fileRejections];
		// files.accepted = [...files.accepted, ...acceptedFiles];
		// files.rejected = [...files.rejected, ...fileRejections];
		const extension = files.accepted[0].name.split('.').pop();
  		const newFileName = `${person_fname}-${person_lname}-${person_idnumber}-${Date.now()}.${extension}`;
   		newFile = new File([files.accepted[0]], newFileName, { type: files.accepted[0].type });
		can_upload = false;
		formData.append('file',newFile)
  	}
	function OpenAlertMessage(event) {
		dispatch('message', event.detail);
	}

	function fetchPersonTypes() {
		axios.get(`${PUBLIC_APP_URL}/api/persontypes`, config).then((res) => {
			person_types = res.data.results;
			if (edit == true) {
				p_types_selected = res.data.results.find((p_type) => p_type.id == item.p_type_id);
			}
		});
	}

	onMount(() => {
		token = getToken();
		config = {
			headers: {
				'authorization': `token: ${token}`
			}
		};
		fetchPersonTypes();
		if (edit == true) {
			person_id = item.person_id;
			person_fname = item.person_fname;
			person_lname = item.person_lname;
			person_idnumber = item.person_idnumber;
			person_photo = `/images/${item.person_photo}`;
			var date = new Date(item.birthDate);
			var month = date.getMonth() + 1;
			var day = date.getDate();
			var year = date.getFullYear();
			if (month < 10) {
				month = '0' + month;
			}
			if (day < 10) {
				day = '0' + day;
			}
			birthDate = year + '-' + month + '-' + day;
		}
	});

	async function handleCreateObject() {
		axios
			.post(`${PUBLIC_APP_URL}/api/persons`, {
				person_fname,
				person_lname,
				person_idnumber,
				birthDate,
				p_type_id: p_types_selected.id,
				person_photo: newFile.name,
			}, config)
			.then((res) => {

				const data = createFormData(formData);
				const response =  fetch(`${PUBLIC_APP_URL}/api/upload_avatar`, {
				method: 'PUT',
				body: data,
				config
				});
				const result =  response.json();
				console.log(result);

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
	async function handleUpdateObject() {
		axios
			.put(`${PUBLIC_APP_URL}/api/persons/${person_id}`, {
				person_fname,
				person_lname,
				person_idnumber,
				birthDate,
				p_type_id: p_types_selected.id,
				person_photo: newFile.name,
			}, config)
			.then((res) => {
				const data = createFormData(formData);
				const response =  fetch(`${PUBLIC_APP_URL}/api/upload_avatar`, {
				method: 'PUT',
				body: data,
				config
				});
				const result =  response.json();
				console.log(result);
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
	async function UploadPhoto(){
		if (!(files.accepted[0] instanceof File)) {
    		console.log('Seleccione una imagen válida');
  		}
		const extension = files.accepted[0].name.split('.').pop();
		const newFileName = `${person_fname}-${person_lname}-${person_idnumber}-${Date.now()}.${extension}`;
		newFile = new File([files.accepted[0]], newFileName, { type: files.accepted[0].type });
    	// await writeFile(newFileName, Buffer.from(await newFile?.arrayBuffer()));		
	}
	function handleUploadPhoto(){
		can_upload = true;
	}
	function handleNextStep() {
		step++;
	}

	function handlePrevStep() {
		step--;
	}
	function getImageUrl(file) {
    return URL.createObjectURL(file);
  }
</script>

{#if edit == true}
	<h3 class="mb-4 text-center text-2xl">Actualizar Persona</h3>
{:else}
	<h3 class="mb-4 text-center text-2xl">Crear Persona</h3>
{/if}
<form>
	<div class="mb-4 flex items-center justify-center">
		<ul class="steps">
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<li class="step {step == 0 ? 'step-primary' : ''}" on:click={() => (step = 0)}>
				Datos personales
			</li>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<li class="step {step == 1 ? 'step-primary' : ''}" on:click={() => (step = 1)}>Usuario</li>
		</ul>
	</div>
	{#if step == 0}
		<section id="personalData" class:invisible={step != 0}>
			<div class="mb-4 flex items-center">
				<span class="mr-2">Nombres:</span>
				<input type="text" bind:value={person_fname} class="input input-bordered w-full max-w-xs" />
			</div>
			<div class="mb-4 flex items-center">
				<span class="mr-2">Apellidos:</span>
				<input type="text" bind:value={person_lname} class="input input-bordered w-full max-w-xs" />
			</div>
			<div class="mb-4 flex items-center">
				<span class="mr-2">Cédula:</span>
				<input
					type="text"
					bind:value={person_idnumber}
					class="input input-bordered w-full max-w-xs"
				/>
			</div>
			<div class="mb-4 flex items-center">
				<span class="mr-2">Fecha de nacimiento:</span>
				<input type="date" bind:value={birthDate} class="input input-bordered w-full max-w-xs" />
			</div>
			<div class="mb-4 flex items-center">
				<label for="account_pid" class="mr-2">Pertenece a: </label>
				<select
					id="account_pid"
					class="select select-bordered w-full max-w-xs"
					bind:value={p_types_selected}
				>
					{#each person_types as person_type}
						<option value={person_type}>
							{person_type.p_type_desc}
						</option>
					{/each}
				</select>
			</div>
		</section>
	{:else if step == 1}
		<section id="user" class:invisible={step != 1}>
			<div class="mb-4 flex items-center w-20 h-20">
				
				
				<label for="user_name" class="mr-2">Foto:</label>
				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
				{#if edit == true}
					<picture>
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<img on:click={() => (handleUploadPhoto())} accept=".jpg, .jpeg, .png, .webp" class="object-cover" src="{person_photo}" alt="avatar"/>
					</picture>	
				{:else}
				<button class="btn btn-primary" on:click={() => (handleUploadPhoto())}>
					upload photo
				</button>
				{/if}
			</div>
			{#if edit == true}
				{#if can_upload == true}
					<Dropzone multiple={false} on:drop={handleFilesSelect} />
					<!-- <input type="file" bind:files={person_photo} on:change={handleChangePhoto} /> -->
				{/if}
			{/if}
			<div class="mb-4 flex items-center">
				<label for="user_name" class="mr-2">Usuario:</label>
				<input type="text" bind:value={user_name} class="input input-bordered w-full max-w-xs" />
			</div>
			<div class="mb-4 flex items-center">
				<label for="user_password" class="mr-2">Contraseña:</label>
				<input
					type="password"
					bind:value={user_password}
					class="input input-bordered w-full max-w-xs"
				/>
			</div>
		</section>
	{/if}

	<button class="btn btn-accent" on:click={step == 0 ? handleNextStep() : handlePrevStep()}
		>{step == 0 ? 'Siguiente' : 'Anterior'}</button
	>
	<button
		class="btn btn-primary"
		on:click={step == 1 && (edit == true ? handleUpdateObject() : handleCreateObject())}
		>Guardar</button
	>
	<button class="btn btn-secondary" on:click={close}>Cancelar</button>
</form>
