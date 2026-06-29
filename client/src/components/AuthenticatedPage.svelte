<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { authState } from '../lib/auth.svelte'; // Adjust the import path as needed

  // Define properties using Svelte Runes
  let { children }: { children: Snippet } = $props();

  onMount(() => {
    // If not authenticated, kick the user out to the login page immediately
    if (!authState.isAuthenticated) {
      window.location.replace('/auth');
    }
  });
</script>

{#if authState.isAuthenticated}
  {@render children()}
{/if}
