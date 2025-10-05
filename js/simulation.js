// js/simulation.js

var log;
var DEFAULT_ACTIONS = {
    DODGE: { name: 'Dodge', type: 'effect', action: 'action', effect: { name: 'dodging', duration: 1 }, targeting: 'self' }
};

function _formatDurationForLog(duration) {
    if (!duration) return '';

    const parts = [];
    if (duration.rounds) {
        parts.push(`${duration.rounds} round${duration.rounds > 1 ? 's' : ''}`);
    }
    if (duration.turnEnds) {
        parts.push(`${duration.turnEnds} turn${duration.turnEnds > 1 ? 's' : ''}`);
    }
    if (duration.uses) {
        parts.push(`${duration.uses} use${duration.uses > 1 ? 's' : ''}`);
    }
    if (duration.minutes) {
        parts.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
    }
    if (duration.hours) {
        parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
    }

    let durationString = parts.join(' and ');
    if (duration.concentration) {
        durationString = `${durationString} (Concentration)`;
    }

    return durationString.trim();
}

function setupCombatant(c) {
    const status = {
        usedBonusAction: false, usedAction: false, usedReaction: false,
        isRaging: false, usedRelentless: false, usedSneakAttack: false, engagedWith: [],
        usedSavageAttacker: false, canMakeGWMAttack: false, canMakeRampageAttack: false,
        actionUses: {}, spellSlots: deepCopy(c.spell_slots || {}),
        conditions: [], legendaryResistances: parseInt(c.abilities?.legendary_resistance) || 0,
        concentratingOn: null,
        actionSurgeUses: c.abilities?.action_surge ? (parseInt(c.abilities.action_surge, 10) || 1) : 0,
        loggedCharmMessageThisTurn: false, thp: 0,
        abilities: {} // This will hold the state of abilities, like resource pools.
    };

    // Find any abilities that are resource pools and initialize their state.
    if (c.abilities) {
        for (const key in c.abilities) {
            const ability = c.abilities[key];
            if (typeof ability === 'object' && ability.pool !== undefined) {
                status.abilities[key] = deepCopy(ability); // e.g. { pool: 5 }
                // For lookups, ensure the canonical name from the library is also in the status object.
                // This allows the simulation logic to find pools by name without depending on the global library.
                if (ABILITIES_LIBRARY[key]) {
                    status.abilities[key].name = ABILITIES_LIBRARY[key].name;
                }
            }
        }
    }

    const newCombatant = {
        ...deepCopy(c),
        status
    };

    // Ensure abilities object exists on the new combatant, as it might be missing from the input `c`.
    if (!newCombatant.abilities) {
        newCombatant.abilities = {};
    }

    // Add the base AI ability to every combatant.
    newCombatant.abilities.base_ai_targeting = true;
    newCombatant.abilities.system_turn_end_handler = true;
    newCombatant.abilities.system_concentration_incapacitated = true;
    newCombatant.abilities.system_concentration_save = true;

    // --- Subscribe reaction abilities to the EventBus ---
    // This is the final wiring step that connects the combatant's abilities to the event system.
    for (const key in newCombatant.abilities) {
        const ability = ABILITIES_LIBRARY[key];
        // An ability is considered a reaction if it has a trigger property.
        if (ability && ability.trigger) {
            const events = ability.trigger.events || [ability.trigger.event];
            for (const eventName of events) {
                if (eventName) {
                    eventBus.subscribe(eventName, newCombatant);
                }
            }
        }
    }

    return newCombatant;
}

function rollInitiative(combatants) {
    combatants.forEach(c => {
        // Dispatch an event to allow abilities to modify the roll options (e.g., grant advantage).
        const eventData = {
            combatant: c,
            options: { advantage: false }
        };
        const modifiedEventData = eventBus.dispatch('initiative_rolling', eventData);

        const rollResult = rollD20(c, modifiedEventData.options, 'initiative', {});
        c.initiative = rollResult.rawRoll + c.initiative_mod;
    });
    combatants.sort((a, b) => b.initiative - a.initiative);
    log('<span class="text-yellow-400 font-bold">--- Initiative Order ---</span>');
    combatants.forEach(c => log(`${c.name}: ${c.initiative}`));
}

function getContext(combatant, allCombatants) {
    const opponents = allCombatants.filter(c => c.team !== combatant.team && c.hp > 0);
    const allies = allCombatants.filter(c => c.team === combatant.team && c.hp > 0);
    const downedAllies = allCombatants.filter(c => c.team === combatant.team && c.hp === 0);
    return { opponents, allies, downedAllies };
}

function hasCondition(c, name) {
    return !!(c.status && c.status.conditions && c.status.conditions.some(cond => cond.name === name));
}

function applyDamage(target, damage, type, isMagical = false, context = {}) {
    if (!type) {
        throw new Error('applyDamage was called without a damage type.');
    }
    let typeLower = type.toLowerCase();
    if (!DAMAGE_TYPES.includes(typeLower)) {
        throw new Error(`applyDamage was called with an invalid damage type: '${type}'`);
    }

    // Dispatch an event that allows abilities to modify incoming damage before resistances are applied.
    const damageApplyingEventData = {
        target,
        damage, // The initial, unmodified damage
        type: typeLower,
        isMagical,
        isImmune: false,
        grantResistance: false,
        grantVulnerability: false,
        context
    };
    const modifiedEventData = eventBus.dispatch('damage_applying', damageApplyingEventData);
    // Use the potentially modified values for the rest of the calculation.
    damage = modifiedEventData.damage;
    typeLower = modifiedEventData.type;
    isMagical = modifiedEventData.isMagical;

    let finalDamage = damage;

    // --- Step 1: Check for Immunities ---
    // The event system now handles all immunities.
    if (modifiedEventData.isImmune) {
        log(`${target.name} is immune to the ${typeLower} damage!`, 2);
        return 0; // No damage taken
    }

    // --- Step 2: Determine Resistance and Vulnerability ---
    // Check for resistance from abilities, conditions, and event-driven effects.
    const hasResistance = !!modifiedEventData.grantResistance;
    const hasVulnerability = !!modifiedEventData.grantVulnerability;

    // --- Step 3: Apply Resistance/Vulnerability ---
    // Resistance and vulnerability cancel each other out.
    if (hasVulnerability && !hasResistance) {
        finalDamage = finalDamage * 2;
        log(`${target.name} is vulnerable to the ${typeLower} damage!`, 2);
    } else if (hasResistance && !hasVulnerability) {
        finalDamage = Math.floor(finalDamage / 2);
        log(`${target.name} resists the ${typeLower} damage.`, 2);
    }
    
    // --- Step 5: Apply damage to Temporary HP first ---
    // THP is lost before regular HP.
    let damageToHp = finalDamage;
    if (target.status.thp > 0 && finalDamage > 0) {
        const damageToThp = Math.min(finalDamage, target.status.thp);
        target.status.thp -= damageToThp;
        damageToHp -= damageToThp;
        log(`${target.name} loses ${damageToThp} temporary HP. (${target.status.thp} remaining)`, 2);
    }

    target.hp -= damageToHp;
    if (target.hp <= 0) {
        // Dispatch an event that abilities like Relentless Endurance can react to.
        // This allows them to potentially change the outcome (e.g., set HP back to 1).
        eventBus.dispatch('reduced_to_0_hp', { target: target });

        // After the event, if HP is still 0 or less, the creature is defeated.
        if (target.hp <= 0) {
            target.hp = 0;
            log(`<span class="font-bold text-red-600">${target.name} is defeated!</span>`, 2);
        }
    }
    return finalDamage;
}

