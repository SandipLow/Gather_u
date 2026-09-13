<script lang="ts">
    import { Router, Route } from "svelte-routing";
    import Auth from "./pages/Auth.svelte";
    import Game from "./pages/Game.svelte";
    import CreatePlayer from "./pages/CreatePlayer.svelte";
    import AuthenticatedPage from "./components/AuthenticatedPage.svelte";
    import MainMenu from "./pages/MainMenu.svelte";
    import Guest from "./pages/Guest.svelte";
    import LandscapePage from "./components/LandscapePage.svelte";
</script>

<Router>
    <Route path="/">
        <AuthenticatedPage>
            <LandscapePage>
                <MainMenu />
            </LandscapePage>
        </AuthenticatedPage>
    </Route>

    <Route path="/create-player">
        <AuthenticatedPage>
            <LandscapePage>
                <CreatePlayer />
            </LandscapePage>
        </AuthenticatedPage>
    </Route>

    <Route path="/game">
        <LandscapePage>
            <Game />
        </LandscapePage>
    </Route>

    <Route path="/guest">
        <LandscapePage>
            <Guest />
        </LandscapePage>
    </Route>

    <Route path="/auth">
        <Auth />
    </Route>

</Router>
