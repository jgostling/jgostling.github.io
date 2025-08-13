// js/utils.js

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function rollD20(roller, options = {}) {
    const { advantage = false, disadvantage = false, blessed = false, baned = false } = options;
    let roll1 = Math.floor(Math.random() * 20) + 1;
    let roll2 = Math.floor(Math.random() * 20) + 1;
    let lucky = false;

    if (roller.abilities.lucky) {
        if (roll1 === 1) {
            roll1 = Math.floor(Math.random() * 20) + 1;
            lucky = true;
        }
        if (roll2 === 1 && (advantage || disadvantage)) {
            // Reroll the second die if it's a 1 and matters
            roll2 = Math.floor(Math.random() * 20) + 1;
            lucky = true;
        }
    }

    let baseRoll;
    if (advantage && !disadvantage) {
        baseRoll = Math.max(roll1, roll2);
    } else if (disadvantage && !advantage) {
        baseRoll = Math.min(roll1, roll2);
    } else {
        baseRoll = roll1;
    }
    
    let finalRoll = baseRoll;
    let blessBonus = 0;
    let banePenalty = 0;

    if (blessed) {
        blessBonus = rollDice('1d4');
        finalRoll += blessBonus;
    }
    if (baned) {
        banePenalty = rollDice('1d4');
        finalRoll -= banePenalty;
    }

    return { roll: finalRoll, rawRoll: baseRoll, lucky, blessBonus, banePenalty };
}


function rollDice(diceNotation, options = {}) {
    if (!diceNotation || typeof diceNotation !== 'string') return 0;
    let total = 0;
    const rerollValues = options.reroll || [];
    diceNotation.split('+').forEach(part => {
        if (part.includes('d')) {
            const [numStr, sidesStr] = part.split('d');
            const num = parseInt(numStr) || 1;
            const sides = parseInt(sidesStr);
            if (isNaN(num) || isNaN(sides)) return;
            for (let i = 0; i < num; i++) {
                let roll = Math.floor(Math.random() * sides) + 1;
                if (rerollValues.includes(roll)) {
                    roll = Math.floor(Math.random() * sides) + 1;
                }
                total += roll;
            }
        } else {
            total += Number(part);
        }
    });
    return total;
}