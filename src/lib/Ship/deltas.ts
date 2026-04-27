/** Single source of truth for how each !react action affects bond growth.
 *
 * Rules (enforced in src/lib/Ship/index.ts):
 *  - Each (sender, bond, action) tuple is recorded at most once. Spamming the
 *    same action does nothing.
 *  - Per-sender net contribution to a single bond is clamped to ±PER_SENDER_CAP.
 *  - Actions not listed here have delta 0.
 *
 * Calibration: the deltas + cap together set how fast a bond can climb. Bond
 * base is 20–40, so reaching a "fated" 99% needs ~+59 in earned growth. With
 * PER_SENDER_CAP = 3, that's ~20 distinct contributors at full cap each —
 * which in an active chat naturally accrues over weeks, not days. Casual
 * actions (pat/wave/etc) are 0 because we want them to play GIFs without
 * moving the score; the score is reserved for actions that actually signal
 * romance.
 */
export const REACTION_DELTAS: Readonly<Record<string, number>> = {
    // Romantic peak — full positive cap in one action.
    kiss: 2,

    // Deep affection.
    cuddle: 1,
    handhold: 1,
    hug: 1,

    // Affectionate.
    glomp: 1,
    blush: 1,
    wink: 1,
    lick: 1,

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
    slap: -1,
    kick: -1,
    yeet: -1,
    cringe: -1,

    // Mean.
    bully: -2,

    // Breakup tier — full negative cap.
    kill: -2
}

export const PER_SENDER_CAP = 3
