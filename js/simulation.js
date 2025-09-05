// js/simulation.js

var log;

function setupCombatant(c) {
    const status = {
        usedBonusAction: false, usedAction: false,
        isRaging: false, usedRelentless: false, usedSneakAttack: false,
        usedSavageAttacker: false, canMakeGWMAttack: false,
        actionUses: {}, spellSlots: deepCopy(c.spell_slots || {}),
        conditions: [], legendaryResistances: parseInt(c.abilities?.legendary_resistance) || 0,
        actionSurgeUses: c.abilities?.action_surge ? (parseInt(c.abilities.action_surge, 10) || 1) : 0,
        isReckless: false, loggedCharmMessageThisTurn: false, isDodging: false,
        abilities: {} // This will hold the state of abilities, like resource pools.
    };

    // Find any abilities that are resource pools and initialize their state.
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

    return {
        ...deepCopy(c),
        status
    };
}

function rollInitiative(combatants) {
    combatants.forEach(c => {
        const rollResult = rollD20(c, { advantage: !!c.abilities.advantage_on_initiative });
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

function applyDamage(target, damage, type, isMagical = false) {
    if (!type) {
        throw new Error('applyDamage was called without a damage type.');
    }
    const typeLower = type.toLowerCase();
    if (!DAMAGE_TYPES.includes(typeLower)) {
        throw new Error(`applyDamage was called with an invalid damage type: '${type}'`);
    }

    let finalDamage = damage;
    const isPhysical = ['slashing', 'piercing', 'bludgeoning'].includes(typeLower);
    const effects = getConditionEffects(target);

    // Consolidate immunities, resistances, and vulnerabilities from abilities and conditions
    const immunities = [...((target.abilities.immunity || '').split(',')), ...(effects.immunityTo || [])].filter(Boolean);
    
    // Start with the generic resistance ability string
    let allResistances = (target.abilities.resistance || '').split(',').filter(Boolean);
    // Add resistances from conditions (e.g., Petrified)
    allResistances.push(...(effects.resistanceTo || []));
    // Add resistances granted by specific, named abilities (e.g., Dwarven Resilience)
    for (const abilityKey in target.abilities) {
        const abilityDef = ABILITIES_LIBRARY[abilityKey];
        if (abilityDef?.grantsResistance) {
            allResistances.push(...abilityDef.grantsResistance);
        }
    }
    const resistances = [...new Set(allResistances)]; // Use Set to remove duplicates
    const vulnerabilities = (target.abilities.vulnerability || '').split(',').filter(Boolean);

    // --- Step 1: Check for Immunities ---
    if (immunities.includes(typeLower) || immunities.includes('all')) {
        log(`${target.name} is immune to the ${typeLower} damage!`, 2);
        return 0; // No damage taken
    }

    // --- Step 2: Determine Resistance and Vulnerability ---
    let hasResistance = resistances.includes(typeLower) || resistances.includes('all');
    if (target.status.isRaging && isPhysical) {
        hasResistance = true;
    }
    const hasVulnerability = vulnerabilities.includes(typeLower);

    // --- Step 3: Apply Resistance/Vulnerability ---
    // Resistance and vulnerability cancel each other out.
    if (hasVulnerability && !hasResistance) {
        finalDamage = finalDamage * 2;
        log(`${target.name} is vulnerable to the ${typeLower} damage!`, 2);
    } else if (hasResistance && !hasVulnerability) {
        finalDamage = Math.floor(finalDamage / 2);
        log(`${target.name} resists the ${typeLower} damage.`, 2);
    }
    
    // --- Step 4: Apply flat damage reductions ---
    if (target.abilities.heavy_armor_master && isPhysical && !isMagical) {
        const reduction = 3;
        if (finalDamage > 0) {
            log(`${target.name} reduces damage by ${reduction} with Heavy Armor Master.`, 2);
            finalDamage = Math.max(0, finalDamage - reduction);
        }
    }

    target.hp -= finalDamage;
    if (target.hp <= 0) {
        if (target.abilities.relentless_endurance && !target.status.usedRelentless) {
            target.hp = 1;
            target.status.usedRelentless = true;
            log(`${target.name} uses Relentless Endurance to stay at 1 HP!`, 2);
        } else {
            target.hp = 0;
            log(`<span class="font-bold text-red-600">${target.name} is defeated!</span>`, 2);
        }
    }
    return finalDamage;
}

function makeSavingThrow(target, dc, saveType, sourceAction = {}) {
    const effects = getConditionEffects(target);
    const isMagical = !!sourceAction.isMagical;
    const damageType = sourceAction.type || '';
    const conditionName = sourceAction.effect?.name || '';

    // Check for auto-fail conditions first
    if (effects.autoFailSaves?.includes(saveType)) {
        log(`${target.name} automatically fails the ${saveType.toUpperCase()} save due to a condition!`, 2);
        return false;
    }

    let advantage = false;
    const abilities = target.abilities || {};

    // --- Check for Dodge action ---
    // A creature benefits from Dodging if it's not incapacitated and its speed is not 0.
    if (target.status.isDodging && saveType === 'dex') {
        const targetEffectsForDodge = getConditionEffects(target);
        const isTargetIncapacitated = targetEffectsForDodge.cannot?.includes('takeActions');
        const isTargetSpeedZero = targetEffectsForDodge.speed === 0;

        if (!isTargetIncapacitated && !isTargetSpeedZero) {
            advantage = true;
            log(`${target.name} has advantage on the DEX save from Dodging.`, 2);
        }
    }

    // --- Check for all sources of Advantage from abilities ---
    for (const abilityKey in abilities) {
        if (advantage) break; // Optimization: if we already have advantage, no need to check more.

        const abilityDef = ABILITIES_LIBRARY[abilityKey];
        if (!abilityDef?.rules?.saveAdvantage) continue;

        for (const rule of abilityDef.rules.saveAdvantage) {
            let ruleMatches = true;

            // Check 'on' condition (specific save types like 'dex', 'str')
            if (rule.on && !rule.on.includes(saveType)) ruleMatches = false;

            // Check 'sourceType' condition ('magical' or 'non-magical')
            if (rule.sourceType?.includes('magical') && !isMagical) ruleMatches = false;
            if (rule.sourceType?.includes('non-magical') && isMagical) ruleMatches = false;

            // Check 'vs' condition (damage types or condition names)
            if (rule.vs && !rule.vs.some(vsType => vsType === damageType || vsType === conditionName)) ruleMatches = false;

            if (ruleMatches) {
                advantage = true;
                log(`${target.name} gains advantage on the save from ${abilityDef.name}.`, 2);
                break; // Found a matching rule, no need to check other rules for this ability
            }
        }
    }

    // Check for disadvantage from any condition (e.g., restrained -> dexSaves)
    let disadvantage = effects.disadvantageOn?.includes(`${saveType}Saves`);

    const isBlessed = hasCondition(target, 'blessed');
    const isBaned = hasCondition(target, 'baned');
    
    const rollResult = rollD20(target, { advantage, disadvantage, blessed: isBlessed, baned: isBaned });
    if (rollResult.lucky) log(`${target.name} uses Lucky to reroll a 1 on a save!`, 2);

    let total = rollResult.roll + (target.saves[saveType] || 0);
    let logBonuses = [];
    if (isBlessed) logBonuses.push(`+${rollResult.blessBonus}[bless]`);
    if (isBaned) logBonuses.push(`-${rollResult.banePenalty}[bane]`);
    const logBonusStr = logBonuses.length > 0 ? ` ${logBonuses.join(' ')}` : '';
    log(`${target.name} rolls a ${saveType.toUpperCase()} save: ${rollResult.rawRoll} + ${target.saves[saveType] || 0}${logBonusStr} = ${total} vs DC ${dc}`, 2);
    
    if (total < dc && target.status.legendaryResistances > 0) {
        target.status.legendaryResistances--;
        log(`${target.name} uses Legendary Resistance to succeed! (${target.status.legendaryResistances} remaining)`, 2);
        return true;
    }
    return total >= dc;
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

    // --- Step 2: Filter reachable targets based on conditions like Charmed ---
    let finalTargets = [...reachableTargets];
    const isHarmful = !action.heal;
    if (isHarmful) {
        const charmerIds = attacker.status.conditions
            .filter(c => c.name === 'charmed' && c.sourceId)
            .map(c => c.sourceId);

        if (charmerIds.length > 0) {
            const charmerNames = reachableTargets // Check against reachable targets
                .filter(opp => charmerIds.includes(opp.id))
                .map(c => c.name);
            
            if (charmerNames.length > 0) {
                if (!attacker.status.loggedCharmMessageThisTurn) {
                    log(`${attacker.name} is charmed by ${charmerNames.join(', ')} and cannot target them.`, 1);
                    attacker.status.loggedCharmMessageThisTurn = true;
                }
                finalTargets = finalTargets.filter(opp => !charmerIds.includes(opp.id));
            }
        }
    }
    
    return finalTargets;
}

function chooseTarget(attacker, possibleTargets) {
    if (possibleTargets.length === 0) return null;
    if (possibleTargets.length === 1) return possibleTargets[0];

    const scoredTargets = possibleTargets.map(target => {
        let score = 0;

        // Factor 1: Prioritize higher threat targets
        score += (target.threat || 1) * 1.5;

        // Factor 2: Prioritize wounded targets
        const hpPercent = target.hp / target.maxHp;
        score += (1 - hpPercent) * 50;

        // Factor 3: Huge bonus for a likely kill this turn
        if ((attacker.threat || 0) >= target.hp) {
            score += 100;
        }

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

function performAttackAction(attacker, target, action, context) {
    const useGWM = attacker.abilities.great_weapon_master && action.heavy;
    const useSS = attacker.abilities.sharpshooter && action.ranged;
    let toHitBonus = parseInt(action.toHit) || 0;
    let damageBonus = 0;

    if ((useGWM || useSS) && target.ac < 18) {
        toHitBonus -= 5;
        damageBonus += 10;
        log(`${attacker.name} uses ${useGWM ? 'Great Weapon Master' : 'Sharpshooter'} (-5 to hit, +10 damage).`, 1);
    }
    
    const isBlessed = hasCondition(attacker, 'blessed');
    const isBaned = hasCondition(attacker, 'baned');

    let advantage = false;
    let disadvantage = false;

    // --- Determine Advantage/Disadvantage from all sources ---
    const attackerEffects = getConditionEffects(attacker);
    const targetEffects = getConditionEffects(target);

    // Sources of Advantage
    if (attacker.status.isReckless) advantage = true;
    if (target.status.isReckless) advantage = true; // Attacks against a reckless creature have advantage
    if (attacker.abilities.pack_tactics && context.allies.some(ally => ally.id !== attacker.id && ally.hp > 0)) advantage = true;
    if (targetEffects.grantsAdvantageToAttackers) advantage = true;
    if (attackerEffects.advantageOn?.includes('attackRolls')) advantage = true; // e.g. from Invisible
    if (targetEffects.isProne && !action.ranged) advantage = true; // Melee attacks vs prone

    // Sources of Disadvantage
    if (attackerEffects.disadvantageOn?.includes('attackRolls')) disadvantage = true;
    if (targetEffects.grantsDisadvantageToAttackers) disadvantage = true;
    if (targetEffects.isProne && action.ranged) disadvantage = true;

    // Handle Dodge action on the target
    // A creature benefits from Dodging if it's not incapacitated, its speed is not 0, and it can see the attacker.
    if (target.status.isDodging) {
        const targetEffectsForDodge = getConditionEffects(target);
        const isTargetIncapacitated = targetEffectsForDodge.cannot?.includes('takeActions');
        const isTargetSpeedZero = targetEffectsForDodge.speed === 0;

        if (!isTargetIncapacitated && !isTargetSpeedZero && canSee(target, attacker)) {
            disadvantage = true;
            log(`${target.name} is Dodging, imposing disadvantage on the attack.`, 2);
        }
    }

    // Handle conditional disadvantage from Frightened
    if (attackerEffects.disadvantageIfSourceVisible) {
        const frightenedConditions = attacker.status.conditions.filter(c => c.name === 'frightened' && c.sourceId);
        if (frightenedConditions.length > 0) {
            const allCombatantsInContext = [...context.allies, ...context.opponents];
            for (const condition of frightenedConditions) {
                const source = allCombatantsInContext.find(c => c.id === condition.sourceId);
                if (source && source.hp > 0 && canSee(attacker, source)) {
                    disadvantage = true;
                    log(`${attacker.name} has disadvantage on the attack because it is frightened of ${source.name}.`, 2);
                    break; // One visible source is enough to cause disadvantage.
                }
            }
        }
    }

    const rollResult = rollD20(attacker, { advantage, disadvantage, blessed: isBlessed, baned: isBaned });
    if (rollResult.lucky) log(`${attacker.name} uses Lucky to reroll a 1 on an attack!`, 1);

    let totalToHit = rollResult.roll + toHitBonus;
    let logBonuses = [];
    if (isBlessed) logBonuses.push(`+ ${rollResult.blessBonus}[bless]`);
    if (isBaned) logBonuses.push(`- ${rollResult.banePenalty}[bane]`);
    
    let crit = rollResult.rawRoll === 20;
    const hit = crit || (totalToHit >= target.ac && rollResult.rawRoll !== 1);
    
    log(`${attacker.name} attacks ${target.name} with ${action.name}: rolls ${rollResult.rawRoll} + ${toHitBonus} ${logBonuses.join(' ')} = ${totalToHit} vs AC ${target.ac}.`, 1);

    if (hit) {
        // Check for auto-crit conditions like Paralyzed
        if (!crit && targetEffects.autoCritIfMelee && !action.ranged) {
            crit = true;
            log(`${target.name} is vulnerable, turning the hit into a critical hit!`, 2);
        }

        if (crit) log(`<span class="text-yellow-400">Critical Hit!</span>`, 2);
        const gwf = !!attacker.abilities.great_weapon_fighting;
        let damageDice = action.damage;
        let damageBreakdown = [];

        if (crit) {
            // Standard critical hit: double the dice
            damageDice += `+${(action.damage.match(/\d+d\d+/g) || []).join('+')}`;

            // Handle extra dice from abilities like Savage Attacks or Brutal Critical
            if (attacker.abilities.extra_crit_dice && !action.ranged) {
                const extraDiceCount = parseInt(attacker.abilities.extra_crit_dice, 10) || 0;
                if (extraDiceCount > 0) {
                    const weaponDice = (action.damage.match(/\d+d\d+/g) || []);
                    if (weaponDice.length > 0) {
                        const baseDie = weaponDice[0]; // e.g., "2d6"
                        const dieType = baseDie.split('d')[1]; // e.g., "6"
                        const extraDiceNotation = `${extraDiceCount}d${dieType}`;
                        damageDice += `+${extraDiceNotation}`;
                        log(`${attacker.name}'s critical hit is even more savage! (+${extraDiceNotation})`, 2);
                    }
                }
            }
        }

        let baseDamage = rollDice(damageDice, { reroll: gwf ? [1,2] : [] });
        if (attacker.abilities.savage_attacker && !attacker.status.usedSavageAttacker) {
            const rerollDamage = rollDice(damageDice, { reroll: gwf ? [1,2] : [] });
            if (rerollDamage > baseDamage) {
                log(`${attacker.name} uses Savage Attacker to reroll damage.`, 2);
                baseDamage = rerollDamage;
            }
            attacker.status.usedSavageAttacker = true;
        }
        damageBreakdown.push(`${baseDamage}[base]`);
        baseDamage += damageBonus;
        if (damageBonus > 0) damageBreakdown.push(`${damageBonus}[feat]`);

        if (attacker.status.isRaging && attacker.abilities.rage) {
            const rageDmg = parseInt(attacker.abilities.rage);
            baseDamage += rageDmg;
            damageBreakdown.push(`${rageDmg}[rage]`);
        }
        
        if (attacker.abilities.sneak_attack && !attacker.status.usedSneakAttack && (advantage || context.allies.length > 1)) {
            let sneakDice = attacker.abilities.sneak_attack;
            if (crit) sneakDice += `+${sneakDice}`;
            const sneakDamage = rollDice(sneakDice);
            baseDamage += sneakDamage;
            damageBreakdown.push(`${sneakDamage}[sneak]`);
            attacker.status.usedSneakAttack = true;
            log(`${attacker.name} gets Sneak Attack!`, 2);
        }

        if (attacker.abilities.divine_smite && !action.ranged) {
            const smiteLevel = Object.keys(attacker.status.spellSlots).reverse().find(lvl => attacker.status.spellSlots[lvl] > 0);
            if (smiteLevel) {
                attacker.status.spellSlots[smiteLevel]--;
                let smiteDice = `${1 + parseInt(smiteLevel)}d8`;
                if (target.type === 'fiend' || target.type === 'undead') smiteDice = `${2 + parseInt(smiteLevel)}d8`;
                if (crit) smiteDice += `+${smiteDice}`;
                const smiteDamage = rollDice(smiteDice);
                baseDamage += smiteDamage;
                damageBreakdown.push(`${smiteDamage}[smite]`);
                log(`${attacker.name} uses Divine Smite with a level ${smiteLevel} slot!`, 2);
            }
        }

        const finalDamage = applyDamage(target, baseDamage, action.type, !!action.isMagical);
        log(`<span class="text-green-400">Hits</span> for <span class="font-bold text-yellow-300">${finalDamage}</span> damage (${damageBreakdown.join(' + ')}). ${target.name} HP: ${target.hp}`, 2);
        
        // Apply effect on hit
        if (action.effect?.name && action.effect?.duration) {
            const targetEffects = getConditionEffects(target);
            const immunities = [...((target.abilities.immunity || '').split(',')), ...(targetEffects.immunityTo || [])].filter(Boolean);
            if (immunities.includes(action.effect.name)) {
                log(`${target.name} is immune to the ${action.effect.name} condition.`, 3);
            } else {
                const newCondition = deepCopy(action.effect);
                newCondition.sourceId = attacker.id;
                target.status.conditions.push(newCondition);
                log(`${target.name} becomes ${action.effect.name} for ${action.effect.duration} rounds (from ${attacker.name}).`, 3);
            }
        }

        if ((crit || target.hp === 0) && useGWM) {
            attacker.status.canMakeGWMAttack = true;
        }
    } else {
        log(`<span class="text-gray-500">Misses.</span>`, 1);
    }
}

function performSaveAction(attacker, action, context, targets) {
    if (targets.length === 0) {
        log(`${attacker.name} tries to cast ${action.name}, but there are no valid targets.`, 1);
        return;
    }

    log(`${attacker.name} casts ${action.name}, targeting ${targets.map(t=>t.name).join(', ')}.`, 1);

    targets.forEach(target => {
        // Pass the whole action object to provide full context for the save.
        const saved = makeSavingThrow(target, action.save.dc, action.save.type, action);
        if (!saved) { // Failed save
            log(`Target fails the save.`, 2);
            // Handle damage on fail
            if (action.damage) {
                const damage = rollDice(action.damage);
                const finalDamage = applyDamage(target, damage, action.type, !!action.isMagical);
                log(`Takes ${finalDamage} damage.`, 3);
            }
            // Handle effect on fail
            if (action.effect?.name && action.effect?.duration) {
                const targetEffects = getConditionEffects(target);
                const immunities = [...((target.abilities.immunity || '').split(',')), ...(targetEffects.immunityTo || [])].filter(Boolean);
                if (immunities.includes(action.effect.name)) {
                    log(`${target.name} is immune to the ${action.effect.name} condition.`, 3);
                } else {
                    const newCondition = deepCopy(action.effect);
                    newCondition.sourceId = attacker.id;
                    target.status.conditions.push(newCondition);
                    log(`Becomes ${action.effect.name} for ${action.effect.duration} rounds (from ${attacker.name}).`, 3);
                }
            }
        } else { // Successful save
            if (action.half && action.damage) {
                const damage = Math.floor(rollDice(action.damage) / 2);
                const finalDamage = applyDamage(target, damage, action.type, !!action.isMagical);
                log(`Target saves, but takes ${finalDamage} damage.`, 2);
            } else {
                log(`Target saves, no effect.`, 2);
            }
        }
    });
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
    const healAmount = rollDice(action.heal);
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    if (wasDowned) {
        log(`${attacker.name} brings ${target.name} back from the brink with ${action.name}, healing for ${healAmount} HP!`, 1);
    } else {
        log(`${attacker.name} heals ${target.name} for ${healAmount} HP with ${action.name}.`, 1);
    }
}

function _findPoolAbility(attacker, poolName) {
    // Find the stateful ability in the attacker's status object by its name.
    // This relies on setupCombatant having already populated the name.
    for (const key in attacker.status.abilities) {
        const abilityState = attacker.status.abilities[key];
        if (abilityState.pool !== undefined && abilityState.name === poolName) {
            return abilityState;
        }
    }
    return null;
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
    if (injuredTargets.length === 0) {
        log(`${attacker.name} tries to use ${action.name}, but there are no valid targets to heal.`, 1);
        return;
    }
    const target = injuredTargets[0];

    // 3. Determine the actual amount to heal, capped by the pool, the action's amount, and the target's missing HP.
    const missingHp = target.maxHp - target.hp;
    const amountToHeal = Math.min(action.amount, poolAbility.pool, missingHp);

    if (amountToHeal <= 0) {
        log(`${attacker.name} tries to use ${action.name}, but ${target.name} is already at full health.`, 1);
        return;
    }

    // 4. Apply healing, deplete the pool, and log the action.
    target.hp += amountToHeal;
    poolAbility.pool -= amountToHeal;

    log(`${attacker.name} uses ${action.name} to heal ${target.name} for ${amountToHeal} HP. (${poolAbility.pool} points remaining)`, 1);
}

function performEffectAction(attacker, action, context) {
    const targeting = action.targeting || 'any';
    const numTargets = parseInt(action.targets) || 1;
    let potentialTargets = [];

    // Determine if the effect is beneficial (targets allies) or harmful (targets opponents)
    const effectDef = CONDITIONS_LIBRARY[action.effect.name];
    const isBeneficial = effectDef?.type === 'beneficial';

    if (isBeneficial) {
        if (targeting === 'self') {
            potentialTargets = [attacker];
        } else if (targeting === 'other') {
            potentialTargets = context.allies.filter(a => a.id !== attacker.id);
        } else { // 'any'
            potentialTargets = context.allies;
        }
    } else {
        potentialTargets = getValidTargets(attacker, action, context);
    }

    const targets = potentialTargets.slice(0, numTargets);

    if (targets.length === 0) {
        log(`${attacker.name} tries to use ${action.name}, but there are no valid targets.`, 1);
        return;
    }

    log(`${attacker.name} casts ${action.name}, affecting ${targets.map(t=>t.name).join(', ')}.`, 1);
    targets.forEach(t => {
        const targetEffects = getConditionEffects(t);
        const immunities = [...((t.abilities.immunity || '').split(',')), ...(targetEffects.immunityTo || [])].filter(Boolean);
        if (immunities.includes(action.effect.name)) {
            log(`${t.name} is immune to the ${action.effect.name} condition.`, 2);
            return; // Skip to the next target
        }

        const newCondition = deepCopy(action.effect);
        newCondition.sourceId = attacker.id;
        t.status.conditions.push(newCondition);
        log(`${t.name} becomes ${newCondition.name}.`, 2);
    });
}

function performAction(attacker, action, context) {
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

    // Get a fresh list of living combatants for this specific action to avoid targeting defeated enemies.
    const allKnownAllies = [...context.allies, ...(context.downedAllies || [])];
    const freshContext = {
        allies: allKnownAllies.filter(c => c.hp > 0),
        opponents: context.opponents.filter(c => c.hp > 0),
        downedAllies: allKnownAllies.filter(c => c.hp === 0)
    };

    if (freshContext.opponents.length === 0 && !action.heal && action.type !== 'pool_heal' && !action.effect) return;

    // The order of this if/else chain is critical.
    // We check for primary action mechanisms (attack, save) first, as they can also include effects.
    // Heal and Effect-only actions are checked last.
    if (action.toHit) {
        const possibleTargets = getValidTargets(attacker, action, freshContext);
        if (possibleTargets.length > 0) {
            const target = chooseTarget(attacker, possibleTargets);
            performAttackAction(attacker, target, action, freshContext);
        } else {
            log(`${attacker.name} has no valid targets for ${action.name}.`, 1);
        }
    } else if (action.save) {
        let targets = [];
        const possibleTargets = getValidTargets(attacker, action, freshContext);
        if (possibleTargets.length > 0) {
            const numTargets = parseInt(action.targets) || 1;
            if (numTargets === 1) {
                targets.push(chooseTarget(attacker, possibleTargets));
            } else {
                // A simple shuffle to not always target the same N creatures in a group
                const shuffledTargets = [...possibleTargets].sort(() => 0.5 - Math.random());
                targets = shuffledTargets.slice(0, numTargets);
            }
            performSaveAction(attacker, action, freshContext, targets);
        }
    } else if (action.type === 'pool_heal') {
        performPoolHealAction(attacker, action, freshContext);
    } else if (action.heal) {
        performHealAction(attacker, action, freshContext);
    } else if (action.effect) {
        // This should only be for actions that *only* apply an effect.
        performEffectAction(attacker, action, freshContext);
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
            const isBeneficial = effectDef.type === 'beneficial';

            if (isBeneficial) {
                let potentialTargets = [];
                if (targeting === 'self') {
                    potentialTargets = [attacker];
                } else if (targeting === 'other') {
                    potentialTargets = context.allies.filter(a => a.id !== attacker.id);
                } else { // 'any'
                    potentialTargets = context.allies;
                }
                // Only cast if there are valid targets who don't already have the effect
                const validTargets = potentialTargets.filter(ally => !hasCondition(ally, action.effect.name));
                if (validTargets.length > 0) {
                    effectScore = 90; // Base score for a useful buff
                }
            } else { // Harmful effect
                const numActionTargets = parseInt(action.targets) || 1;
                const possibleTargets = getValidTargets(attacker, action, context);
                // Only cast if there are opponents who don't already have the effect
                const validTargets = possibleTargets.filter(opp => !hasCondition(opp, action.effect.name));
                
                // Only consider this action if there are enough valid targets
                if (validTargets.length >= numActionTargets) {
                    effectScore = 85; // Base score for a useful debuff
                }
            }
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
        score += damageScore;
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

function handleTurnStart(attacker) {
    log(`<div class="mt-2"><span class="font-bold text-${attacker.team === 'A' ? 'blue' : 'red'}-400">${attacker.name}'s</span> turn (HP: ${attacker.hp}).</div>`);
    
    attacker.status.usedAction = false;
    attacker.status.usedBonusAction = false;
    attacker.status.usedSneakAttack = false;
    attacker.status.usedSavageAttacker = false;
    attacker.status.canMakeGWMAttack = false;
    attacker.status.isReckless = false;
    attacker.status.isDodging = false;
    attacker.status.loggedCharmMessageThisTurn = false;
    attacker.status.conditions = attacker.status.conditions.filter(c => {
        c.duration--;
        return c.duration > 0;
    });
    
    attacker.attacks.forEach(action => {
        if (action.uses?.per === 'turn') {
            attacker.status.actionUses[action.name.replace(/\s+/g, '_')] = 0;
        }
    });

    if (attacker.abilities.regeneration) {
        const heal = Math.min(parseInt(attacker.abilities.regeneration), attacker.maxHp - attacker.hp);
        if (heal > 0) {
            attacker.hp += heal;
            log(`${attacker.name} regenerates ${heal} HP.`, 1);
        }
    }
}

function handlePreActionBonusActions(attacker, context) {
    if (attacker.status.usedBonusAction) return;

    // In 5e, entering a Rage is a bonus action you typically do at the start of your turn.
    if (attacker.abilities.rage && !attacker.status.isRaging) {
        attacker.status.isRaging = true;
        attacker.status.usedBonusAction = true;
        log(`${attacker.name} uses a bonus action to enter a Rage!`, 1);
    }
}

function handlePostActionBonusActions(attacker, context) {
    if (attacker.status.usedBonusAction) return;

    // A GWM attack is triggered by a crit or kill, which happens during the Action.
    if (attacker.status.canMakeGWMAttack) {
        log(`${attacker.name} uses Great Weapon Master to make a bonus action attack!`, 1);
        const meleeAttack = attacker.attacks.find(a => a.toHit && !a.ranged);
        if (meleeAttack) {
            performAction(attacker, meleeAttack, context);
            attacker.status.usedBonusAction = true;
        }
        return; // This is a high-priority bonus action.
    }

    // Choose any other available bonus action (e.g., a spell).
    const bonusAction = chooseAction(attacker, 'bonus_action', context);
    if (bonusAction) {
        performAction(attacker, bonusAction, context);
        attacker.status.usedBonusAction = true;
    }
}

function handleAction(attacker, context) {
    if (attacker.status.usedAction) return;

    if (attacker.abilities.reckless) {
        attacker.status.isReckless = true;
        log(`${attacker.name} attacks recklessly!`, 1);
    }

    let turnActions = 1;
    if (attacker.status.actionSurgeUses > 0) {
        turnActions = 2;
        attacker.status.actionSurgeUses--;
        log(`${attacker.name} uses Action Surge! (${attacker.status.actionSurgeUses} remaining)`, 1);
    }
    
    for(let i = 0; i < turnActions; i++) {
        const chosenAction = chooseAction(attacker, 'action', context);

        if (chosenAction) {
            // Check if the chosen action is a Multiattack
            if (chosenAction.multiattack) {
                log(`${attacker.name} uses ${chosenAction.name}!`, 1);
                for (const sub of chosenAction.multiattack) {
                    const subAction = attacker.attacks.find(a => a.name === sub.name);
                    if (subAction) {
                        for (let j = 0; j < sub.count; j++) {
                            // Check if the attacker can still take actions (e.g., got stunned mid-sequence)
                            const conditionEffects = getConditionEffects(attacker);
                            if (conditionEffects.cannot && conditionEffects.cannot.includes('takeActions')) {
                                log(`${attacker.name} is incapacitated and cannot continue their Multiattack.`, 1);
                                break; // Break from the inner loop (counts)
                            }
                            performAction(attacker, subAction, context);
                        }
                    } else {
                        log(`Error: Sub-action '${sub.name}' not found for ${attacker.name}'s Multiattack.`, 1);
                    }
                }
            } else {
                // This is a single action
                performAction(attacker, chosenAction, context);
            }
        } else {
            log(`${attacker.name} cannot find a valid action and takes the Dodge action.`, 1);
            attacker.status.isDodging = true;
        }
    }
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

    handleTurnStart(attacker);

    // Check for turn-skipping conditions after handling start-of-turn effects
    const effects = getConditionEffects(attacker);
    if (effects.cannot?.includes('takeActions')) {
        const conditionNames = attacker.status.conditions.map(c => c.name).join(', ');
        log(`${attacker.name} is incapacitated by ${conditionNames} and cannot take actions.`, 1);
        return; // Skip to the next combatant
    }

    const context = getContext(attacker, allCombatants);

    handlePreActionBonusActions(attacker, context);
    handleAction(attacker, context);
    handlePostActionBonusActions(attacker, context);
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
}