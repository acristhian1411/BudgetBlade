<script lang="ts">
	import { onMount } from 'svelte';
	import axios from 'axios';
	let data: { id: number; TILL_NAME: string }[] = [];
	let error: any = null;

	function fetchData() {
		axios
			// .get('/api/tills')
			.get('http://localhost:3000/api/tills')
			.then((response) => {
				data = response.data.results;
				console.log(data);
			})
			.catch((err) => {
				error = err;
			});
	}

	onMount(async () => {
		fetchData();
	});
</script>

{#if error}
	<p>{error}</p>
{/if}
<h2 class="text-center">Cajas</h2>
{#if data}
	<div class="overflow-x-auto">
		<table class="table w-full">
			<thead>
				<tr>
					<th>ID</th>
					<th>Descripcion</th>
				</tr>
			</thead>
			<tbody>
				{#each data as till (till.id)}
					<tr class="hover">
						<td>{till.id}</td>
						<td>{till.TILL_NAME}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
