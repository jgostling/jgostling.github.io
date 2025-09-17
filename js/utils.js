// js/utils.js

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function rollD20(roller, options = {}) {
    const { advantage = false, disadvantage = false } = options;

    // Step 1: Roll the dice.
    const initialRolls = [Math.floor(Math.random() * 20) + 1];
    if (advantage || disadvantage) {
        initialRolls.push(Math.floor(Math.random() * 20) + 1);
    }

    // Step 2: Dispatch an event that allows abilities to modify the rolls.
    const d20RolledEventData = {
        roller: roller,
        rolls: initialRolls, // Pass the array of rolls
        advantage,
        disadvantage,
        lucky: false
    };
    const modifiedEventData = eventBus.dispatch('d20_rolled', d20RolledEventData);
    const finalRolls = modifiedEventData.rolls;
    const lucky = modifiedEventData.lucky;

    // Step 3: Determine the base roll from the final dice values.
    let baseRoll;
    if (advantage && !disadvantage) {
        baseRoll = Math.max(...finalRolls);
    } else if (disadvantage && !advantage) {
        baseRoll = Math.min(...finalRolls);
    } else {
        baseRoll = finalRolls[0];
    }

    // Step 4: Dispatch an event to apply modifiers like Bless and Bane.
    const d20ModifyingEventData = {
        roller: roller,
        finalRoll: baseRoll,
        bonus: 0,
        penalty: 0,
        blessBonus: 0, // For logging
        banePenalty: 0  // For logging
    };
    const modifiedD20EventData = eventBus.dispatch('d20_modifying', d20ModifyingEventData);

    // Step 5: Calculate the final roll using the results from the event.
    const finalRoll = baseRoll + modifiedD20EventData.bonus - modifiedD20EventData.penalty;
    const blessBonus = modifiedD20EventData.blessBonus;
    const banePenalty = modifiedD20EventData.banePenalty;

    // For logging purposes, separate the generic bonuses from the named ones (bless/bane).
    const eventBonus = modifiedD20EventData.bonus - blessBonus;
    const eventPenalty = modifiedD20EventData.penalty - banePenalty;

    return { roll: finalRoll, rawRoll: baseRoll, lucky, blessBonus, banePenalty, eventBonus, eventPenalty };
}


function rollDice(diceNotation, options = {}) {
    if (!diceNotation || typeof diceNotation !== 'string' || diceNotation.trim() === '') {
        return null;
    }

    let total = 0;
    const rerollValues = options.reroll || [];
    const parts = diceNotation.replace(/-/g, '+-').split('+');

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart === '') continue;

        if (trimmedPart.includes('d')) {
            const [numStr, sidesStr] = trimmedPart.split('d');
            const num = numStr === '' ? 1 : parseInt(numStr, 10);
            const sides = parseInt(sidesStr, 10);

            if (isNaN(num) || isNaN(sides) || sides <= 0) {
                return null;
            }

            for (let i = 0; i < num; i++) {
                let roll = Math.floor(Math.random() * sides) + 1;
                if (rerollValues.includes(roll)) {
                    roll = Math.floor(Math.random() * sides) + 1;
                }
                total += roll;
            }
        } else {
            const staticValue = parseInt(trimmedPart, 10);
            if (isNaN(staticValue)) {
                return null;
            }
            total += staticValue;
        }
    }

    return total;
}

function calculateAverageDamage(damageNotation) {
    if (!damageNotation || typeof damageNotation !== 'string' || damageNotation.trim() === '') {
        return null;
    }

    let total = 0;
    const parts = damageNotation.replace(/-/g, '+-').split('+');

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart === '') continue;

        if (trimmedPart.includes('d')) {
            const [numStr, sidesStr] = trimmedPart.split('d');
            const num = numStr === '' ? 1 : parseInt(numStr, 10);
            const sides = parseInt(sidesStr, 10);

            if (isNaN(num) || isNaN(sides) || sides <= 0) {
                return null;
            }
            total += num * ((sides + 1) / 2);
        } else {
            const staticValue = parseInt(trimmedPart, 10);
            if (isNaN(staticValue)) {
                return null;
            }
            total += staticValue;
        }
    }

    return total;
}

function getActionThreat(action, combatant) {
    let threat = 0;
    if (action.multiattack) {
        threat = action.multiattack.reduce((totalDamage, subActionInfo) => {
            const subAction = combatant.attacks.find(a => a.name === subActionInfo.name);
            if (subAction && subAction.damage) {
                return totalDamage + (calculateAverageDamage(subAction.damage) * subActionInfo.count);
            }
            return totalDamage;
        }, 0);
    } else if (action.damage) {
        const numTargets = parseInt(action.targets) || 1;
        threat = calculateAverageDamage(action.damage) * numTargets;
    }
    return threat;
}

function calculateThreat(combatant) {
    if (!combatant.attacks || combatant.attacks.length === 0) return 1;

    let mainActionDamage = 0;
    let bonusActionDamage = 0;

    const mainActions = combatant.attacks.filter(a => (a.action || 'action') === 'action');
    if (mainActions.length > 0) {
        const mainActionThreats = mainActions.map(action => getActionThreat(action, combatant));
        mainActionDamage = Math.max(0, ...mainActionThreats);
    }

    const bonusActions = combatant.attacks.filter(a => a.action === 'bonus_action');
    if (bonusActions.length > 0) {
        const bonusActionThreats = bonusActions.map(action => getActionThreat(action, combatant));
        bonusActionDamage = Math.max(0, ...bonusActionThreats);
    }

    let potentialDamage = mainActionDamage + bonusActionDamage;

    // Dispatch an event to allow abilities like Sneak Attack to add to the potential damage.
    const threatCalculatingEventData = {
        combatant: combatant,
        potentialDamage: potentialDamage
    };
    const modifiedEventData = eventBus.dispatch('threat_calculating', threatCalculatingEventData);
    potentialDamage = modifiedEventData.potentialDamage;

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