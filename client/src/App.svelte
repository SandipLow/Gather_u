<script lang="ts">
    import { Router, Route } from "svelte-routing";
    import Home from "./pages/Home.svelte";
    import Auth from "./pages/Auth.svelte";
    import Game from "./pages/Game.svelte";
    import AuthenticatedPage from "./components/AuthenticatedPage.svelte";
</script>

<Router>
    <Route path="/">
        <AuthenticatedPage>
            <Game />
        </AuthenticatedPage>
    </Route>

    <Route path="/auth">
        <Auth />
    </Route>

</Router>
