<template>
  <main class="workspace-shell" aria-labelledby="workspace-title">
    <header class="workspace-shell__header">
      <p class="workspace-shell__eyebrow">Browser-only music workspace</p>
      <h1 id="workspace-title">Infinite Flow</h1>
      <p class="workspace-shell__lede">A quiet place for a four-measure musical idea.</p>
    </header>

    <section class="workspace-shell__surface" aria-labelledby="phrase-title">
      <p class="workspace-shell__eyebrow">Phrase workspace</p>
      <h2 id="phrase-title">Four-measure phrase</h2>
      <p>Generate a phrase to begin.</p>
      <p class="workspace-shell__status" role="status" aria-live="polite" aria-atomic="true">
        Workspace ready.
      </p>
    </section>
  </main>
</template>
