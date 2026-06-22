<script lang="ts">
  import '../app.css';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let theme = $state<'light' | 'dark'>('light');

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  }
</script>

<div class="min-h-screen" style="background: var(--page-bg); color: var(--page-fg);">
  <header class="border-b px-6 py-3 flex items-center justify-between" style="border-color: var(--page-border);">
    <span class="subtitle-md text-c-700">@wimwian-org/sui</span>
    <button
      class="theme-toggle px-3 py-1 rounded text-sm"
      style="background: var(--canvas-bg); color: var(--canvas-fg); border: 1px solid var(--canvas-border);"
      onclick={toggleTheme}
    >
      {theme === 'light' ? '☾ Dark' : '☀ Light'}
    </button>
  </header>

  <main class="p-8">
    {@render children()}
  </main>
</div>
