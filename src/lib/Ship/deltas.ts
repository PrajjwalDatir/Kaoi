/** Single source of truth for how each !react action affects bond growth.
 *
 * Rules (enforced in src/lib/Ship/index.ts):
 *  - Each (sender, bond, action) tuple is recorded at most once. Spamming the
 *    same action does nothing.
 *  - Per-sender net contribution to a single bond is clamped to [-5, +5].
 *  - Actions not listed here have delta 0.
 */
export const REACTION_DELTAS: Readonly<Record<string, number>> = {
    // Romantic peak — single-handed cap.
    kiss: 5,

    // Deep affection.
    cuddle: 3,
    handhold: 3,
    hug: 3,

    // Affectionate.
    glomp: 2,
    blush: 2,
    wink: 2,
    lick: 2,

    // Friendly.
    pat: 1,
    highfive: 1,
    wave: 1,
    smile: 1,
    happy: 1,
    dance: 1,
    poke: 1,
    nom: 1,
    bite: 1,
    bonk: 1,

    // Neutral.
    smug: 0,
    cry: 0,

    // Hostile.
    slap: -2,
    kick: -2,
    yeet: -2,
    cringe: -2,

    // Mean.
    bully: -3,

    // Breakup tier.
    kill: -5
}

export const PER_SENDER_CAP = 5
