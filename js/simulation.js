// js/simulation.js

let log;

function setupCombatant(c) {
    return {
        ...deepCopy(c),
        status: {
            usedBonusAction: false, usedAction: false, usedActionSurge: false,
            isRaging: false, usedRelentless: false, usedSneakAttack: false,
            usedSavageAttacker: false, canMakeGWMAttack: false,
            actionUses: {}, spellSlots: deepCopy(c.spell_slots),
            conditions: [], legendaryResistances: parseInt(c.abilities.legendary_resistance) || 0,
            isReckless: false,
        }
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
    return { opponents, allies };
}

function hasCondition(c, name) {
    return c.status.conditions.some(cond => cond.name === name);
}

function applyDamage(target, damage, type, isMagical = false) {
    let finalDamage = damage;
    const typeLower = (type || 'physical').toLowerCase();
    const isPhysical = ['slashing', 'piercing', 'bludgeoning'].includes(typeLower);

    if (target.abilities.heavy_armor_master && isPhysical && !isMagical) {
        const reduction = 3;
        finalDamage = Math.max(0, finalDamage - reduction);
        log(`${target.name} reduces damage by ${reduction} with Heavy Armor Master.`, 2);
    }
    if (target.status.isRaging && isPhysical) {
        finalDamage = Math.floor(finalDamage / 2);
        log(`${target.name} resists physical damage from Rage.`, 2);
    }
    if (target.abilities.resistance?.includes(typeLower)) {
        finalDamage = Math.floor(finalDamage / 2);
        log(`${target.name} resists the ${typeLower} damage.`, 2);
    }
    if (target.abilities.vulnerability?.includes(typeLower)) {
        finalDamage = finalDamage * 2;
        log(`${target.name} is vulnerable to the ${typeLower} damage!`, 2);
    }
    if (target.abilities.immunity?.includes(typeLower)) {
        finalDamage = 0;
        log(`${target.name} is immune to the ${typeLower} damage!`, 2);
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

function makeSavingThrow(target, dc, type, isMagical = false) {
    const advantage = isMagical && !!target.abilities.magic_resistance;
    const disadvantage = hasCondition(target, 'restrained') && type === 'dex';
    const isBlessed = hasCondition(target, 'blessed');
    const isBaned = hasCondition(target, 'baned');
    
    const rollResult = rollD20(target, { advantage, disadvantage, blessed: isBlessed, baned: isBaned });
    if (rollResult.lucky) {
        log(`${target.name} uses Lucky to reroll a 1 on a save!`, 2);
    }

    let total = rollResult.roll + (target.saves[type] || 0);
    let logBonuses = [];

    if (isBlessed) logBonuses.push(` +${rollResult.blessBonus}[bless]`);
    if (isBaned) logBonuses.push(` -${rollResult.banePenalty}[bane]`);
    
    log(`${target.name} rolls a ${type.toUpperCase()} save: ${rollResult.rawRoll} + ${target.saves[type] || 0} ${logBonuses.join(' ')} = ${total} vs DC ${dc}`, 2);
    
    if (total < dc && target.status.legendaryResistances > 0) {
        target.status.legendaryResistances--;
        log(`${target.name} uses Legendary Resistance to succeed! (${target.status.legendaryResistances} remaining)`, 2);
        return true;
    }
    return total >= dc;
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
    const hasAdvantage = attacker.status.isReckless || target.status.isReckless || (attacker.abilities.pack_tactics && context.allies.some(ally => ally.id !== attacker.id && ally.hp > 0));
    
    const rollResult = rollD20(attacker, { advantage: hasAdvantage, blessed: isBlessed, baned: isBaned });
    if (rollResult.lucky) log(`${attacker.name} uses Lucky to reroll a 1 on an attack!`, 1);

    let totalToHit = rollResult.roll + toHitBonus;
    let logBonuses = [];
    if (isBlessed) logBonuses.push(`+ ${rollResult.blessBonus}[bless]`);
    if (isBaned) logBonuses.push(`- ${rollResult.banePenalty}[bane]`);
    
    const crit = rollResult.rawRoll === 20;
    const hit = crit || (totalToHit >= target.ac && rollResult.rawRoll !== 1);
    
    log(`${attacker.name} attacks ${target.name} with ${action.name}: rolls ${rollResult.rawRoll} + ${toHitBonus} ${logBonuses.join(' ')} = ${totalToHit} vs AC ${target.ac}.`, 1);

    if (hit) {
        if (crit) log(`<span class="text-yellow-400">Critical Hit!</span>`, 2);
        const gwf = !!attacker.abilities.great_weapon_fighting;
        let damageDice = action.damage;
        let damageBreakdown = [];

        if (crit) damageDice += `+${(action.damage.match(/\d+d\d+/g) || []).join('+')}`;
        
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
        
        if (attacker.abilities.sneak_attack && !attacker.status.usedSneakAttack && (hasAdvantage || context.allies.length > 1)) {
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

        const finalDamage = applyDamage(target, baseDamage, action.type, action.spellLevel > 0);
        log(`<span class="text-green-400">Hits</span> for <span class="font-bold text-yellow-300">${finalDamage}</span> damage (${damageBreakdown.join(' + ')}). ${target.name} HP: ${target.hp}`, 2);
        
        if ((crit || target.hp === 0) && useGWM) {
            attacker.status.canMakeGWMAttack = true;
        }
    } else {
        log(`<span class="text-gray-500">Misses.</span>`, 1);
    }
}

function performSaveAction(attacker, action, context) {
    const numTargets = parseInt(action.targets) || 1;
    const targets = context.opponents.slice(0, numTargets);
    log(`${attacker.name} casts ${action.name}, targeting ${targets.map(t=>t.name).join(', ')}.`, 1);

    targets.forEach(target => {
        const saved = makeSavingThrow(target, action.save.dc, action.save.type, true);
        if (!saved) {
            const damage = rollDice(action.damage);
            const finalDamage = applyDamage(target, damage, action.type, true);
            log(`Target fails, takes ${finalDamage} damage.`, 2);
        } else if (action.half) {
            const damage = Math.floor(rollDice(action.damage) / 2);
            const finalDamage = applyDamage(target, damage, action.type, true);
            log(`Target saves, takes ${finalDamage} damage.`, 2);
        } else {
            log(`Target saves, no effect.`, 2);
        }
    });
}

function performHealAction(attacker, action, context) {
    const allies = context.allies.filter(a => a.hp < a.maxHp).sort((a,b) => a.hp - b.hp);
    const target = allies[0] || attacker;
    const healAmount = rollDice(action.heal);
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    log(`${attacker.name} heals ${target.name} for ${healAmount} HP with ${action.name}.`, 1);
}

function performEffectAction(attacker, action, context) {
    const targets = action.effect.name === 'blessed' ? context.allies.slice(0, parseInt(action.targets) || 1) : context.opponents.slice(0, parseInt(action.targets) || 1);
    log(`${attacker.name} casts ${action.name}, affecting ${targets.map(t=>t.name).join(', ')}.`, 1);
    targets.forEach(t => t.status.conditions.push(deepCopy(action.effect)));
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
    const freshContext = {
        allies: context.allies.filter(c => c.hp > 0),
        opponents: context.opponents.filter(c => c.hp > 0)
    };

    if (freshContext.opponents.length === 0 && !action.heal && !action.effect) return;

    if (action.heal) performHealAction(attacker, action, freshContext);
    else if (action.effect) performEffectAction(attacker, action, freshContext);
    else if (action.toHit) {
        const target = freshContext.opponents[0];
        if (target) performAttackAction(attacker, target, action, freshContext);
    }
    else if (action.save) performSaveAction(attacker, action, freshContext);
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
    let bestScore = -1;

    for (const action of possibleActions) {
        let score = -1; 
        if (action.heal) {
            const injuredAllies = context.allies.filter(ally => ally.hp < ally.maxHp * 0.5); 
            if (injuredAllies.length > 0) {
                const mostInjured = injuredAllies.sort((a,b) => a.hp - b.hp)[0];
                score = 100 + (1 - (mostInjured.hp / mostInjured.maxHp)) * 100;
            }
        } else if (action.effect) {
            if (action.effect.name === 'blessed') {
                if (!context.allies.some(ally => hasCondition(ally, 'blessed'))) score = 90;
            } else if (action.effect.name === 'baned') {
                if (!context.opponents.some(opp => hasCondition(opp, 'baned'))) score = 85;
            }
        } else if (action.damage) {
            score = rollDice(action.damage);
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
    if (attacker.abilities.action_surge && !attacker.status.usedActionSurge) {
        turnActions = 2;
        attacker.status.usedActionSurge = true;
        log(`${attacker.name} uses Action Surge!`, 1);
    }
    
    for(let i = 0; i < turnActions; i++) {
        if (attacker.abilities.multiattack) {
            log(`${attacker.name} uses Multiattack!`, 1);
            const attacks = attacker.abilities.multiattack.split(';');
            attacks.forEach(attackString => {
                const [count, name] = attackString.split('/');
                const action = attacker.attacks.find(a => a.name.toLowerCase() === name.toLowerCase().trim());
                if (action) {
                    for (let j = 0; j < parseInt(count); j++) {
                        performAction(attacker, action, context);
                    }
                }
            });
        } else {
            const action = chooseAction(attacker, 'action', context);
            if (action) performAction(attacker, action, context);
        }
    }
    attacker.status.usedAction = true;
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

        allCombatants.forEach(c => {
            if (c.hp > 0) {
                c.attacks.forEach(action => {
                    if (action.uses?.per === 'round') {
                        c.status.actionUses[action.name.replace(/\s+/g, '_')] = 0;
                    }
                });
            }
        });

        for (const attacker of allCombatants) {
            if (attacker.hp <= 0) continue;

            handleTurnStart(attacker);
            const context = getContext(attacker, allCombatants);

            handlePreActionBonusActions(attacker, context);
            handleAction(attacker, context);
            handlePostActionBonusActions(attacker, context);

            const teamAliveA = combatantsA.some(c => c.hp > 0);
            const teamAliveB = combatantsB.some(c => c.hp > 0);
            if (!teamAliveA) return 'B';
            if (!teamAliveB) return 'A';
        }
        round++;
    }
    return 'Draw';
}