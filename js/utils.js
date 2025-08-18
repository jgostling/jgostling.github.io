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

/**
 * Gathers and consolidates all mechanical effects from a combatant's active conditions.
 * This function recursively processes conditions and their 'includes' properties.
 * @param {object} combatant - The combatant instance from the simulation.
 * @returns {object} A consolidated object of all active effects.
 */
function getConditionEffects(combatant) {
    const allEffects = {
        disadvantageOn: [],
        autoFailSaves: [],
        cannot: []
        // Other effects will be added dynamically
    };
    const processedConditions = new Set();
    const conditionQueue = [...(combatant.status.conditions.map(c => c.name))];

    while (conditionQueue.length > 0) {
        const conditionName = conditionQueue.shift();
        if (!conditionName || processedConditions.has(conditionName)) continue;

        processedConditions.add(conditionName);
        const conditionDef = CONDITIONS_LIBRARY[conditionName];
        if (!conditionDef) continue;

        // Merge effects from the current condition
        if (conditionDef.effects) {
            for (const [key, value] of Object.entries(conditionDef.effects)) {
                if (Array.isArray(value)) {
                    allEffects[key] = [...new Set([...(allEffects[key] || []), ...value])];
                } else if (allEffects[key] === undefined) {
                    allEffects[key] = value;
                }
            }
        }

        // Add included conditions to the queue to be processed
        if (conditionDef.includes) conditionQueue.push(...conditionDef.includes);
    }
    return allEffects;
}

/**
 * Checks if one combatant can see another, considering conditions like blinded and invisible.
 * @param {object} viewer - The combatant who is looking.
 * @param {object} target - The combatant being looked at.
 * @returns {boolean} True if the viewer can see the target, false otherwise.
 */
function canSee(viewer, target) {
    const viewerEffects = getConditionEffects(viewer);
    if (viewerEffects.isBlinded) {
        return false;
    }

    const targetEffects = getConditionEffects(target);
    if (targetEffects.isInvisible) {
        // Future enhancement: check if viewer has a counter like See Invisibility or Truesight.
        return false;
    }

    return true;
}