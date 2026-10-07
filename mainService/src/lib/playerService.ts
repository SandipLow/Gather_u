export interface PlayerPosition {
    x: number;
    y: number;
}

export interface CarPosition {
    x: number;
    y: number;
    angle: number;
}

export interface PlayerDataMsg {
    id: string;
    name: string;
    spritesheet: string;
    wealth: number;
    checkpoint: PlayerPosition;
    position: PlayerPosition;
    animation: string;
    timestamp: number;
    isDriving?: string;
}

export interface CarDataMsg {
    id: string;
    spriteKey: string;
    position: CarPosition;
    isDriving?: string;
    timestamp: number;
}

export interface EnterWorldResponse {
    self: PlayerDataMsg;
    players: PlayerDataMsg[];
    cars: CarDataMsg[];
}

export default interface PlayerService {

    /**
     * enter player to the world
     * @param playerId the player's id
     * @returns actual state of self, other players, and cars in the world
     */
    enterPlayerWorldAndGetOthers(playerId: string): Promise<EnterWorldResponse>;


    /**
     * leave player from the world
     * @param playerId the player's id
     * @returns list of players in the world
     */
    leavePlayerWorldAndGetOthers(playerId: string): Promise<string[]>;

    /** update the player's coordinates
     * @param playerId the player's id
     * @param x the new x coordinate
     * @param y the new y coordinate
     * @param animation the animation to play
     * @param timestamp the timestamp of the update
     * @returns list of player nearby the coordinate within viewport
     */
    setPlayerCoordinatesAndGetNears(playerId: string, x: number, y: number, animation: string, timestamp: number): Promise<string[]>;

    /** update the driving player's coordinates
     * @param playerId the player's id
     * @param carId the car's id
     * @param x the new x coordinate
     * @param y the new y coordinate
     * @param angle the car's angle
     * @param timestamp the timestamp of the update
     * @returns list of player nearby the coordinate within viewport
     */
    setDrivingPlayerCoordinatesAndGetNears(playerId: string, carId: string, x: number, y: number, angle: number, timestamp: number): Promise<string[]>;

    /**
     * get all other online players in the world
     * @param playerId the player's id
     * @returns list of other player ids
     */
    getAllOthersPlayersFromPlayerId(playerId: string): Promise<string[]>;

    /**
     * enter player into a car
     * @param playerId the player's id
     * @param carId the car's id
     * @returns list of other player ids
     */
    enterCarAndGetOthers(playerId: string, carId: string): Promise<string[]>;

    /**
     * leave player from a car
     * @param playerId the player's id
     * @param carId the car's id
     * @returns list of other player ids
     */
    leaveCarAndGetOthers(playerId: string, carId: string): Promise<string[]>;

}
