<!-- Modal.svelte -->
<script>
  export let show = false; // Controls visibility of the modal
  export let close = () => {}; // Callback function to close the modal
</script>

<style>
  /* Modal overlay */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  /* Modal box */
  .modal {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    max-width: 400px;
    width: 100%;
    z-index: 1001;
  }
</style>

{#if show}
  <div class="modal-overlay" on:click={close}>
    <div class="modal" on:click|stopPropagation>
      <slot></slot> <!-- Slot for passing content from parent -->
    </div>
  </div>
{/if}
