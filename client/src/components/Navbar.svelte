<script>
    import LoginModal from "./LoginModal.svelte";
    import { onMount } from "svelte";

    let user_id = localStorage.getItem("user_id");
    let loggedIn = user_id !== null;
    
    let showModal = false;
    let openModal = () => {
        showModal = true;
    };
    let closeModal = () => {
        showModal = false;
    };

    // Ensure the modal state is reset when the component is mounted
    onMount(() => {
        showModal = false;
    });
</script>
  
<style>
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background-color: #333;
      color: #fff;
    }
  
    .nav-links {
      display: flex;
      gap: 1rem;
    }
  
    .nav-links a {
      color: #fff;
      text-decoration: none;
      padding: 0.5rem 1rem;
    }
  
    .nav-links a:hover {
      background-color: #555;
      border-radius: 4px;
    }
  
    .avatar-button {
      background-color: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  
    .avatar-button img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
    }
  
    .avatar-button:hover {
      background-color: #555;
      border-radius: 4px;
    }
  
    .login-button {
      background-color: #008CBA;
      border: none;
      color: white;
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: 4px;
    }
  
    .login-button:hover {
      background-color: #005f7f;
    }
</style>
  
<nav>
    <div class="nav-links">
        <a href="/play">Play</a>
        <a href="/about">About</a>
        <a href="/help">Help</a>
    </div>
  
    <div>
        {#if loggedIn}
            <!-- Avatar Button -->
            <button class="avatar-button" on:click={()=>{}}>
                <img src="https://via.placeholder.com/30" alt="Avatar" />
                <span>Profile</span>
            </button>
        {:else}
            <!-- Login Button -->
            <button class="login-button" on:click={openModal}>Log In</button>
        {/if}
    </div>

</nav>

<LoginModal {showModal} {closeModal} />