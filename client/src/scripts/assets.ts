export const animationFrames: { [key: string]: { start: number, end: number } }[] = []

for (let grid=0; grid<8; grid++) {
    const gi = parseInt(`${grid/4}`);
    const gj = grid%4;

    const compute = (gi: number, gj: number, i: number, j: number) => {
        const _i = 4*gi + i;
        const _j = 3*gj + j;

        return _i*12 + _j;
    }

    const anims: { [key: string]: { start: number, end: number } } = {
        "idle-down": { start: compute(gi, gj, 0, 1), end: compute(gi, gj, 0, 1) },
        "idle-left": { start: compute(gi, gj, 1, 1), end: compute(gi, gj, 1, 1) },
        "idle-right": { start: compute(gi, gj, 2, 1), end: compute(gi, gj, 2, 1) },
        "idle-up": { start: compute(gi, gj, 3, 1), end: compute(gi, gj, 3, 1) },
        "walk-down": { start: compute(gi, gj, 0, 0), end: compute(gi, gj, 0, 2) },
        "walk-left": { start: compute(gi, gj, 1, 0), end: compute(gi, gj, 1, 2) },
        "walk-right": { start: compute(gi, gj, 2, 0), end: compute(gi, gj, 2, 2) },
        "walk-up": { start: compute(gi, gj, 3, 0), end: compute(gi, gj, 3, 2) }
    }
    animationFrames.push(anims);
}

export const sprites: { [key: string]: string } = {
    "GENERIC": "assets/characters/sprites/old-style/01-generic.png",
    "BARD": "assets/characters/sprites/old-style/02-bard.png",
    "SOLDIER": "assets/characters/sprites/old-style/03-soldier.png",
    "SCOUT": "assets/characters/sprites/old-style/04-scout.png",
    "DEVOUT": "assets/characters/sprites/old-style/05-devout.png",
    "CONJURER": "assets/characters/sprites/old-style/06-conjurer.png",
}

export const cars: { [key: string]: { [key: string]: string } } = {
    "SUV": {
        "Red": "assets/cars/SUV/Red.png",
        "Blue": "assets/cars/SUV/Blue.png",
        "Green": "assets/cars/SUV/Green.png",
        "Yellow": "assets/cars/SUV/Yellow.png",
        "White": "assets/cars/SUV/White.png",
        "Black": "assets/cars/SUV/Black.png",
        "Magenta": "assets/cars/SUV/Magenta.png",
    },
    "Musclecar": {
        "Red": "assets/cars/Musclecar/Red.png",
        "Blue": "assets/cars/Musclecar/Blue.png",
        "Green": "assets/cars/Musclecar/Green.png",
        "Yellow": "assets/cars/Musclecar/Green.png",
        "White": "assets/cars/Musclecar/Green.png",
        "Black": "assets/cars/Musclecar/Green.png",
        "Magenta": "assets/cars/Musclecar/Green.png",
    },
    "Sedan": {
        "Red": "assets/cars/Sedan/Red.png",
        "Blue": "assets/cars/Sedan/Blue.png",
        "Green": "assets/cars/Sedan/Green.png",
        "Yellow": "assets/cars/Sedan/Green.png",
        "White": "assets/cars/Sedan/Green.png",
        "Black": "assets/cars/Sedan/Green.png",
        "Magenta": "assets/cars/Sedan/Green.png",
    },
    "Sport": {
        "Red": "assets/cars/Sport/Red.png",
        "Blue": "assets/cars/Sport/Blue.png",
        "Green": "assets/cars/Sport/Green.png",
        "Yellow": "assets/cars/Sport/Green.png",
        "White": "assets/cars/Sport/Green.png",
        "Black": "assets/cars/Sport/Green.png",
        "Magenta": "assets/cars/Sport/Green.png",
    },
    "Super": {
        "Red": "assets/cars/Super/Red.png",
        "Blue": "assets/cars/Super/Blue.png",
        "Green": "assets/cars/Super/Green.png",
        "Yellow": "assets/cars/Super/Yellow.png",
        "White": "assets/cars/Super/White.png",
        "Black": "assets/cars/Super/Black.png",
        "Magenta": "assets/cars/Super/Magenta.png",
    },
}