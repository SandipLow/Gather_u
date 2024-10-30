export default class MainMenuScene extends Phaser.Scene {
    private user_id: string | null = null;

    constructor() {
        super('MainMenuScene'); // Scene key
    }

    async create() {
        // Set a solid color background
        this.cameras.main.setBackgroundColor('#222222');

        // Prompt for user ID and fetch user data
        this.user_id = prompt('Enter your user ID');
        if (!this.user_id) {
            alert("User ID is required to proceed.");
            return;
        }

        const fetchUser = await fetch(`http://localhost:3000/user/${this.user_id}`);
        const userData = await fetchUser.json();

        // Extract worlds (formerly 'players') from user data
        const { players } = userData;

        // Display title and instructions
        this.add.text(this.scale.width / 2, 50, `Select a World to Enter`, {
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5, 0.5);

        // Display each world as a selectable option with a colored rectangle as a button
        let yOffset = 150; 
        players.forEach((player: any) => {
            const { name, wealth, world } = player;

            // Display world name as text
            const worldText = this.add.text(100, yOffset, `🌏 ${world.name} ( ${name} has $${wealth} )`, {
                fontSize: '12px',
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
