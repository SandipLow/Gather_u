<script lang="ts">
    import Modal from "./Modal.svelte";
    
    // Modal state

    export let showModal = false;
    export let closeModal = () => {};

    // Handle login form submission
    function handleLogin(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        const username = formData.get("username");
        const password = formData.get("password");

        // Handle login logic here
        if (!username) {
            alert("Please enter a username");
            return;
        }
        if (password==="CDEK2021") {
            localStorage.setItem("user_id", username.toString());
        }

        // Close the modal after login
        closeModal();
    }


</script>

<style>
    .modal-header {
        font-size: 1.5rem;
        font-weight: bold;
        padding: 1rem;
        border-bottom: 1px solid #ddd;
    }

    .modal-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .modal-form input {
        padding: 0.75rem;
        font-size: 1rem;
        border-radius: 4px;
        border: 1px solid #ddd;
    }

    .modal-form button {
        padding: 0.75rem 1.25rem;
        font-size: 1rem;
        border-radius: 4px;
        border: none;
        cursor: pointer;
    }

    .modal-form button[type="submit"] {
        background-color: #28a745;
        color: white;
    }

    .modal-form button[type="submit"]:hover {
        background-color: #218838;
    }

    .modal-form button[type="button"] {
        background-color: #dc3545;
        color: white;
    }

    .modal-form button[type="button"]:hover {
        background-color: #c82333;
    }
</style>

<Modal show={showModal} close={closeModal}>
    <div class="modal-header">Login</div>
    <form class="modal-form" on:submit={handleLogin}>
        <input type="text" name="username" placeholder="Username" required />
        <input type="password" name="password" placeholder="Password" required />
        <div style="display: flex; justify-content: space-between;">
            <button type="button" on:click={closeModal}>Cancel</button>
            <button type="submit">Log In</button>
        </div>
    </form>
</Modal>