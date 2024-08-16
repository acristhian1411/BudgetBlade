<script>
	// import { auth } from '../../stores/auth';
	import { onMount } from 'svelte';
	import { login } from '../../services/authservice';
	import axios from 'axios';

	let email = '';
	let password = '';
	let showPassword = false;
	let error;
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
	onMount(() => {
		// console.log('login', auth);
		// auth.update((state) => ({ ...state, isLoading: false, error: null }));
	});
	/**
	 * @param {string} email
	 * @param {string} password
	 */
	async function handleLogin(email, password) {
		try {
            await login(email, password);
            error = '';
            // Redirigir a otra página o hacer algo después del login
        } catch (err) {
            error = err.message;
        }
		
	}
</script>
<style>
	.password-container {
	  position: relative;
	  display: flex;
	  align-items: center;
	}
  
	.password-input {
	  padding-right: 40px;
	  width: 100%;
	}
  
	.toggle-button {
	  position: absolute;
	  right: 10px;
	  background: none;
	  border: none;
	  cursor: pointer;
	}
  </style>
<form>
	<input type="email" bind:value={email} placeholder="email" />
	<div class="password-container">
		{#if showPassword}
			<input
			class="password-input"
			type="text"
			bind:value={password}
			placeholder="Password"
			/>
		{:else}
			<input
			class="password-input"
			type="password"
			bind:value={password}
			placeholder="Password"
			/>
		{/if}
		<button type="button" class="toggle-button" on:click={togglePasswordVisibility}>
		  {showPassword ? '🙈' : '👁️'}
		</button>
	  </div>
	<button type="submit" on:click={() => handleLogin(email, password)}>Login</button>
</form>