/**
 * Applies healing to a target, handling max HP caps and dispatching events.
 * This is the centralized function for all healing sources.
 * @param {object} target - The combatant receiving the healing.
 * @param {number} amount - The amount of HP to restore.
 * @param {string} source - A string describing the source of the heal (e.g., an action name).
 */
function applyHeal(target, amount, source) {
    // Dispatch an event that allows abilities/conditions to modify or prevent healing.
    const eventData = {
        target,
        amount,
        source
    };
    const modifiedEventData = eventBus.dispatch('heal_applying', eventData);
    const modifiedAmount = modifiedEventData.amount;

    if (modifiedAmount <= 0) return;

    const actualHeal = Math.min(modifiedAmount, target.maxHp - target.hp);

    if (actualHeal <= 0) return;

    const wasDowned = target.hp === 0;
    target.hp += actualHeal;

    if (wasDowned) {
        log(`${target.name} is brought back from the brink by ${source}, healing for ${actualHeal} HP!`, 1);
    } else {
        log(`${target.name} is healed for ${actualHeal} HP by ${source}.`, 1);
    }
}

function makeSavingThrow(target, dc, saveType, sourceAction = {}, context = {}) {
    // Dispatch an event that allows abilities to modify the save before the roll.
    const eventData = {
        target,
        dc,
        saveType,
        sourceAction,
        advantage: false,
        disadvantage: false,
        outcome: 'pending' // Allows conditions to force an outcome
    };
    const modifiedEventData = eventBus.dispatch('saving_throw_modifying', eventData);

    // Check for auto-fail from the event
    if (modifiedEventData.outcome === 'auto-fail') {
        log(`${target.name} automatically fails the ${saveType.toUpperCase()} save due to a condition!`, 2);
        return { passed: false, margin: -Infinity }; // A large negative margin for auto-fails
    }

    // Use the potentially modified values from the event.
    const advantage = modifiedEventData.advantage;
    const disadvantage = modifiedEventData.disadvantage;

    const rollResult = rollD20(target, { advantage, disadvantage }, 'savingThrow', { dc, saveType, context });
    if (rollResult.lucky) log(`${target.name} uses Lucky to reroll a 1 on a save!`, 2);

    let total = rollResult.roll + (target.saves[saveType] || 0);
    let logBonuses = [];
    if (rollResult.blessBonus > 0) logBonuses.push(`+${rollResult.blessBonus}[bless]`);
    if (rollResult.eventBonus > 0) logBonuses.push(`+${rollResult.eventBonus}[bonus]`);
    if (rollResult.banePenalty > 0) logBonuses.push(`-${rollResult.banePenalty}[bane]`);
    if (rollResult.eventPenalty > 0) logBonuses.push(`-${rollResult.eventPenalty}[penalty]`);
    const logBonusStr = logBonuses.length > 0 ? ` ${logBonuses.join(' ')}` : '';
    log(`${target.name} rolls a ${saveType.toUpperCase()} save: ${rollResult.rawRoll} + ${target.saves[saveType] || 0}${logBonusStr} = ${total} vs DC ${dc}`, 2);

    let saved = total >= dc;

    if (!saved) {
        // Dispatch an event that allows abilities like Legendary Resistance to change the outcome.
        const failedEventData = {
            target: target,
            dc: dc,
            saveType: saveType,
            outcome: 'fail'
        };
        const modifiedFailedEventData = eventBus.dispatch('saving_throw_failed', failedEventData);
        if (modifiedFailedEventData.outcome === 'success') {
            saved = true;
        }
    }

    return { passed: saved, margin: total - dc };
}

function getValidTargets(attacker, action, context) {
    const { opponents } = context;
    if (opponents.length === 0) return [];

    // --- Step 1: Determine physically reachable targets based on roles ---
    let reachableTargets;
    if (action.ranged) {
        // Ranged attacks can physically target anyone.
        reachableTargets = [...opponents];
    } else {
        // Melee attacks must engage the frontline if it exists.
        const enemyFrontliners = opponents.filter(o => (o.role || 'frontline') === 'frontline');
        if (enemyFrontliners.length > 0) {
            reachableTargets = enemyFrontliners;
        } else {
            // If no frontline, melee can target the backline.
            reachableTargets = opponents.filter(o => o.role === 'backline');
        }
    }

    // --- Step 2: Dispatch event to allow conditions like Charmed to filter targets ---
    const eventData = {
        attacker: attacker,
        action: action,
        potentialTargets: reachableTargets
    };
    const modifiedEventData = eventBus.dispatch('targets_filtering', eventData);
    
    // The event may have modified the list of targets.
    return modifiedEventData.potentialTargets;
}

function chooseTarget(attacker, possibleTargets) {
    if (possibleTargets.length === 0) return null;
    if (possibleTargets.length === 1) return possibleTargets[0];

    const scoredTargets = possibleTargets.map(target => {
        // Dispatch an event to allow abilities to add to the base score for this target.
        // This will replace the hard-coded logic below in a future refactor.
        const eventData = {
            attacker: attacker,
            target: target,
            score: 0
        };
        const modifiedEventData = eventBus.dispatch('target_scoring', eventData);
        let score = modifiedEventData.score;

        // Use a small minimum score to ensure every valid target has a chance.
        return { target, score: Math.max(0.1, score) };
    });

    const totalScore = scoredTargets.reduce((sum, current) => sum + current.score, 0);
    
    // This case should be rare with the minimum score, but it's a good safeguard.
    if (totalScore <= 0) {
        return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    }

    let randomPoint = Math.random() * totalScore;

    for (const scoredTarget of scoredTargets) {
        randomPoint -= scoredTarget.score;
        if (randomPoint <= 0) {
            return scoredTarget.target;
        }
    }

    // Fallback for floating point issues, though it should be very rare.
    return scoredTargets[scoredTargets.length - 1].target;
}

