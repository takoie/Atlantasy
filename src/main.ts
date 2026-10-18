// Fonten ligger i appen (ikke Google Fonts), så den alltid lastes – også offline og i Tauri.
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import '@fontsource/public-sans/800.css';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Fant ikke #app element i DOM');
}

const app = mount(App, {
  target,
});

export default app;
