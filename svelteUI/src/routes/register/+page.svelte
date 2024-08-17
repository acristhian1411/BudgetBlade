<script>
    import { onMount } from 'svelte';
    import axios from 'axios';
    import { PUBLIC_APP_URL } from '$env/static/public';

    let username = '';
    let password = '';
    let email = '';

    onMount(() => {
        // console.log('login', auth);
        // auth.update((state) => ({ ...state, isLoading: false, error: null }));
    });
    function handleRegister(username, password, email) {
        console.log('register', username + password + email);
        axios.post(`${PUBLIC_APP_URL}/api/auth/register`, {
            username,
            password,
            email,
            person_id:1
        });
    }
</script>
<div>
    <form>
        <input type="text" bind:value={username} placeholder="Username" />
        <input type="password" bind:value={password} placeholder="Password" />
        <input type="email" bind:value={email} placeholder="Email" />
        <button type="submit" on:click={() => handleRegister(username, password, email)}>Register</button>
    </form>
</div>