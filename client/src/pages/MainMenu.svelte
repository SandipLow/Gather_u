<script lang="ts">
    import { Link, navigate } from "svelte-routing";
    import { authState } from "../lib/auth.svelte";

    let user: any = null;
    let players: any[] = [];
    let loading = true;
    let error = "";

    async function loadUser() {
        try {
            user = await authState.getUserData();
            players = user.players || [];
        } catch (err) {
            console.error(err);
            error = "SERVER ERROR";
        } finally {
            loading = false;
        }
    }

    loadUser();

    function enterWorld(player: any) {
        navigate("/game", {
            state: player
        });
    }

    function logout() {
        authState.logout();
    }
</script>

<main>
    <div class="stars"></div>

    <header>
        <h1>⚡ GATHER U ⚡</h1>
        <p>SELECT YOUR WORLD</p>
    </header>

    {#if loading}
        <div class="message">
            LOADING WORLDS...
        </div>

    {:else if error}
        <div class="message error">
            {error}
        </div>

    {:else}

        <section class="worlds">

            {#each players as player}

                <div class="card">

                    <div>
                        <h2>
                            🌍 {player.world.name}
                        </h2>

                        <p>
                            👤 {player.name}
                        </p>

                        <span>
                            💰 ${player.wealth}
                        </span>
                    </div>

                    <button on:click={() => enterWorld(player)}>
                        ENTER
                    </button>

                </div>

            {/each}


            {#if players.length === 0}
                <div class="message">
                    NO PLAYERS AVAILABLE
                </div>
            {/if}


            <button
                class="create"
                on:click={() => navigate("/create-player")}
            >
                + CREATE NEW PLAYER
            </button>

        </section>

    {/if}


    {#if user}

        <div class="hud">
            
            <div class="user">
                <Link to="/auth">
                    👤 {user.name}
                </Link>
            </div>

            <button
                class="logout"
                on:click={logout}
            >
                LOGOUT
            </button>

        </div>

    {/if}

</main>


<style>
    main {
        min-height: 100vh;
        padding: 30px;
        color: white;
        font-family: Inter, system-ui;
        background:
            radial-gradient(
                circle at top,
                #1e293b,
                #020617
            );
        overflow: hidden;
    }

    .stars {
        position: fixed;
        inset: 0;
        background-image:
            radial-gradient(
                white 1px,
                transparent 1px
            );
        background-size: 45px 45px;
        opacity: .15;
        z-index: -1;
    }

    header {
        text-align: center;
    }

    h1 {
        margin: 20px 0;
        font-size: 52px;
        color: #00ffff;
        text-shadow: 0 0 15px #00ffff;
    }

    header p {
        color: #94a3b8;
        letter-spacing: 5px;
    }

    .worlds {
        max-width: 600px;
        margin: 60px auto;
    }

    .card {
        display: flex;
        justify-content: space-between;
        align-items: center;

        padding: 25px;
        margin-bottom: 20px;

        border-radius: 18px;

        background:
            rgba(15,23,42,.8);

        border:
            1px solid rgba(0,255,255,.3);

        transition: .2s;
    }

    .card:hover {
        transform: translateY(-5px);
        border-color: #00ffff;
    }

    h2 {
        margin: 0;
    }

    .card p {
        color: #94a3b8;
    }

    span {
        color: #22c55e;
    }

    button {
        border: none;
        padding: 14px 25px;
        border-radius: 12px;

        cursor: pointer;

        font-weight: 900;
        color: white;

        background:
            linear-gradient(
                90deg,
                #06b6d4,
                #8b5cf6
            );

        transition: .2s;
    }

    button:hover {
        transform: scale(1.05);
    }

    .create {
        width: 100%;
        margin-top: 20px;

        background:
            linear-gradient(
                90deg,
                #22c55e,
                #16a34a
            );
    }

    .hud {
        position: fixed;
        top: 25px;
        left: 25px;
        right: 25px;

        display: flex;
        justify-content: space-between;
    }

    .user {
        padding: 12px 20px;
        border-radius: 12px;

        background: #111827;

        border:
            1px solid #8b5cf6;
    }

    .logout {
        background: #ef4444;
    }

    .message {
        margin-top: 100px;
        text-align: center;
        font-size: 22px;
    }

    .error {
        color: #ff5555;
    }
</style>