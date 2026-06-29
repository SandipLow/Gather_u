export default interface PlayerService {

    /**
     * enter player to the world
     * @param playerId the player's id
     * @returns list of players in the world
     */
    enterPlayerWorld(playerId: string): Promise<string[]>;


    /**
     * leave player from the world
     * @param playerId the player's id
     * @returns list of players in the world
     */
    leavePlayerWorld(playerId: string): Promise<string[]>;

    /** update the player's coordinates
     * @param playerId the player's id
     * @param x the new x coordinate
     * @param y the new y coordinate
     * @param animation the animation to play
     * @param timestamp the timestamp of the update
     * @returns list of player nearby the coordinate within viewport
     */
    setPlayerCoordinates(playerId: string, x: number, y: number, animation: string, timestamp: number): Promise<string[]>;

}