import { fetchUserData, login } from "../lib/api";

export default class MainMenuScene extends Phaser.Scene {
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

        // Check for authentication
        const auth = localStorage.getItem("auth");
        if (!auth) {
            // create elements
            const emailInputElement = document.createElement('input');
            emailInputElement.type = 'email';
            emailInputElement.placeholder = 'Enter email';
            emailInputElement.style = 'width: 280px; padding: 10px; font-size: 16px; background-color: #333333; color: #ffffff; border: none;';
            
            const passwordInputElement = document.createElement('input');
            passwordInputElement.type = 'password';
            passwordInputElement.placeholder = 'Enter password';
            passwordInputElement.style = 'width: 280px; padding: 10px; font-size: 16px; background-color: #333333; color: #ffffff; border: none;';

            const loginButtonElement = document.createElement('button');
            loginButtonElement.textContent = 'Login';
            loginButtonElement.style = 'width: 100px; padding: 10px; font-size: 16px; background-color: #00aaff; color: #ffffff; border: none; cursor: pointer;';


            // Create login interface using native HTML input elements
            const loginContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
            const emailInput = this.add.dom(0, -50, emailInputElement).setOrigin(0.5);
            const passwordInput = this.add.dom(0, 0, passwordInputElement).setOrigin(0.5);
            const loginButton = this.add.dom(0, 50, loginButtonElement).setOrigin(0.5);

            // Add elements to container
            loginContainer.add([emailInput, passwordInput, loginButton]);

            // Login button handling
            loginButtonElement.addEventListener('click', async () => {
                const email = (emailInputElement as HTMLInputElement).value;
                const password = (passwordInputElement as HTMLInputElement).value;
                try {
                    await login(email, password);
                    // Clean up DOM elements
                    emailInputElement.remove();
                    passwordInputElement.remove();
                    loginButtonElement.remove();
                    // Reload the scene after successful login
                    this.scene.restart();
                } catch (error) {
                    // Display error message
                    this.add.text(this.scale.width / 2, 300, 'Login failed. Please try again.', {
                        fontSize: '16px',
                        color: '#ff0000',
                    }).setOrigin(0.5);
                }
            });

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
                this.scene.start('CityScene', player);
            });

            yOffset += 50; // Adjust spacing between world options
        });

        // Log out Button
        const logoutButton = this.add.text(this.scale.width - 10, 50, 'Logout', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0);
        logoutButton.setInteractive();

        logoutButton.on('pointerdown', () => {
            localStorage.removeItem("auth");
            this.scene.restart(); // Reload the main menu scene
        });
    }

    // Update loop (for animations or real-time logic)
    update(time: number, delta: number): void {
        // Add any animations or background updates here if needed
    }
}