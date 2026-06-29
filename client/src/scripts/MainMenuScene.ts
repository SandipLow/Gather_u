import { navigate } from "svelte-routing";
import { authState } from "../lib/auth.svelte";


export default class MainMenuScene extends Phaser.Scene {

    private elementsToUpdateOnResize: (() => void)[] = [];


    constructor() {
        super("MainMenuScene");
    }


    create() {

        this.createBackground();


        const title = this.add.text(
            this.scale.width / 2,
            60,
            "⚡ GATHER U ⚡",
            {
                fontSize: "48px",
                color: "#00ffff",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 8
            }
        )
        .setOrigin(.5);


        this.tweens.add({
            targets:title,
            alpha:.7,
            duration:1200,
            yoyo:true,
            repeat:-1
        });



        const subtitle = this.add.text(
            this.scale.width / 2,
            120,
            "SELECT YOUR WORLD",
            {
                fontSize:"18px",
                color:"#94a3b8",
                // letterSpacing:5
            }
        )
        .setOrigin(.5);



        this.elementsToUpdateOnResize.push(()=>{

            title.setPosition(
                this.scale.width/2,
                60
            );

            subtitle.setPosition(
                this.scale.width/2,
                120
            );

        });



        authState.getUserData()

        .then(user=>{

            this.showWorldSelection(user.players);

            this.createPlayerHUD(user);

        })

        .catch(err=>{

            console.error(err);

            this.createError();

        });



        this.scale.on(
            "resize",
            this.handleResize,
            this
        );

    }



    private createBackground(){

        this.cameras.main.setBackgroundColor("#020617");


        for(let i=0;i<80;i++){

            const star=this.add.circle(
                Phaser.Math.Between(
                    0,
                    this.scale.width
                ),

                Phaser.Math.Between(
                    0,
                    this.scale.height
                ),

                2,

                0x00ffff,

                .5
            );


            this.tweens.add({

                targets:star,

                alpha:0,

                duration:
                    Phaser.Math.Between(
                        1000,
                        3000
                    ),

                yoyo:true,

                repeat:-1

            });

        }

    }




    private showWorldSelection(players:any[]){

        let y=200;


        players.forEach(player=>{


            const card =
            this.add.rectangle(

                this.scale.width/2,
                y,

                420,
                90,

                0x0f172a

            )
            .setStrokeStyle(
                2,
                0x00ffff
            )
            .setInteractive();



            const title =
            this.add.text(

                card.x-180,
                y-20,

                `🌍 ${player.world.name}`,

                {

                    fontSize:"22px",
                    color:"#ffffff",
                    fontStyle:"bold"

                }

            );



            const stats =
            this.add.text(

                card.x-180,
                y+15,

                `${player.name}  •  💰 $${player.wealth}`,

                {

                    fontSize:"14px",
                    color:"#94a3b8"

                }

            );




            const button =
            this.add.rectangle(

                card.x+140,
                y,

                100,
                40,

                0x22c55e

            )
            .setInteractive();



            const buttonText =
            this.add.text(

                button.x,
                button.y,

                "ENTER",

                {

                    fontSize:"14px",
                    color:"#ffffff",
                    fontStyle:"bold"

                }

            )
            .setOrigin(.5);



            card.on(
                "pointerover",
                ()=>{

                    card.setFillStyle(
                        0x1e293b
                    );

                    this.tweens.add({

                        targets:[card,button],

                        scale:1.05,

                        duration:150

                    });

                }
            );


            card.on(
                "pointerout",
                ()=>{

                    card.setFillStyle(
                        0x0f172a
                    );

                    this.tweens.add({

                        targets:[card,button],

                        scale:1,

                        duration:150

                    });

                }
            );



            button.on(
                "pointerdown",
                ()=>{

                    this.scene.start(
                        "CityScene",
                        player
                    );

                }
            );


            this.elementsToUpdateOnResize.push(()=>{

                card.setPosition(
                    this.scale.width/2,
                    card.y
                );

            });



            y+=120;

        });

    }




    private createPlayerHUD(user:any){

        const hud =
        this.add.rectangle(
            120,
            40,
            220,
            55,
            0x111827
        )
        .setStrokeStyle(
            1,
            0x8b5cf6
        );


        this.add.text(

            30,
            25,

            `👤 ${user.name}`,

            {

                fontSize:"18px",
                color:"#ffffff"

            }

        );



        const logout =
        this.add.text(

            this.scale.width-30,
            30,

            "LOGOUT",

            {

                fontSize:"16px",
                color:"#ff5555",
                backgroundColor:"#111827",
                padding:{
                    x:12,
                    y:8
                }

            }

        )

        .setOrigin(1,0)

        .setInteractive();



        logout.on(
            "pointerdown",
            ()=>{

                authState.logout();

                navigate(
                    "/auth",
                    {
                        replace:true
                    }
                );

            }
        );


        this.elementsToUpdateOnResize.push(()=>{

            logout.setPosition(
                this.scale.width-30,
                30
            );

        });

    }





    private createError(){

        this.add.text(

            this.scale.width/2,
            this.scale.height/2,

            "SERVER ERROR\nTRY AGAIN",

            {

                fontSize:"24px",
                color:"#ff5555",
                align:"center"

            }

        )
        .setOrigin(.5)

        .setInteractive()

        .on(
            "pointerdown",
            ()=>this.scene.restart()
        );

    }



    private handleResize(){

        this.elementsToUpdateOnResize.forEach(
            fn=>fn()
        );

    }

}