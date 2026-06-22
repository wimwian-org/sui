<script lang="ts">
</script>

<div class="max-w-2xl mx-auto space-y-8">
  <h1 class="heading-2xl">@wimwian-org/sui playground</h1>
  <p class="text-c-600">
    Component demos will appear here as bits are added to <code>components/</code>.
  </p>

  <section>
    <h2 class="heading-md mb-4">Colour palette</h2>
    <div class="grid grid-cols-11 gap-1">
      {#each [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as step (step)}
        <div class="flex flex-col items-center gap-1">
          <div
            class="w-8 h-8 rounded"
            style="background: var(--color-primary-{step});"
            title="primary-{step}"
          ></div>
          <span class="text-xs text-c-600">{step}</span>
        </div>
      {/each}
    </div>
  </section>
</div>
