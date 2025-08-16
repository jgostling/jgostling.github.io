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

function calculateAverageDamage(damageNotation) {
    if (!damageNotation || typeof damageNotation !== 'string') return 0;
    let total = 0;
    damageNotation.split('+').forEach(part => {
        if (part.includes('d')) {
            const [numStr, sidesStr] = part.split('d');
            const num = parseInt(numStr) || 1;
            const sides = parseInt(sidesStr);
            if (isNaN(num) || isNaN(sides)) return;
            // Average of one die is (sides + 1) / 2
            total += num * ((sides + 1) / 2);
        } else {
            total += Number(part);
        }
    });
    return total;
}

function calculateThreat(combatant) {
    if (!combatant.attacks || combatant.attacks.length === 0) return 1;

    let mainActionDamage = 0;
    let bonusActionDamage = 0;

    if (combatant.abilities.multiattack) {
        const attacks = combatant.abilities.multiattack.split(';');
        attacks.forEach(attackString => {
            const [count, name] = attackString.split('/');
            const action = combatant.attacks.find(a => a.name.toLowerCase() === name.toLowerCase().trim());
            if (action && action.damage) {
                mainActionDamage += calculateAverageDamage(action.damage) * parseInt(count);
            }
        });
    } else {
        // Find the best single main action
        const mainActions = combatant.attacks.filter(a => (a.action || 'action') === 'action' && a.damage);
        if (mainActions.length > 0) {
            const threats = mainActions.map(action => {
                const numTargets = parseInt(action.targets) || 1;
                return calculateAverageDamage(action.damage) * numTargets;
            });
            mainActionDamage = Math.max(0, ...threats);
        }
    }

    // Find the best bonus action, which can be used in addition to the main action
    const bonusActions = combatant.attacks.filter(a => a.action === 'bonus_action' && a.damage);
    if (bonusActions.length > 0) {
        const threats = bonusActions.map(action => {
            const numTargets = parseInt(action.targets) || 1;
            return calculateAverageDamage(action.damage) * numTargets;
        });
        bonusActionDamage = Math.max(0, ...threats);
    }

    let potentialDamage = mainActionDamage + bonusActionDamage;

    if (combatant.abilities.sneak_attack) {
        potentialDamage += calculateAverageDamage(combatant.abilities.sneak_attack);
    }

    return Math.round(potentialDamage) || 1;
}