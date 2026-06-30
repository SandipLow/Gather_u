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