function resolveAttackRoll(attacker, target, action, context) {
    let toHitBonus = parseInt(action.toHit) || 0;
    let damageBonus = 0; // This is for GWM/SS, handled in attack_declared

    let advantage = false;
    let disadvantage = false;

    // Dispatch attack_declared event for reactions
    let eventData = {
        attacker, target, action, advantage, disadvantage, toHitBonus, damageBonus, context
    };
    const modifiedEventData = eventBus.dispatch('attack_declared', eventData);
    
    advantage = modifiedEventData.advantage;
    disadvantage = modifiedEventData.disadvantage;
    toHitBonus = modifiedEventData.toHitBonus;
    // damageBonus is handled in calculateAttackDamage
    const rollResult = rollD20(attacker, { advantage, disadvantage }, 'attackRoll', { context });
    if (rollResult.lucky) log(`${attacker.name} uses Lucky to reroll a 1 on an attack!`, 1);

    let totalToHit = rollResult.roll + toHitBonus;
    let logBonuses = [];
    if (rollResult.blessBonus > 0) logBonuses.push(`+${rollResult.blessBonus}[bless]`);
    if (rollResult.eventBonus > 0) logBonuses.push(`+${rollResult.eventBonus}[bonus]`);
    if (rollResult.banePenalty > 0) logBonuses.push(`-${rollResult.banePenalty}[bane]`);
    if (rollResult.eventPenalty > 0) logBonuses.push(`-${rollResult.eventPenalty}[penalty]`);
    const logBonusStr = logBonuses.length > 0 ? ` ${logBonuses.join(' ')}` : '';
    
    const crit = rollResult.rawRoll === 20;
    const hit = crit || (totalToHit >= target.ac && rollResult.rawRoll !== 1);
    
    const isSpellLike = (typeof action.spellLevel === 'number' && action.spellLevel >= 0);
    const verb = isSpellLike ? 'casts' : 'attacks';

    if (isSpellLike) {
        log(`${attacker.name} ${verb} ${action.name}, targeting ${target.name}: rolls ${rollResult.rawRoll} + ${toHitBonus}${logBonusStr} = ${totalToHit} vs AC ${target.ac}.`, 1);
    } else {
        log(`${attacker.name} ${verb} ${target.name} with ${action.name}: rolls ${rollResult.rawRoll} + ${toHitBonus}${logBonusStr} = ${totalToHit} vs AC ${target.ac}.`, 1);
    }
    if (!hit) {
        log(`<span class="text-gray-500">Misses.</span>`, 1);
    }

    return { hit, crit, damageBonus: modifiedEventData.damageBonus, advantage, disadvantage, chargeActivated: !!modifiedEventData.chargeActivated };
}

function calculateAttackDamage(attacker, target, action, context, crit, damageBonus, advantage, disadvantage, chargeActivated = false) {
    // Dispatch attack_hit event for reactions like Divine Smite
    const attackHitEventData = {
        attacker, target, crit, action, context,
        bonusDamage: [], // Reactions can push bonus damage objects here
        advantage,
        disadvantage,
        chargeActivated
    };
    const modifiedAttackHitEventData = eventBus.dispatch('attack_hit', attackHitEventData);
    crit = modifiedAttackHitEventData.crit; // Update crit status from event

    if (crit) log(`<span class="text-yellow-400">Critical Hit!</span>`, 2);

    let damageDice = action.damage;
    let damageBreakdown = [];

    if (crit) {
        damageDice += `+${(action.damage.match(/\d+d\d+/g) || []).join('+')}`;
    }

    // Dispatch damage_dice_rolling event
    const damageDiceRollingEventData = {
        attacker, target, action, damageDice, options: { reroll: [] }
    };
    const modifiedDamageDiceRollingEventData = eventBus.dispatch('damage_dice_rolling', damageDiceRollingEventData);

    let baseDamage = rollDice(damageDice, modifiedDamageDiceRollingEventData.options);

    // Dispatch damage_rolled event
    const damageRolledEventData = {
        attacker, target, action, damageDice, initialDamage: baseDamage, crit
    };
    const modifiedDamageRolledEventData = eventBus.dispatch('damage_rolled', damageRolledEventData);
    baseDamage = modifiedDamageRolledEventData.initialDamage;

    damageBreakdown.push(`${baseDamage}[base]`);
    let totalDamage = baseDamage + damageBonus;
    if (damageBonus > 0) damageBreakdown.push(`${damageBonus}[feat]`);

    // Process bonus damage from reactions
    if (modifiedAttackHitEventData.bonusDamage.length > 0) {
        for (const bonus of modifiedAttackHitEventData.bonusDamage) {
            const bonusDmgAmount = rollDice(bonus.amount);
            totalDamage += bonusDmgAmount;
            damageBreakdown.push(`${bonusDmgAmount}[${bonus.source || bonus.type}]`);
        }
    }

    return { totalDamage, damageBreakdown };
}

/**
 * A private helper to determine the final list of effects to apply after a saving throw,
 * considering a base effect and any graduated effects from an on_fail_by array.
 * It handles overriding effects for more severe save failures.
 * @param {object|null} baseEffect - The standard effect to apply on a failed save.
 * @param {Array|null} onFailBy - The array of graduated effect rules.
 * @param {object} saveResult - The result from makeSavingThrow, containing the failure margin.
 * @returns {Array} An array of the final effect objects to be applied.
 * @private
 */
function _getEffectsToApplyOnSave(baseEffect, onFailBy, saveResult) {
    const effectsToApply = new Map();

    if (baseEffect?.name) {
        effectsToApply.set(baseEffect.name, baseEffect);
    }

    if (onFailBy) {
        const applicableRules = onFailBy.filter(rule => Math.abs(saveResult.margin) >= rule.margin);
        for (const rule of applicableRules) {
            // If the rule has a shared duration, roll it once.
            const sharedDuration = rule.duration ? deepCopy(rule.duration) : null;
            if (sharedDuration) {
                for (const key in sharedDuration) {
                    const value = sharedDuration[key];
                    if (typeof value === 'string' && value.includes('d')) {
                        sharedDuration[key] = rollDice(value);
                    }
                }
            }
            // Apply the effects from the rule
            for (const effect of rule.effects) {
                effectsToApply.set(effect.name, { ...effect, duration: effect.duration || sharedDuration });
            }
        }
    }
    return Array.from(effectsToApply.values());
}

/**
 * A private helper to process generic on-hit effects from an action.
 * This handles bonus damage, saving throws, and conditions.
 * @param {object} attacker - The combatant performing the action.
 * @param {object} target - The target of the action.
 * @param {object} onHitEffect - The on_hit_effect object from the action definition.
 * @param {object} context - The current combat context.
 * @param {boolean} crit - Whether the triggering attack was a critical hit.
 * @private
 */
