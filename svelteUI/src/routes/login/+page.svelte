<script>
	import { auth } from '../../stores/auth';
	import { onMount } from 'svelte';
	import axios from 'axios';

	let username = '';
	let password = '';

	onMount(() => {
		console.log('login', auth);
		auth.update((state) => ({ ...state, isLoading: false, error: null }));
	});
	/**
	 * @param {string} username
	 * @param {string} password
	 */
	async function handleLogin(username, password) {
		console.log('login', username + password);
		// try {
		//change this petition to axios

		//
		const response = await axios.post('http://localhost:3000/api/auth/login', {
			username,
			password
		});

		if (!response) {
			throw new Error('Login failed');
		}

		const data = await response.data;

		auth.update((state) => ({
			...state,
			user: data.user,
			accessToken: data.accessToken,
			refreshToken: data.refreshToken,
			isLoading: false,
			error: null
		}));
		// } catch (error) {
		// 	auth.update((state) => ({ ...state, isLoading: false, error: error.message }));
		// }
	}
</script>

<form>
	<input type="text" bind:value={username} placeholder="Username" />
	<input type="password" bind:value={password} placeholder="Password" />
	<button type="submit" on:click={() => handleLogin(username, password)}>Login</button>
	{#if auth.error}
		<p style="color: red">{auth.error}</p>
	{/if}
</form>
