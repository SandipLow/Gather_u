<script lang="ts">
    import { Router, Route } from "svelte-routing";
    import Auth from "./pages/Auth.svelte";
    import Game from "./pages/Game.svelte";
    import CreatePlayer from "./pages/CreatePlayer.svelte";
    import AuthenticatedPage from "./components/AuthenticatedPage.svelte";
    import MainMenu from "./pages/MainMenu.svelte";
    import Guest from "./pages/Guest.svelte";
</script>

<Router>
    <Route path="/">
        <AuthenticatedPage>
            <MainMenu />
        </AuthenticatedPage>
    </Route>

    <Route path="/create-player">
        <AuthenticatedPage>
            <CreatePlayer />
        </AuthenticatedPage>
    </Route>

    <Route path="/game">
        <Game />
    </Route>

    <Route path="/guest">
        <Guest />
    </Route>

    <Route path="/auth">
        <Auth />
    </Route>

</Router>