function _applySingleOnHitEffect(attacker, target, onHitEffect, context, crit = false) {
    // --- Step 0: Check for conditional application based on target type ---
    if (onHitEffect.if_target_is) {
        const requiredTypes = Array.isArray(onHitEffect.if_target_is) ? onHitEffect.if_target_is : [onHitEffect.if_target_is];
        const targetType = target.type?.toLowerCase() || '';
        if (!requiredTypes.includes(targetType)) {
            return; // Target type does not match, so this effect does not apply.
        }
    }

    let saveResult = { passed: false, margin: -Infinity }; // Default result for no-save effects

    // --- Step 1: Handle Saving Throw ---
    if (onHitEffect.save) {
        saveResult = makeSavingThrow(target, onHitEffect.save.dc, onHitEffect.save.type, onHitEffect, context);
        if (saveResult.passed) {
            log(`${target.name} succeeds on the saving throw.`, 3);
        } else {
            log(`${target.name} fails the saving throw.`, 2);
        }
    }

    // --- Step 2: Handle Damage ---
    if (onHitEffect.damage) {
        let damageToRoll = onHitEffect.damage;

        // If it's a critical hit AND there is no save required, double the dice for the roll.
        if (crit && !onHitEffect.save) {
            const dicePart = (onHitEffect.damage.match(/\d+d\d+/g) || []).join('+');
            if (dicePart) {
                damageToRoll += `+${dicePart}`;
            }
        }

        let damageAmount = 0;
        if (saveResult.passed) {
            if (onHitEffect.on_save === 'half') {
                // For half damage, we roll the original dice and halve the result. Crit does not apply here.
                damageAmount = Math.floor(rollDice(onHitEffect.damage) / 2);
            }
        } else { // Failed save or no save required
            // For full damage, we use the potentially crit-doubled dice string.
            damageAmount = rollDice(damageToRoll);
        }

        if (damageAmount > 0) {
            const finalDamage = applyDamage(target, damageAmount, onHitEffect.damageType, !!onHitEffect.isMagical, context);
            log(`${target.name} takes an additional ${finalDamage} ${onHitEffect.damageType} damage.`, 3);
        }
    }

    // --- Step 3: Handle Conditions/Effects ---
    // This should happen if the save fails, or if there was no save to begin with.
    if (!saveResult.passed) {
        // Use the new helper to resolve which effects to apply.
        const effectsToApply = _getEffectsToApplyOnSave(onHitEffect.effect, onHitEffect.on_fail_by, saveResult);
        // Apply all unique, most severe effects.
        for (const effect of effectsToApply.values()) {
            applyCondition(attacker, target, effect, onHitEffect.save?.dc, context);
        }
    } else if (onHitEffect.on_save === 'half' && onHitEffect.effect) {
        // This handles the specific case where an effect should still apply even on a successful save,
        // but only if the action is configured for "half damage on save".
        applyCondition(attacker, target, onHitEffect.effect, onHitEffect.save?.dc, context);
    }
}

function _handleOnHitEffects(attacker, target, action, context, crit) {
    // Support the new array format
    if (action.on_hit_effects) {
        for (const effect of action.on_hit_effects) {
            _applySingleOnHitEffect(attacker, target, effect, context, crit);
        }
    }
    // Support the old single object format for backward compatibility
    else if (action.on_hit_effect) {
        _applySingleOnHitEffect(attacker, target, action.on_hit_effect, context, crit);
    }
}

function performAttackAction(attacker, target, action, context) {
    const { hit, crit, damageBonus, advantage, disadvantage, chargeActivated } = resolveAttackRoll(attacker, target, action, context);

    if (hit) {
        const { totalDamage, damageBreakdown } = calculateAttackDamage(attacker, target, action, context, crit, damageBonus, advantage, disadvantage, chargeActivated);
        
        // The isMagical property on the action itself should determine if the base damage is magical.
        const isMagical = !!action.isMagical;
        const finalDamage = applyDamage(target, totalDamage, action.damageType, isMagical, context);
        log(`<span class="text-green-400">Hits</span> for <span class="font-bold text-yellow-300">${finalDamage}</span> damage (${damageBreakdown.join(' + ')}). ${target.name} HP: ${target.hp}`, 2);
        
        // Handle generic on-hit effects (e.g., poison, bonus fire damage)
        _handleOnHitEffects(attacker, target, action, context, crit);
        
        // Check for defeat after all on-hit effects have been applied.
        // We need to get the full list of combatants to correctly update engagement status for everyone.
        const allCombatants = [...context.allies, ...context.opponents, ...(context.downedAllies || [])];
        // Future improvement: The context could be enriched to always contain the full list.
        _checkAndDispatchDefeat(attacker, target, allCombatants, context);

        // Dispatch a final event for abilities that trigger after a hit is fully resolved (e.g., Charge save).
        eventBus.dispatch('post_attack_hit', { attacker, target, action, chargeActivated, context });
    }

    // --- Engagement Mechanic ---
    // After any melee attack (hit or miss), the attacker and target become engaged.
    // Do not engage with a defeated target.
    if (!action.ranged && target.hp > 0) {
        if (!attacker.status.engagedWith.includes(target.id)) {
            attacker.status.engagedWith.push(target.id);
        }
        if (!target.status.engagedWith.includes(attacker.id)) {
            target.status.engagedWith.push(attacker.id);
        }
    }
}

/**
 * Removes any active concentration effects from their targets when the caster's concentration is broken.
 * @param {object} caster - The combatant who is losing concentration.
 * @param {object} context - The current combat context.
 */
function breakConcentration(caster, context) {
    if (!caster.status.concentratingOn) return;

    const { spellName, targetIds } = caster.status.concentratingOn;
    log(`${caster.name} loses concentration on ${spellName}.`, 1);

    const allCombatants = [...context.allies, ...context.opponents, ...(context.downedAllies || [])];
    targetIds.forEach(targetId => {
        const target = allCombatants.find(c => c.id === targetId);
        if (target) {
            target.status.conditions = target.status.conditions.filter(c => !(c.isConcentration && c.sourceId === caster.id));
        }
    });

    caster.status.concentratingOn = null;
}

