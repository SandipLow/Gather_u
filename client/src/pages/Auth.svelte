<script lang="ts">
    import { navigate } from "svelte-routing";
    import { authState } from "../lib/auth.svelte";

    let user: any | null = null;
    let loading = false;
    let errorMessage = "";
    let isRegistering = false;

    if (authState.isAuthenticated) {
        authState.getUserData()
            .then((userData) => {
                user = userData;
            })
            .catch((error) => {
                console.error("Error fetching user data:", error);
            });
    }

    async function handleLogin(e: SubmitEvent) {
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        loading = true;
        errorMessage = "";

        try {
            await authState.login(email, password);
            user = await authState.getUserData();
        } catch (error) {
            console.error("Login failed:", error);
            errorMessage = "Invalid email or password.";
        } finally {
            loading = false;
        }
    }

    async function handleRegister(e: SubmitEvent) {
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        loading = true;
        errorMessage = "";

        try {
            await authState.register(name, email, password);
            user = await authState.getUserData();
        } catch (error) {
            console.error("Register failed:", error);
            errorMessage = "Registration failed.";
        } finally {
            loading = false;
        }
    }
</script>

<main>
    <div class="auth-card">

        {#if authState.isAuthenticated}
            <div class="welcome">
                <div class="avatar">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>

                <h1>Welcome back 👋</h1>

                <p>
                    Logged in as 
                    <strong>{user?.name || "Unnamed"}</strong>
                </p>

                <button class="logout" on:click={() => authState.logout()}>
                    Logout
                </button>

                <button class="play" on:click={() => navigate("/")}>
                    Play
                </button>
            </div>

        {:else}

            <div class="header">
                <h1>
                    {isRegistering ? "Create Account" : "Login"}
                </h1>

                <p>
                    {isRegistering
                        ? "Register to get started"
                        : "Sign in to continue"}
                </p>
            </div>

            {#if errorMessage}
                <div class="error">
                    {errorMessage}
                </div>
            {/if}

            <form 
                on:submit|preventDefault={isRegistering ? handleRegister : handleLogin}
            >

                {#if isRegistering}
                    <div class="field">
                        <label for="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="Your name"
                            required
                        />
                    </div>
                {/if}


                <div class="field">
                    <label for="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="you@example.com"
                        required
                    />
                </div>


                <div class="field">
                    <label for="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        required
                    />
                </div>


                <button class="login" type="submit" disabled={loading}>
                    {loading
                        ? (isRegistering ? "Creating..." : "Logging in...")
                        : (isRegistering ? "Register" : "Login")}
                </button>


                <button
                    type="button"
                    class="switch"
                    on:click={() => {
                        isRegistering = !isRegistering;
                        errorMessage = "";
                    }}
                >
                    {isRegistering
                        ? "Already have an account? Login"
                        : "Need an account? Register"}
                </button>

            </form>

        {/if}

    </div>
</main>

<style>
    main {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        background:
            radial-gradient(circle at top, #1e293b, #020617 60%);
        font-family: "Inter", system-ui, sans-serif;
        overflow: hidden;
    }

    main::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
            linear-gradient(
                90deg,
                transparent 95%,
                rgba(0,255,255,.08) 100%
            );
        background-size: 40px 40px;
        pointer-events: none;
    }


    .auth-card {
        width: 100%;
        max-width: 430px;
        padding: 40px;
        border-radius: 20px;

        background:
            rgba(15,23,42,.85);

        backdrop-filter: blur(15px);

        border:
            1px solid rgba(0,255,255,.25);

        box-shadow:
            0 0 40px rgba(0,255,255,.15),
            inset 0 0 30px rgba(255,0,255,.05);

        animation: powerUp .5s ease;
    }


    .header {
        text-align: center;
        margin-bottom: 30px;
    }


    h1 {
        margin: 0;

        color: #fff;

        font-size: 34px;
        font-weight: 900;

        text-transform: uppercase;

        letter-spacing: 2px;

        text-shadow:
            0 0 10px #00ffff;
    }


    .header p {
        color: #94a3b8;
        margin-top: 10px;
    }


    .field {
        margin-bottom: 18px;
    }


    label {
        display: block;

        margin-bottom: 8px;

        color: #38bdf8;

        font-size: 13px;

        text-transform: uppercase;

        letter-spacing: 1px;
    }


    input {

        width: 100%;

        box-sizing: border-box;

        padding: 15px;

        border-radius: 10px;

        border:
            1px solid #334155;

        background:
            #020617;

        color: white;

        font-size: 15px;

        transition: .2s;
    }


    input:focus {

        outline: none;

        border-color:#00ffff;

        box-shadow:
            0 0 15px rgba(0,255,255,.4);
    }


    button {

        width:100%;

        padding:15px;

        border-radius:12px;

        border:none;

        cursor:pointer;

        font-size:16px;

        font-weight:800;

        text-transform:uppercase;

        letter-spacing:1px;

        transition:.2s;
    }


    .login {

        background:
            linear-gradient(
                90deg,
                #06b6d4,
                #8b5cf6
            );

        color:white;

        box-shadow:
            0 0 20px rgba(139,92,246,.5);
    }


    .login:hover {

        transform:
            translateY(-2px);

        box-shadow:
            0 0 30px rgba(0,255,255,.8);
    }


    .switch {

        margin-top:15px;

        background:none;

        color:#38bdf8;

        font-size:13px;
    }


    .switch:hover {

        color:white;
    }


    .error {

        background:
            rgba(255,0,80,.15);

        border:
            1px solid #ff0055;

        color:#ff6688;

        padding:12px;

        border-radius:10px;

        margin-bottom:20px;

        text-align:center;
    }


    /* Logged in */

    .welcome {

        text-align:center;
    }


    .avatar {

        width:90px;

        height:90px;

        margin:auto;

        border-radius:50%;

        display:flex;

        justify-content:center;

        align-items:center;

        background:
            linear-gradient(
                135deg,
                #06b6d4,
                #8b5cf6
            );


        color:white;

        font-size:38px;

        font-weight:900;

        box-shadow:
            0 0 30px #06b6d4;
    }


    .welcome p {

        color:#cbd5e1;

        margin:20px 0;
    }


    .play {

        margin-top:15px;

        background:
            linear-gradient(
                90deg,
                #22c55e,
                #16a34a
            );

        color:white;

        box-shadow:
            0 0 20px rgba(34,197,94,.5);
    }


    .logout {

        background:#ef4444;

        color:white;

        margin-top:20px;
    }


    .logout:hover,
    .play:hover {

        transform:
            translateY(-2px);
    }


    @keyframes powerUp {

        from {

            opacity:0;

            transform:
                scale(.9)
                translateY(30px);
        }

        to {

            opacity:1;

            transform:
                scale(1)
                translateY(0);
        }
    }

</style>