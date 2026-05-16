const DEFAULT_CAPTIONS = [
    'Meow', 'Purrfect', 'Cozy', 'Vibes', 'Sweet', 'Fluffy', 'Floof',
    'Paws', 'Chilling', 'Mood', 'Cute', 'Silly', 'Adorable', 'Sleepy',
    'Playful', 'Wow', 'Love', 'Kitty', 'Cat', 'Feline', 'Whiskers',
    'Beans', 'Snack', 'Hunter', 'Staring', 'Zoomies', 'Chaos', 'Blessed',
    'Muse', 'Energy', 'Iconic', 'Fancy', 'Therapy', 'Joy', 'Magic',
    'Soft', 'Wild', 'Heart', 'Bug', 'Lazy', 'Vibe', 'Machine', 'Explorer',
    'Dream', 'Hunter', 'Check', 'Soft', 'Maker', 'Current', 'Dreams',
    'Logic', 'Buddy', 'Curious', 'Happy', 'Fine', 'Contact', 'Trouble',
    'Large', 'Fry', 'Nine', 'Time', 'Soul', 'Energy', 'Animal', 'Overload',
    'Energy', 'Thoughts', 'Alert', 'Contest', 'Bather', 'Queen', 'King',
    'Wild', 'Ritual', 'Giant', 'Beans', 'Soul', 'Timing', 'Mode',
    // Funny, Meme, & Fighting related
    'Bruh', 'Sus', 'Derp', 'Yeet', 'Sheesh', 'NPC', 'Oof', 'LOL',
    'Bonk', 'Smack', 'Bap', 'Pow', 'Ninja', 'KO', 'Wasted', 'Boss',
    'Fatality', 'Oops', 'Glitch', 'Sigma', 'Pounce', 'Sneak', 'Help',
    'Epic fail', 'RKO', 'Based', 'W cat', 'L cat', 'Skill issue', 'Got em',
    'Cursed', 'He attac', 'He protec', 'Oh lawd', 'Chonk', 'Angy', 'Busted',
    'Paw slap', 'Combo', 'Player 2', 'Game over', 'Try hard', 'Caught lacking',
    'Side eye', 'Bombastic', 'Bro chill', 'Scrap', 'Takedown', 'Victory',
    'Ratio', 'Sneak attack', 'RIP', 'Gamer', 'No way', 'Why tho', 'Flawless'
];

function generateCaptions(count = 5) {
    const source = [...DEFAULT_CAPTIONS];
    const picks = [];

    while (picks.length < count && source.length > 0) {
        const idx = Math.floor(Math.random() * source.length);
        picks.push(source.splice(idx, 1)[0]);
    }

    while (picks.length < count) {
        // Fallback random captions (mostly 1 word, max 2) if we run out of unique DFAULT_CAPTIONS
        const fallbackWords = ['Meow', 'Cute', 'Funny', 'Sweet', 'Fluffy', 'Vibin', 'Paws', 'Cozy', 'Chill', 'Purr', 'Love', 'Wow', 'Silly', 'Soft', 'Chilling', 'Mood', 'Adorable', 'Sleepy', 'Playful', 'Bruh', 'Bonk', 'Yeet', 'Oof', 'KO', 'RKO', 'Based', 'Chonk', 'Epic fail', 'Paw slap', 'Combo'];
        picks.push(fallbackWords[Math.floor(Math.random() * fallbackWords.length)]);
    }

    return picks;
}

function getRandomCaption() {
    const source = [...DEFAULT_CAPTIONS];
    const fallbackWords = ['Meow', 'Cute', 'Funny', 'Sweet', 'Fluffy', 'Vibin', 'Paws', 'Cozy', 'Chill', 'Purr', 'Love', 'Wow', 'Silly', 'Soft', 'Chilling', 'Mood', 'Adorable', 'Sleepy', 'Playful', 'Bruh', 'Bonk', 'Yeet', 'Oof', 'KO', 'RKO', 'Based', 'Chonk', 'Epic fail', 'Paw slap', 'Combo'];
    
    // 50/50 chance to pick from DEFAULT_CAPTIONS or fallbackWords
    if (Math.random() > 0.5) {
        return source[Math.floor(Math.random() * source.length)];
    }
    return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
}

module.exports = { generateCaptions, getRandomCaption };