function performSaveAction(attacker, action, context, targets) {
    const isSpellLike = (typeof action.spellLevel === 'number' && action.spellLevel >= 0) || !!action.isMagical;
    const verb = isSpellLike ? 'casts' : 'uses';
    if (targets.length === 0) {
        const baseVerb = isSpellLike ? 'cast' : 'use';
        log(`${attacker.name} tries to ${baseVerb} ${action.name}, but there are no valid targets.`, 1);
        return;
    }

    log(`${attacker.name} ${verb} ${action.name}, targeting ${targets.map(t=>t.name).join(', ')}.`, 1);

    const isConcentration = action.effect?.duration?.concentration;
    const failedTargets = [];

    targets.forEach(target => {
        let saveResult;
        // If the action has a save property, perform the saving throw.
        // Otherwise, treat it as an automatic failure to apply the effect.
        if (action.save) {
            saveResult = makeSavingThrow(target, action.save.dc, action.save.type, action, context);
        } else {
            saveResult = { passed: false, margin: -Infinity }; // Auto-fail for effect-only actions
        }

        if (!saveResult.passed) { // Failed save
            failedTargets.push(target);
            log(`Target fails the save.`, 2);
            // Handle damage on fail
            if (action.damage) {
                const damageDice = action.damage;
                let baseDamage = rollDice(damageDice);

                // Dispatch an event after the initial damage roll, just like in performAttackAction.
                const damageRolledEventData = {
                    attacker,
                    target,
                    action,
                    damageDice,
                    initialDamage: baseDamage,
                    crit: false // Saves can't crit
                };
                const modifiedDamageRolledEventData = eventBus.dispatch('damage_rolled', damageRolledEventData);
                baseDamage = modifiedDamageRolledEventData.initialDamage;
                const finalDamage = applyDamage(target, baseDamage, action.damageType, !!action.isMagical, context);
                log(`Takes ${finalDamage} damage.`, 3);
            }
            // Handle effect on fail
            const finalEffects = _getEffectsToApplyOnSave(action.effect, action.on_fail_by, saveResult);
            for (const effect of finalEffects) {
                // Add the isConcentration flag before applying.
                if (isConcentration) effect.isConcentration = true;
                applyCondition(attacker, target, effect, action.save?.dc, context);
            }
        } else { // Successful save
            if (action.half && action.damage) {
                const damage = Math.floor(rollDice(action.damage) / 2);
                const finalDamage = applyDamage(target, damage, action.damageType, !!action.isMagical, context);
                log(`Target saves, but takes ${finalDamage} damage.`, 2);
            } else {
                log(`Target saves, no effect.`, 2);
            }
        }
        // After all effects of the save are resolved, check if the target was defeated.
        const allCombatants = [...context.allies, ...context.opponents, ...(context.downedAllies || [])];
        _checkAndDispatchDefeat(attacker, target, allCombatants, context);
    });

    // After all saves are resolved, set the concentration state for the caster
    // based on which targets actually failed their saves.
    if (isConcentration && failedTargets.length > 0) {
        if (attacker.status.concentratingOn) {
            breakConcentration(attacker, context);
        }
        attacker.status.concentratingOn = {
            spellName: action.name,
            targetIds: failedTargets.map(t => t.id)
        };
        log(`${attacker.name} is now concentrating on ${action.name}.`, 1);
    }
}

function performHealAction(attacker, action, context) {
    let potentialTargets = [];
    const targeting = action.targeting || 'any';
    const allPossibleAllies = [...context.allies, ...(context.downedAllies || [])];

    if (targeting === 'self') {
        potentialTargets = [attacker];
    } else if (targeting === 'other') {
        potentialTargets = allPossibleAllies.filter(a => a.id !== attacker.id);
    } else { // 'any'
        potentialTargets = allPossibleAllies;
    }

    const injuredTargets = potentialTargets.filter(a => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp);
    
    if (injuredTargets.length === 0) {
        log(`${attacker.name} tries to use ${action.name}, but there are no valid targets to heal.`, 1);
        return;
    }

    const target = injuredTargets[0];
    const wasDowned = target.hp === 0;
    const healAmount = rollDice(action.heal) || 0;

    // Delegate the actual healing to the centralized applyHeal function.
    // It will handle logging, max HP caps, and "heal_applying" events.
    applyHeal(target, healAmount, action.name);
}

function _findPoolAbility(attacker, poolName) {
    // Find the stateful ability in the attacker's status object by its key.
    // The poolName on the action should match the ability key (e.g., 'lay_on_hands').
    const poolAbility = attacker.status.abilities[poolName];
    return (poolAbility && poolAbility.pool !== undefined) ? poolAbility : null;
}

function performPoolHealAction(attacker, action, context) {
    const poolAbility = _findPoolAbility(attacker, action.poolName);

    if (!poolAbility || poolAbility.pool <= 0) {
        log(`${attacker.name} tries to use ${action.name}, but has no points left in the pool.`, 1);
        return;
    }

    // 2. Find the most wounded ally to heal, respecting the action's targeting.
    let potentialTargets = [];
    const targeting = action.targeting || 'any';
    const allPossibleAllies = [...context.allies, ...(context.downedAllies || [])];

    if (targeting === 'self') {
        potentialTargets = [attacker];
    } else if (targeting === 'other') {
        potentialTargets = allPossibleAllies.filter(a => a.id !== attacker.id);
    } else { // 'any'
        potentialTargets = allPossibleAllies;
    }

    const injuredTargets = potentialTargets.filter(a => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp);

    if (injuredTargets.length === 0) {
        log(`${attacker.name} tries to use ${action.name}, but there are no valid targets to heal.`, 1);
        return;
    }
    const target = injuredTargets[0];

    // 3. Determine the actual amount to heal, capped by the pool, the action's amount, and the target's missing HP.
    const missingHp = target.maxHp - target.hp;
    const amountToHeal = Math.min(action.amount, poolAbility.pool, missingHp);

    if (amountToHeal <= 0) {
        // This case is now implicitly handled by applyHeal, which does nothing if actualHeal is <= 0.
        return;
    }

    // 4. Deplete the pool and delegate the healing to the centralized function.
    poolAbility.pool -= amountToHeal;
    log(`${attacker.name} uses ${action.name}, spending ${amountToHeal} points from the pool. (${poolAbility.pool} points remaining)`, 1);

    applyHeal(target, amountToHeal, action.name);
}

