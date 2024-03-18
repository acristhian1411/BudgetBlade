<script>
	import { login } from '../../services/auth';
	let email = '';
	let password = '';
	let error;
	async function handleLogin() {
		try {
			await login();
		} catch (err) {
			error = err;
		}
	}
</script>

{#if error}
	<p>{error}</p>
{/if}
<form on:submit|preventDefault={handleLogin} class="mx-auto max-w-md">
	<div class="mb-4">
		<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
		<input
			type="email"
			id="email"
			bind:value={email}
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
			required
		/>
	</div>
	<div class="mb-4">
		<label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
		<input
			type="password"
			id="password"
			bind:value={password}
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
			required
		/>
	</div>
	<button
		type="submit"
		class="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
	>
		Iniciar sesión
	</button>
</form>
