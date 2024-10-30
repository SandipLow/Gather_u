interface SpriteSheetData {
    path: string;
    animation_frames: {
        [key: string]: { start: number, end: number }
    }
}

export const sprites: {[key: string]: SpriteSheetData} = {
    "GENERIC": {
        path: "assets/characters/sprites/old-style/01-generic.png",
        animation_frames: {
            "walk-down": { start: 0, end: 2 },
            "walk-left": { start: 15, end: 17 },
            "walk-right": { start: 30, end: 32 },
            "walk-up": { start: 45, end: 47}
        }
    },
    "BARD": {
        path: "assets/characters/sprites/old-style/02-bard.png",
        animation_frames: {
            "walk-down": { start: 0, end: 2 },
            "walk-left": { start: 12, end: 14 },
            "walk-right": { start: 24, end: 26 },
            "walk-up": { start: 36, end: 38 }
        }
    },
    "SOLDIER": {
        path: "assets/characters/sprites/old-style/03-soldier.png",
        animation_frames: {
            "walk-down": { start: 0, end: 2 },
            "walk-left": { start: 12, end: 14 },
            "walk-right": { start: 24, end: 26 },
            "walk-up": { start: 36, end: 38 }
        }
    },
    "SCOUT": {
        path: "assets/characters/sprites/old-style/04-scout.png",
        animation_frames: {
            "walk-down": { start: 0, end: 2 },
            "walk-left": { start: 12, end: 14 },
            "walk-right": { start: 24, end: 26 },
            "walk-up": { start: 36, end: 38 }
        }
    },
    "DEVOUT": {
        path: "assets/characters/sprites/old-style/05-devout.png",
        animation_frames: {
            "walk-down": { start: 0, end: 2 },
            "walk-left": { start: 12, end: 14 },
            "walk-right": { start: 24, end: 26 },
            "walk-up": { start: 36, end: 38 }
        }
    },
    "CONJURER": {
        path: "assets/characters/sprites/old-style/06-conjurer.png",
        animation_frames: {
            "walk-down": { start: 0, end: 2 },
            "walk-left": { start: 12, end: 14 },
            "walk-right": { start: 24, end: 26 },
            "walk-up": { start: 36, end: 38 }
        }
    },
}