function performAction(attacker, action, context, isSubAction = false) {
    // Only consume resources for the top-level action, not for sub-actions of a Multiattack.
    if (!isSubAction) {
        const useKey = action.name.replace(/\s+/g, '_');
        if (action.uses) {
            attacker.status.actionUses[useKey] = (attacker.status.actionUses[useKey] || 0) + 1;
        }
        if (action.spellLevel > 0) {
            if (attacker.status.spellSlots[action.spellLevel] > 0) {
                attacker.status.spellSlots[action.spellLevel]--;
                log(`${attacker.name} uses a level ${action.spellLevel} spell slot (${attacker.status.spellSlots[action.spellLevel]} remaining).`, 1);
            } else {
                log(`${attacker.name} tries to cast ${action.name} but has no level ${action.spellLevel} spell slots left!`, 1);
                return; 
            }
        }
    }

    // Check for Multiattack first.
    if (action.multiattack) {
        for (const sub of action.multiattack) {
            const subAction = attacker.attacks.find(a => a.name === sub.name);
            if (subAction) {
                if (!isSubAction) log(`${attacker.name} uses ${action.name} to perform ${sub.count} ${sub.name} attack(s).`, 1);
                for (let j = 0; j < sub.count; j++) {
                    const conditionEffects = getConditionEffects(attacker);
                    if (conditionEffects.cannot && conditionEffects.cannot.includes('takeActions')) {
                        log(`${attacker.name} is incapacitated and cannot continue their Multiattack.`, 1);
                        break;
                    }
                    performAction(attacker, subAction, context, true); // Recursive call
                }
            }
        }
        return; // The Multiattack action itself is now fully handled.
    }

    // Get a fresh list of living combatants for this specific action to avoid targeting defeated enemies.
    const allKnownAllies = [...context.allies, ...(context.downedAllies || [])];
    const freshContext = {
        allies: allKnownAllies.filter(c => c.hp > 0),
        opponents: context.opponents.filter(c => c.hp > 0),
        downedAllies: allKnownAllies.filter(c => c.hp === 0)
    };

    // Determine action type. Fallback for older/untyped actions.
    const actionType = action.type || 
                       (action.toHit ? 'attack' : 
                       (action.save ? 'save' : 
                       (action.heal ? 'heal' : 
                       (action.effect ? 'effect' : null))));

    if (freshContext.opponents.length === 0 && actionType !== 'heal' && actionType !== 'pool_heal' && actionType !== 'effect') return;

    switch (actionType) {
        case 'attack': {
            const possibleTargets = getValidTargets(attacker, action, freshContext);
            if (possibleTargets.length > 0) {
                const target = chooseTarget(attacker, possibleTargets);
                performAttackAction(attacker, target, action, freshContext);
            } else {
                log(`${attacker.name} has no valid targets for ${action.name}.`, 1);
            }
            break;
        }
        case 'effect': // Fall-through
        case 'save': {
            let targets = [];
            let possibleTargets = [];

            // This logic is merged from performEffectAction to handle both save and effect actions.
            const isEffectOnly = actionType === 'effect';
            const effectDef = isEffectOnly ? CONDITIONS_LIBRARY[action.effect.name] : null;
            const isBeneficial = effectDef?.type === 'beneficial';
            const targeting = action.targeting || 'any';

            if (targeting === 'self') {
                possibleTargets = [attacker];
            } else if (isBeneficial) {
                possibleTargets = (targeting === 'other') ? freshContext.allies.filter(a => a.id !== attacker.id) : freshContext.allies;
            } else {
                // Default to targeting opponents for save-based actions or harmful effects.
                possibleTargets = getValidTargets(attacker, action, freshContext);
            }

            if (possibleTargets.length > 0) {
                const numTargets = parseInt(action.targets) || 1;
                if (numTargets === 1) {
                    if (isBeneficial && possibleTargets.length === 1 && possibleTargets[0].id === attacker.id) {
                        targets.push(attacker);
                    } else {
                        targets.push(chooseTarget(attacker, possibleTargets));
                    }
                } else {
                    const shuffledTargets = [...possibleTargets].sort(() => 0.5 - Math.random());
                    targets = shuffledTargets.slice(0, numTargets);
                }
                performSaveAction(attacker, action, freshContext, targets);
            }
            break;
        }
        case 'pool_heal':
            performPoolHealAction(attacker, action, freshContext);
            break;
        case 'heal':
            performHealAction(attacker, action, freshContext);
            break;
        default:
            if (action.name === 'Dodge') {
                // Dodge is a self-targeted effect action.
                performSaveAction(attacker, action, freshContext, [attacker]);
            }
            break;
    }
}

function _calculateHealScore(potentialTargets) {
    if (!potentialTargets || potentialTargets.length === 0) {
        return -1;
    }

    // Only consider healing if there are priority targets (downed or below 50% HP)
    const priorityTargets = potentialTargets.filter(ally => ally.hp === 0 || ally.hp < ally.maxHp * 0.5);

    if (priorityTargets.length > 0) {
        const downedTargets = priorityTargets.filter(ally => ally.hp === 0);
        if (downedTargets.length > 0) {
            return 500; // Very high priority to bring someone back from 0 HP.
        } else {
            // Find the most injured target among the priority targets.
            const mostInjured = priorityTargets.sort((a, b) => a.hp - b.hp)[0];
            // High priority for targets below 50% HP.
            return 100 + (1 - (mostInjured.hp / mostInjured.maxHp)) * 100;
        }
    }

    return -1; // No priority targets to heal.
}

function getActionScore(action, attacker, context) {
    let score = 0;
    const targeting = action.targeting || 'any';

    if (action.heal || action.type === 'pool_heal') {
        let canHeal = true;
        if (action.type === 'pool_heal') {
            const poolAbility = _findPoolAbility(attacker, action.poolName);
            canHeal = poolAbility && poolAbility.pool > 0;
        }

        if (canHeal) {
            let potentialTargets = [];
            const allPossibleAllies = [...context.allies, ...(context.downedAllies || [])];
            if (targeting === 'self') {
                potentialTargets = [attacker];
            } else if (targeting === 'other') {
                potentialTargets = allPossibleAllies.filter(a => a.id !== attacker.id);
            } else { // 'any'
                potentialTargets = allPossibleAllies;
            }
            score += _calculateHealScore(potentialTargets);
        }
    }
    
    if (action.effect) {
        let effectScore = 0;
        const effectDef = CONDITIONS_LIBRARY[action.effect.name];

        // Only score the effect if it's a known, valid condition
        if (effectDef) {
            // New pattern: Delegate scoring to the condition definition if it has a getScore method.
            if (typeof effectDef.getScore === 'function') {
                effectScore = effectDef.getScore(attacker, action, context);
            }
            // If an effect has no getScore method, it will have a score of 0, which is intended.
            // This forces new effects to have explicit AI scoring logic.
        }
        score += effectScore;
    }
    
    if (action.damage) {
        let damageScore = 0;
        const numActionTargets = parseInt(action.targets) || 1;
        const possibleTargets = getValidTargets(attacker, action, context);

        // Only consider this action if there are enough targets
        if (possibleTargets.length >= numActionTargets) {
            damageScore = calculateAverageDamage(action.damage, attacker) * numActionTargets;
        }

        // Dispatch an event to allow abilities to modify the action's score based on potential extra damage.
        const actionScoringEvent = {
            action,
            attacker,
            context,
            score: damageScore
        };
        const modifiedEvent = eventBus.dispatch('action_scoring', actionScoringEvent);
        score += modifiedEvent.score;
    }

    return score;
}

function chooseAction(attacker, actionType, context) {
    const possibleActions = attacker.attacks.filter(a => {
        const type = a.action || 'action';
        if (type !== actionType) return false;
        const useKey = a.name.replace(/\s+/g, '_');
        if (a.uses && (attacker.status.actionUses[useKey] || 0) >= a.uses.max) return false;
        if (a.spellLevel > 0 && attacker.status.spellSlots[a.spellLevel] <= 0) return false;
        return true;
    });

    if (possibleActions.length === 0) return null;
    
    let bestAction = null;
    let bestScore = 0;

    for (const action of possibleActions) {
        let score = 0;

        if (action.multiattack) {
            score = action.multiattack.reduce((totalScore, subActionInfo) => {
                const subAction = attacker.attacks.find(a => a.name === subActionInfo.name);
                if (!subAction) return totalScore;

                // Use the new helper function for clean, consistent scoring
                const subActionScore = getActionScore(subAction, attacker, context);
                
                return totalScore + (subActionScore * subActionInfo.count);
            }, 0);
        } else {
            // Use the new helper function for single actions
            score = getActionScore(action, attacker, context);
        }

        if (score > bestScore) {
            bestScore = score;
            bestAction = action;
        }
    }
    return bestAction;
}

