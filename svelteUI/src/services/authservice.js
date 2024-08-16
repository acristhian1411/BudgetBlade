import { goto } from "$app/navigation";
// import  jsonwebtoken from 'jsonwebtoken';
import * as jose from 'jose';
import { PUBLIC_JWT_SECRET } from '$env/static/public';

export async function login(email, password) {
    const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (response.ok) {
        localStorage.setItem('token', data.token);
        goto('/');
    } else {
        throw new Error(data.message);
    }
}


export function logout() {
    localStorage.removeItem('token');
    goto('/login');
}

export function getToken() {
    return localStorage.getItem('token');
}

export function getUserData(){
    let token = localStorage.getItem('token');
    let decoded = jose.decodeJwt(token);
    return decoded;
}

export function isLoggedIn() {
    return !!localStorage.getItem('token');
}
