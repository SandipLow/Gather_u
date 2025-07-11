import { fetchUserData } from "../lib/api";

export default class MainMenuScene extends Phaser.Scene {
    private user_id: string | null = null;

    constructor() {
        super('MainMenuScene'); // Scene key
    }

    async create() {
        // Set a solid color background
        this.cameras.main.setBackgroundColor('#222222');

        this.add.text(this.scale.width / 2, 50, 'Welcome to the GATHER U', {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5, 0);

        this.add.text(this.scale.width / 2, 200, 'Main Menu', {
            fontSize: '16px',
            color: '#ffffff',
        }).setOrigin(0.5, 0);

        // Prompt for user ID and fetch user data
        this.user_id = localStorage.getItem("user_id")
        if (!this.user_id) {
            // render a text showing user not logged in
            this.add.text(this.scale.width / 2, this.scale.height / 2, `User not logged in`, {
                fontSize: '16px',
                color: '#ffffff',
            }).setOrigin(0.5, 0.5);
            return;
        }

        const userData = await fetchUserData();

        // Extract worlds (formerly 'players') from user data
        const { players } = userData;

        // Display title and instructions
        this.add.text(this.scale.width / 2, 250, `Select a World to Enter`, {
            fontSize: '16px',
            color: '#ffffff',
        }).setOrigin(0.5, 0.5);

        // Display each world as a selectable option with a colored rectangle as a button
        let yOffset = 300; 
        players.forEach((player: any) => {
            const { name, wealth, world } = player;

            // Display world name as text
            const worldText = this.add.text(100, yOffset, `🌏 ${world.name} ( ${name} has $${wealth} )`, {
                fontSize: '16px',
                color: '#ffffff'
            });

            // Create a solid color rectangle as the selection button
            const selectButton = this.add.rectangle(500, yOffset + 10, 100, 30, 0x00aaff)
                .setInteractive()
                .setOrigin(0.5);

            // Label the button
            this.add.text(selectButton.x, selectButton.y, 'Select', {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5);

            // Handle button click to enter the world
            selectButton.on('pointerdown', () => {
                this.startWorld(player);
            });

            yOffset += 50; // Adjust spacing between world options
        });
    }

    // Start the selected world
    startWorld(player: any) {
        // Pass the world data to the CityScene
        this.scene.start('CityScene', player);
    }

    // Update loop (for animations or other real-time logic)
    update(time: number, delta: number): void {
        // Add any animations or background updates here if needed
    }
}