/**
 * Handles all start-of-turn effects for a combatant and across the battlefield.
 * This includes resetting per-turn flags and decrementing condition durations.
 * @param {object} activeCombatant - The combatant whose turn is starting.
 * @param {object[]} allCombatants - An array of all combatants in the simulation.
 */
function handleTurnStart(activeCombatant, allCombatants) {
    log(`<div class="mt-2"><span class="font-bold text-${activeCombatant.team === 'A' ? 'blue' : 'red'}-400">${activeCombatant.name}'s</span> turn (HP: ${activeCombatant.hp}).</div>`);

    // Reset per-turn flags for the active combatant
    activeCombatant.status.usedAction = false;
    activeCombatant.status.usedBonusAction = false;
    activeCombatant.status.usedReaction = false;
    activeCombatant.status.usedSneakAttack = false;
    activeCombatant.status.usedSavageAttacker = false;
    activeCombatant.status.canMakeGWMAttack = false;
    activeCombatant.status.canMakeRampageAttack = false;
    activeCombatant.status.loggedCharmMessageThisTurn = false;

    // Process round-based durations for ALL combatants
    for (const combatant of allCombatants) {
        if (!combatant.status.conditions || combatant.status.conditions.length === 0) continue;

        combatant.status.conditions = combatant.status.conditions.filter(cond => {
            if (cond.duration?.rounds) {
                let shouldDecrement = (cond.duration.relativeTo === 'source' && cond.sourceId === activeCombatant.id) ||
                                      (!cond.duration.relativeTo && combatant.id === activeCombatant.id);
                if (shouldDecrement) cond.duration.rounds--;

                if (cond.duration.rounds <= 0) {
                    log(`The ${CONDITIONS_LIBRARY[cond.name]?.name || cond.name} effect on ${combatant.name} has expired.`, 1);
                    return false;
                }
            }
            return true;
        });
    }

    // Reset per-turn action uses for the active combatant
    activeCombatant.attacks.forEach(action => {
        if (action.uses?.per === 'turn') {
            activeCombatant.status.actionUses[action.name.replace(/\s+/g, '_')] = 0;
        }
    });

    // Dispatch an event that start-of-turn abilities like Regeneration can react to.
    eventBus.dispatch('turn_started', { combatant: activeCombatant });
}

function handlePreActionBonusActions(attacker, context) {
    if (attacker.status.usedBonusAction) return;

    // Dispatch an event for abilities that can be used as a bonus action BEFORE the main action.
    eventBus.dispatch('pre_action_bonus_opportunity', { combatant: attacker, context: context });
}

function handlePostActionBonusActions(attacker, context) {
    if (attacker.status.usedBonusAction) return;

    eventBus.dispatch('post_action_bonus_opportunity', { combatant: attacker, context: context });

    // If an event listener used the bonus action, we can stop.
    if (attacker.status.usedBonusAction) return;

    // Choose any other available bonus action (e.g., a spell).
    const bonusAction = chooseAction(attacker, 'bonus_action', context);
    if (bonusAction) {
        performAction(attacker, bonusAction, context);
        attacker.status.usedBonusAction = true;
    }
}

function handleAction(attacker, context) {
    if (attacker.status.usedAction) return;

    const chosenAction = chooseAction(attacker, 'action', context);

    if (chosenAction) {
        performAction(attacker, chosenAction, context);
    } else {
        // If no valuable action is found, default to the Dodge action.
        performAction(attacker, DEFAULT_ACTIONS.DODGE, context);
    }

    // Dispatch an event for abilities that can grant an extra action, like Action Surge.
    eventBus.dispatch('extra_action_opportunity', { combatant: attacker, context: context });

    attacker.status.usedAction = true;
}

function handleRoundStart(allCombatants) {
    allCombatants.forEach(c => {
        if (c.hp > 0) {
            // Reset any abilities that refresh each round.
            c.attacks.forEach(action => {
                if (action.uses?.per === 'round') {
                    c.status.actionUses[action.name.replace(/\s+/g, '_')] = 0;
                }
            });
        }
    });
}

function executeTurn(attacker, allCombatants) {
    if (attacker.hp <= 0) return;

    handleTurnStart(attacker, allCombatants);
    const context = getContext(attacker, allCombatants);

    // Dispatch an event to check for turn-skipping conditions like incapacitated.
    const actionAttemptingEvent = {
        combatant: attacker,
        canAct: true,
        reason: '' // A place for the condition to state why it's preventing action.
    };
    const modifiedEvent = eventBus.dispatch('action_attempting', actionAttemptingEvent);

    if (!modifiedEvent.canAct) {
        log(`${attacker.name} is incapacitated by ${modifiedEvent.reason} and cannot take actions.`, 1);
    } else {
        handlePreActionBonusActions(attacker, context);
        handleAction(attacker, context);

        // After the main action, check if Action Surge was triggered.
        if (attacker.status.hasActionSurge) {
            attacker.status.hasActionSurge = false; // Consume the surge.
            attacker.status.usedAction = false; // Reset the flag to allow another action.
            handleAction(attacker, context);
        }

        handlePostActionBonusActions(attacker, context);
    }

    // Dispatch an event for end-of-turn effects like repeating saves.
    eventBus.dispatch('turn_ended', { combatant: attacker, context: context, allCombatants: allCombatants });
}

function consumeUse(reactor, conditionInstance, context) {
    if (conditionInstance.duration?.uses) {
        conditionInstance.duration.uses--;
        if (conditionInstance.duration.uses <= 0) {
            const conditionDef = CONDITIONS_LIBRARY[conditionInstance.name];
            const displayName = conditionDef ? conditionDef.name : conditionInstance.name;
            log(`The ${displayName} effect on ${reactor.name} has been consumed.`, 1);
            reactor.status.conditions = reactor.status.conditions.filter(c => c !== conditionInstance);

            // If the consumed condition was a concentration effect, we need to break the caster's concentration.
            if (conditionInstance.isConcentration && context) {
                const allCombatants = [...context.allies, ...context.opponents, ...(context.downedAllies || [])];
                const caster = allCombatants.find(c => c.id === conditionInstance.sourceId);
                if (caster) {
                    breakConcentration(caster, context);
                }
            }
        }
    }
}

