import { fetchUserData, login } from "../lib/api";

export default class MainMenuScene extends Phaser.Scene {
    private loginContainer?: Phaser.GameObjects.Container;
    private elementsToUpdateOnResize: (() => void)[] = [];

    constructor() {
        super('MainMenuScene');
    }

    async create() {
        this.cameras.main.setBackgroundColor('#222');

        const title = this.add.text(this.scale.width / 2, 40, 'Welcome to the GATHER U', {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5, 0);

        const subtitle = this.add.text(this.scale.width / 2, 100, 'Main Menu', {
            fontSize: '16px',
            color: '#cccccc',
        }).setOrigin(0.5, 0);

        // Reposition on resize
        this.scale.on('resize', this.handleResize, this);
        this.elementsToUpdateOnResize.push(() => {
            title.setPosition(this.scale.width / 2, 40);
            subtitle.setPosition(this.scale.width / 2, 100);
        });

        const auth = localStorage.getItem("auth");
        if (!auth) {
            this.showLoginUI();
            return;
        }

        const userData = await fetchUserData();
        this.showWorldSelection(userData.players);
    }

    private showLoginUI() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'Enter email';
        emailInput.style.cssText = 'width: 280px; padding: 10px; font-size: 16px; background: #333; color: #fff; border: none;';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Enter password';
        passwordInput.style.cssText = 'width: 280px; padding: 10px; font-size: 16px; background: #333; color: #fff; border: none;';

        const loginButton = document.createElement('button');
        loginButton.textContent = 'Login';
        loginButton.style.cssText = 'width: 120px; padding: 10px; font-size: 16px; background: #00aaff; color: white; border: none; cursor: pointer;';

        const emailDom = this.add.dom(0, -60, emailInput).setOrigin(0.5);
        const passwordDom = this.add.dom(0, 0, passwordInput).setOrigin(0.5);
        const buttonDom = this.add.dom(0, 60, loginButton).setOrigin(0.5);

        this.loginContainer = this.add.container(centerX, centerY, [emailDom, passwordDom, buttonDom]);

        loginButton.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            try {
                await login(email, password);
                emailInput.remove();
                passwordInput.remove();
                loginButton.remove();
                this.scene.restart();
            } catch (err) {
                this.add.text(this.scale.width / 2, centerY + 120, 'Login failed. Try again.', {
                    fontSize: '16px',
                    color: '#ff0000'
                }).setOrigin(0.5);
            }
        });

        // Reposition on resize
        this.elementsToUpdateOnResize.push(() => {
            this.loginContainer?.setPosition(this.scale.width / 2, this.scale.height / 2);
        });
    }

    private showWorldSelection(players: any[]) {
        const centerX = this.scale.width / 2;

        const instruction = this.add.text(centerX, 150, 'Select a World to Enter', {
            fontSize: '18px',
            color: '#ffffff',
        }).setOrigin(0.5);
        this.elementsToUpdateOnResize.push(() => {
            instruction.setPosition(this.scale.width / 2, 150);
        });

        let yOffset = 200;
        players.forEach((player: any) => {
            const { name, wealth, world } = player;

            const label = this.add.text(centerX - 150, yOffset, `🌍 ${world.name} (${name} has $${wealth})`, {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);

            const button = this.add.rectangle(centerX + 180, yOffset, 100, 30, 0x00aaff)
                .setInteractive()
                .setOrigin(0.5);

            const btnText = this.add.text(button.x, button.y, 'Enter', {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5);

            button.on('pointerdown', () => {
                this.scene.start('CityScene', player);
            });

            yOffset += 50;

            this.elementsToUpdateOnResize.push(() => {
                label.setPosition(this.scale.width / 2 - 150, label.y);
                button.setPosition(this.scale.width / 2 + 180, button.y);
                btnText.setPosition(button.x, button.y);
            });
        });

        const logoutButton = this.add.text(this.scale.width - 20, 20, 'Logout', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#ff4444',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0).setInteractive();

        logoutButton.on('pointerdown', () => {
            localStorage.removeItem("auth");
            this.scene.restart();
        });

        this.elementsToUpdateOnResize.push(() => {
            logoutButton.setPosition(this.scale.width - 20, 20);
        });
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        // Just reposition UI elements; do NOT call resize here
        this.elementsToUpdateOnResize.forEach(fn => fn());
    }
}