function runSingleSimulation(teamA, teamB, logActions = false) {
    log = (message, indent = 0) => {
        if (logActions) {
            const logEl = document.getElementById('simulation-log');
            const p = document.createElement('p');
            p.innerHTML = '&nbsp;'.repeat(indent * 2) + message;
            logEl.appendChild(p);
        }
    };

    // The entire simulation run is wrapped in a try...finally block.
    // This ensures that no matter how the simulation ends (win, draw, or error),
    // the event bus is always cleaned up, preventing state from leaking into the next run.
    try {
        const combatantsA = teamA.map(setupCombatant);
        const combatantsB = teamB.map(setupCombatant);
        if (combatantsA.length === 0 || combatantsB.length === 0) return 'Draw';

        const allCombatants = [...combatantsA, ...combatantsB];
        rollInitiative(allCombatants);
        log('<span class="text-yellow-400 font-bold">--- Combat Begins! ---</span>');

        let round = 1;
        while (round < 100) {
            log(`<br><span class="text-lg font-bold text-gray-400">--- Round ${round} ---</span>`);
            handleRoundStart(allCombatants);

            for (const attacker of allCombatants) {
                // The turn logic is now encapsulated in its own function.
                // We still need to check for victory conditions after each turn.
                executeTurn(attacker, allCombatants);

                const teamAliveA = combatantsA.some(c => c.hp > 0);
                const teamAliveB = combatantsB.some(c => c.hp > 0);
                if (!teamAliveA) return 'B';
                if (!teamAliveB) return 'A';
            }
            round++;
        }
        return 'Draw';
    } finally {
        // Reset the event bus to clear all combatant listeners from this simulation run.
        eventBus.listeners = {};
    }
}

/**
 * Calculates a score for a potential reaction to help the AI decide if it's worth using.
 * @param {object} reactor - The combatant considering the reaction.
 * @param {object} ability - The reaction ability definition from the library.
 * @param {object} eventData - The data associated with the triggering event.
 * @returns {number} A numerical score. Higher is better.
 */
function getReactionScore(reactor, ability, eventData, conditionInstance = null) {
    // Delegate scoring to the ability definition if it has a custom getScore method.
    if (typeof ability.getScore === 'function') {
        return ability.getScore(reactor, eventData, conditionInstance);
    }

    // If no specific getScore method is defined, return a default non-zero score to trigger the reaction.
    return 10;
}

/**
 * Grants temporary hit points to a target.
 * New THP replaces the old amount only if the new amount is higher.
 * @param {object} target - The combatant receiving the temporary HP.
 * @param {number} amount - The amount of temporary HP to grant.
 * @param {string} sourceName - The name of the ability or effect granting the THP.
 */
function grantTemporaryHp(target, amount, sourceName) {
    if (amount > target.status.thp) {
        target.status.thp = amount;
        log(`${target.name} gains ${amount} temporary HP from ${sourceName}.`, 1);
    }
}

/**
 * Applies a condition to a target, checking for immunities via the event system.
 * @param {object} attacker - The combatant applying the condition.
 * @param {object} target - The combatant receiving the condition.
 * @param {object} effect - The condition effect object (e.g., { name: 'poisoned', duration: 2 }).
 * @param {number|null} saveDC - The DC of the save that triggered this effect, if any.
 * @param {object} context - The current combat context.
 */
function applyCondition(attacker, target, effect, saveDC = null, context = {}) {
    // Dispatch an event to check for immunities or modifications.
    const eventData = {
        attacker,
        target,
        condition: effect,
        isImmune: false,
        context
    };
    const modifiedEventData = eventBus.dispatch('condition_applying', eventData);

    // Check if an ability or condition granted immunity.
    if (modifiedEventData.isImmune) {
        log(`${target.name} is immune to the ${effect.name} condition.`, 3);
        return;
    }

    // Do not apply a condition if the target already has it.
    if (hasCondition(target, effect.name)) {
        // Future enhancement: some conditions might stack or have their duration refreshed. For now, we prevent duplicates.
        return;
    }

    const newCondition = deepCopy(effect);
    // Only add a sourceId if the effect doesn't explicitly opt out.
    if (!effect.noSource) {
        newCondition.sourceId = attacker.id;
    }

    // If a turn-based duration is relative to the caster (or self-applied), we need to add 1 to account for the current turn.
    // A user-inputted duration of "1 turn" should last until the end of the *next* turn.
    // This makes the UI more intuitive.
    if (newCondition.duration?.turnEnds && (newCondition.duration.relativeTo === 'source' || attacker.id === target.id)) {
        newCondition.duration.turnEnds++;
    }

    // Handle dice notation in duration values (e.g., { minutes: '1d10' })
    if (newCondition.duration) {
        for (const key in newCondition.duration) {
            const value = newCondition.duration[key];
            if (typeof value === 'string' && value.includes('d')) {
                newCondition.duration[key] = rollDice(value);
            }
        }
    }

    // If the effect allows for repeating saves, store the original DC on the condition instance.
    if (newCondition.repeating_save && saveDC !== null) {
        newCondition.saveDC = saveDC;
    }

    target.status.conditions.push(newCondition);

    // Dispatch a new event AFTER the condition has been successfully applied.
    eventBus.dispatch('condition_applied', { ...eventData, condition: newCondition });

    const conditionDef = CONDITIONS_LIBRARY[effect.name];
    if (conditionDef && typeof conditionDef.getLogPhrase === 'function') {
        // The condition provides the full log message.
        const message = conditionDef.getLogPhrase(target, attacker, effect);
        log(message, 3);
    } else {
        // Use the default generic message.
        const displayName = conditionDef?.name || effect.name;
        let logMessage = `${target.name} is now affected by ${displayName}`;
        if (effect.duration) {
            const durationString = _formatDurationForLog(effect.duration);
            if (durationString) {
                logMessage += ` for ${durationString}`;
            }
        }
        logMessage += ` (from ${attacker.name}).`;
        log(logMessage, 3);
    }
}

/**
 * Checks if a target was defeated and dispatches the 'creature_defeated' event if so.
 * @param {object} victor - The combatant who dealt the final blow.
 * @param {object} defeated - The combatant who was defeated.
 * @param {object} allCombatants - The array of all combatants in the simulation.
 * @param {object} context - The current combat context.
 * @private
 */
function _checkAndDispatchDefeat(victor, defeated, allCombatants, context) {
    if (defeated.hp === 0) {
        eventBus.dispatch('creature_defeated', { victor, defeated, context });

        // After a creature is defeated, remove it from everyone's engagement list.
        // We must iterate over ALL combatants, not just those in the current context.
        allCombatants.forEach(c => {
            if (c.status.engagedWith && c.status.engagedWith.includes(defeated.id)) {
                c.status.engagedWith = c.status.engagedWith.filter(id => id !== defeated.id);
            }
        });
    }
}