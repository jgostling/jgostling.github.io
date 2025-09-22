const poisonResilienceBase = {
    valueType: 'boolean',
    consumesReaction: false,
    trigger: {
        events: ['saving_throw_modifying', 'damage_applying']
    },
    conditions: (reactor, eventData) => {
        if (eventData.eventName === 'saving_throw_modifying') {
            const vsPoison = eventData.sourceAction.damageType === 'poison' || eventData.sourceAction.effect?.name === 'poisoned';
            return reactor.id === eventData.target.id && vsPoison;
        }
        if (eventData.eventName === 'damage_applying') {
            return reactor.id === eventData.target.id && eventData.type === 'poison';
        }
        return false;
    },
};

const poisonResilienceEffect = (reactor, eventData, abilityName) => {
    if (eventData.eventName === 'saving_throw_modifying') {
        log(`${reactor.name} gains advantage on the save from ${abilityName}.`, 2);
        eventData.advantage = true;
    } else if (eventData.eventName === 'damage_applying') {
        eventData.grantResistance = true;
    }
};

const _getPowerAttackScore = (eventData) => {
    // AI logic for the -5 to hit / +10 damage trade-off.
    return eventData.target.ac < 18 ? 20 : 0;
};

var ABILITIES_LIBRARY = {
    // Offensive
    great_weapon_master: {
        name: "Great Weapon Master",
        description: "Take a -5 penalty to the attack roll for +10 damage. On a critical hit or when you reduce a creature to 0 HP with a melee attack, you can make a bonus action attack.",
        valueType: 'boolean',
        consumesReaction: false, // This ability does not use the character's actual reaction.
        trigger: {
            // This ability triggers on two different events.
            events: ['attack_declared', 'attack_hit', 'creature_defeated', 'post_action_bonus_opportunity']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_declared':
                    // Condition 1: The reactor must be the attacker.
                    if (eventData.attacker.id !== reactor.id) return false;
                    // Condition 2: The weapon must be heavy.
                    return !!eventData.action.heavy;
                case 'attack_hit':
                    // Bonus attack only triggers on melee attacks.
                    if (eventData.action.ranged) return false;
                    return eventData.crit === true;
                case 'creature_defeated':
                    return eventData.victor.id === reactor.id;
                case 'post_action_bonus_opportunity':
                    // Condition 1: Reactor must be the one taking the bonus action.
                    if (reactor.id !== eventData.combatant.id) return false;
                    // Condition 2: Must have earned the GWM attack and not used bonus action.
                    return reactor.status.canMakeGWMAttack && !reactor.status.usedBonusAction;
                default:
                    return false;
            }
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_declared':
                    log(`${reactor.name} uses Great Weapon Master (-5 to hit, +10 damage).`, 1);
                    eventData.toHitBonus -= 5;
                    eventData.damageBonus += 10;
                    break;
                case 'attack_hit':
                case 'creature_defeated':
                    reactor.status.canMakeGWMAttack = true;
                    break;
                case 'post_action_bonus_opportunity':
                    log(`${reactor.name} uses Great Weapon Master to make a bonus action attack!`, 1);
                    // Find the best melee attack to use.
                    const meleeAttack = reactor.attacks.find(a => a.toHit && !a.ranged);
                    if (meleeAttack) {
                        performAction(reactor, meleeAttack, eventData.context);
                        reactor.status.usedBonusAction = true;
                    }
                    break;
            }
        },
        getScore: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_declared':
                    return _getPowerAttackScore(eventData);
                case 'post_action_bonus_opportunity':
                    // Always take the bonus attack if available. It's a free attack.
                    return 200; // Very high score to prioritize it over other bonus actions.
                case 'attack_hit':
                case 'creature_defeated':
                    // These are automatic effects that grant the bonus action, not choices.
                    // A score > 0 ensures the effect triggers.
                    return 1;
            }
            return 0;
        }
    },
    sharpshooter: {
        name: "Sharpshooter",
        description: "Take a -5 penalty to the attack roll for +10 to the damage roll. (Applies to ranged weapons)",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the attacker.
            if (eventData.attacker.id !== reactor.id) return false;
            // Condition 2: The weapon must be ranged.
            return !!eventData.action.ranged;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} uses Sharpshooter (-5 to hit, +10 damage).`, 1);
            eventData.toHitBonus -= 5;
            eventData.damageBonus += 10;
        },
        getScore: (reactor, eventData) => {
            return _getPowerAttackScore(eventData);
        }
    },
    savage_attacker: {
        name: "Savage Attacker",
        description: "Once per turn, reroll melee weapon damage and use the higher result.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'damage_rolled'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the attacker.
            if (eventData.attacker.id !== reactor.id) return false;
            // Condition 2: Must be a melee weapon attack.
            if (eventData.action.ranged) return false;
            // Condition 3: Has the ability already been used this turn?
            return !reactor.status.usedSavageAttacker;
        },
        effect: (reactor, eventData) => {
            const gwf = !!reactor.abilities.great_weapon_fighting;
            const rerollDamage = rollDice(eventData.damageDice, { reroll: gwf ? [1, 2] : [] });
            if (rerollDamage > eventData.initialDamage) {
                log(`${reactor.name} uses Savage Attacker to reroll damage.`, 2);
                eventData.initialDamage = rerollDamage;
            }
            reactor.status.usedSavageAttacker = true;
        }
    },
    savage_attacks: {
        name: "Savage Attacks (Half-Orc)",
        description: "On a critical hit with a melee weapon attack, roll one of the weapon’s damage dice one additional time and add it to the damage.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'attack_hit'
        },
        conditions: (reactor, eventData) => {
            // Must be a melee critical hit by the reactor.
            return eventData.attacker.id === reactor.id && eventData.crit === true && !eventData.action.ranged;
        },
        effect: (reactor, eventData) => {
            const weaponDice = (eventData.action.damage.match(/\d*d\d+/) || []);
            if (weaponDice.length > 0) {
                const baseDie = weaponDice[0]; // e.g., "2d6"
                const dieType = baseDie.split('d')[1]; // e.g., "6"
                const bonusDice = `1d${dieType}`;
                log(`${reactor.name}'s critical hit is more savage! (+${bonusDice})`, 2);
                eventData.bonusDamage.push({ amount: bonusDice, type: eventData.action.damageType, source: 'Savage Attacks' });
            }
        }
    },
    brutal_critical: {
        name: "Brutal Critical (Barbarian)",
        description: "Roll additional weapon damage dice when determining the extra damage for a critical hit with a melee attack.",
        valueType: 'number',
        placeholder: 'e.g., 1',
        consumesReaction: false,
        trigger: {
            event: 'attack_hit'
        },
        conditions: (reactor, eventData) => {
            return eventData.attacker.id === reactor.id && eventData.crit === true && !eventData.action.ranged;
        },
        effect: (reactor, eventData) => {
            const extraDiceCount = parseInt(reactor.abilities.brutal_critical, 10) || 0;
            if (extraDiceCount <= 0) return;

            const weaponDice = (eventData.action.damage.match(/\d*d\d+/) || []);
            if (weaponDice.length > 0) {
                const baseDie = weaponDice[0]; // e.g., "2d6"
                const dieType = baseDie.split('d')[1]; // e.g., "6"
                const bonusDice = `${extraDiceCount}d${dieType}`;
                log(`${reactor.name}'s critical hit is brutal! (+${bonusDice})`, 2);
                eventData.bonusDamage.push({ amount: bonusDice, type: eventData.action.damageType, source: 'Brutal Critical' });
            }
        }
    },
    sneak_attack: {
        name: "Sneak Attack",
        description: "Once per turn, add extra damage when you have advantage or an ally is within 5ft of the target.",
        valueType: 'dice',
        placeholder: 'e.g., 3d6',
        consumesReaction: false, // Sneak attack is a free rider, not a reaction action.
        trigger: {
            events: ['attack_hit', 'threat_calculating'],
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_hit': {
                    // Condition 1: The reactor must be the attacker.
                    if (eventData.attacker.id !== reactor.id) {
                        return false;
                    }
                    // Condition 2: Has the ability already been used this turn?
                    if (reactor.status.usedSneakAttack) {
                        return false;
                    }
                    // Condition 3: Check advantage/ally rules.
                    const hasNetAdvantage = eventData.advantage && !eventData.disadvantage;
                    const hasNetDisadvantage = eventData.disadvantage && !eventData.advantage;
                    // Check for a non-incapacitated ally in the frontline (within 5ft).
                    const hasFrontlineAlly = eventData.context.allies.some(
                        ally => ally.id !== reactor.id && (ally.role || 'frontline') === 'frontline'
                    );
                    const canSneakFromAlly = hasFrontlineAlly && !hasNetDisadvantage;

                    return hasNetAdvantage || canSneakFromAlly;
                }
                case 'threat_calculating':
                    // For threat calculation, we assume the conditions will be met.
                    // The reactor must be the combatant whose threat is being calculated.
                    return reactor.id === eventData.combatant.id;
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_hit': {
                    let sneakDice = reactor.abilities.sneak_attack;
                    if (eventData.crit) {
                        sneakDice += `+${sneakDice}`;
                    }
                    log(`${reactor.name} gets Sneak Attack!`, 2);
                    // The damage type is the same as the weapon's.
                    const damageType = eventData.action.damageType;
                    eventData.bonusDamage.push({ amount: sneakDice, type: damageType, source: 'Sneak Attack' });
                    reactor.status.usedSneakAttack = true;
                    break;
                }
                case 'threat_calculating':
                    // Add the average sneak attack damage to the potential damage.
                    eventData.potentialDamage += calculateAverageDamage(reactor.abilities.sneak_attack);
                    break;
            }
        }
    },
    rage: {
        name: "Rage",
        description: "As a bonus action, gain resistance to physical damage and add a bonus to damage rolls.",
        valueType: 'number',
        placeholder: 'e.g., 2',
        consumesReaction: false,
        trigger: {
            events: ['pre_action_bonus_opportunity', 'attack_hit', 'damage_applying']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'pre_action_bonus_opportunity':
                    // Condition 1: Reactor must be the one taking the bonus action.
                    if (reactor.id !== eventData.combatant.id) return false;
                    // Condition 2: Must not already be raging or have used bonus action.
                    return !reactor.status.isRaging && !reactor.status.usedBonusAction;
                case 'attack_hit':
                    // Condition 1: Reactor must be the attacker.
                    if (reactor.id !== eventData.attacker.id) return false;
                    // Condition 2: Must be raging.
                    return reactor.status.isRaging;
                case 'damage_applying':
                    // Condition 1: Reactor must be the target of the damage.
                    if (reactor.id !== eventData.target.id) return false;
                    // Condition 2: Must be raging.
                    if (!reactor.status.isRaging) return false;
                    // Condition 3: Damage must be physical.
                    const isPhysical = ['slashing', 'piercing', 'bludgeoning'].includes(eventData.type);
                    return isPhysical;
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'pre_action_bonus_opportunity':
                    reactor.status.isRaging = true;
                    reactor.status.usedBonusAction = true;
                    log(`${reactor.name} uses a bonus action to enter a Rage!`, 1);
                    break;
                case 'attack_hit':
                    const rageDmg = parseInt(reactor.abilities.rage, 10) || 0;
                    if (rageDmg > 0) {
                        eventData.bonusDamage.push({ amount: `${rageDmg}`, type: eventData.action.damageType, source: 'Rage' });
                    }
                    break;
                case 'damage_applying':
                    eventData.grantResistance = true;
                    break;
            }
        },
        getScore: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'pre_action_bonus_opportunity':
                    // AI logic for when to enter a rage.
                    // A simple heuristic: always rage at the start of combat if there are enemies.
                    return eventData.context.opponents.length > 0 ? 100 : 0; // High score to ensure it's used.
                case 'attack_hit':
                    // This is an automatic offensive effect, not a choice. A score > 0 ensures it triggers.
                    return 1;
                case 'damage_applying':
                    // This is an automatic defensive effect, not a choice. A score > 0 ensures it triggers.
                    return 1;
            }
            return 0;
        }
    },
    divine_smite: {
        name: "Divine Smite",
        description: "When you hit with a melee attack, you can expend a spell slot to deal extra radiant damage.",
        valueType: 'boolean',
        trigger: {
            event: 'attack_hit',
        },
        conditions: (reactor, eventData) => {
            // Condition 1: Reactor must be the attacker.
            if (reactor.id !== eventData.attacker.id) return false;
            // Condition 2: Must be a melee attack.
            if (eventData.action.ranged) return false;
            // Condition 3: Attacker must have spell slots.
            return Object.values(reactor.status.spellSlots).some(count => count > 0);
        },
        effect: (reactor, eventData) => {
            // Find the highest available spell slot.
            const smiteLevel = Object.keys(reactor.status.spellSlots).reverse().find(lvl => reactor.status.spellSlots[lvl] > 0);
            if (smiteLevel) {
                reactor.status.spellSlots[smiteLevel]--;
                let smiteDiceCount = 1 + parseInt(smiteLevel); // e.g., 1st level slot = 2d8
                smiteDiceCount = Math.min(smiteDiceCount, 5); // Max 5d8 for slots of 4th level or higher
                if (eventData.target.type === 'fiend' || eventData.target.type === 'undead') {
                    smiteDiceCount++; // Add 1d8 for fiends/undead
                }
                let smiteDice = `${smiteDiceCount}d8`;
                if (eventData.crit) smiteDice += `+${smiteDice}`; // Double dice on crit
                log(`${reactor.name} uses Divine Smite with a level ${smiteLevel} slot!`, 2);
                eventData.bonusDamage.push({ amount: smiteDice, type: 'radiant', source: 'Divine Smite' });
            }
        },
        getScore: (reactor, eventData) => {
            const target = eventData.target;

            // 1. Highest priority: critical hit.
            if (eventData.crit) {
                return 500;
            }

            // 2. High priority: vulnerable target type.
            if (target.type === 'fiend' || target.type === 'undead') {
                return 200;
            }

            // 3. Moderate priority: finishing blow.
            // Find the lowest available spell slot to be conservative.
            const lowestSlot = Object.keys(reactor.status.spellSlots).find(lvl => reactor.status.spellSlots[lvl] > 0);
            if (lowestSlot) {
                const smiteDiceCount = 1 + parseInt(lowestSlot);
                const avgSmiteDmg = calculateAverageDamage(`${smiteDiceCount}d8`);
                if (target.hp <= avgSmiteDmg) {
                    return 100;
                }
            }

            // 4. Low priority: conserve resources on normal hits.
            return 0;
        }
    },
    // Defensive
    heavy_armor_master: {
        name: "Heavy Armor Master",
        description: "Reduce incoming non-magical bludgeoning, piercing, and slashing damage by 3.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'damage_applying'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the target of the damage.
            if (eventData.target.id !== reactor.id) return false;
            // The damage must be non-magical.
            if (eventData.isMagical) return false;
            // The damage must be one of the physical types.
            const physicalTypes = ['bludgeoning', 'piercing', 'slashing'];
            return physicalTypes.includes(eventData.type);
        },
        effect: (reactor, eventData) => {
            const reduction = 3;
            if (eventData.damage > 0) {
                log(`${reactor.name} reduces damage by ${reduction} with Heavy Armor Master.`, 2);
                eventData.damage = Math.max(0, eventData.damage - reduction);
            }
        }
    },
    magic_resistance: {
        name: "Magic Resistance",
        description: "Advantage on saving throws against spells and other magical effects.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'saving_throw_modifying'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.target.id && eventData.sourceAction.isMagical;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} gains advantage on the save from Magic Resistance.`, 2);
            eventData.advantage = true;
        }
    },
    gnome_cunning: {
        name: "Gnome Cunning",
        description: "Advantage on Intelligence, Wisdom, and Charisma saving throws against magic.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'saving_throw_modifying'
        },
        conditions: (reactor, eventData) => {
            const validSaves = ['int', 'wis', 'cha'];
            return reactor.id === eventData.target.id &&
                   eventData.sourceAction.isMagical &&
                   validSaves.includes(eventData.saveType);
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} gains advantage on the save from Gnome Cunning.`, 2);
            eventData.advantage = true;
        }
    },
    dwarven_resilience: {
        ...poisonResilienceBase,
        name: "Dwarven Resilience",
        description: "Advantage on saving throws against poison, and resistance against poison damage.",
        effect: (reactor, eventData) => poisonResilienceEffect(reactor, eventData, "Dwarven Resilience")
    },
    stout_resilience: {
        ...poisonResilienceBase,
        name: "Stout Resilience",
        description: "Advantage on saving throws against poison, and resistance against poison damage.",
        effect: (reactor, eventData) => poisonResilienceEffect(reactor, eventData, "Stout Resilience")
    },
    fey_ancestry: {
        name: "Fey Ancestry",
        description: "Advantage on saving throws against being charmed.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'saving_throw_modifying'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.target.id && eventData.sourceAction.effect?.name === 'charmed';
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} gains advantage on the save from Fey Ancestry.`, 2);
            eventData.advantage = true;
        }
    },
    brave: {
        name: "Brave",
        description: "Advantage on saving throws against being frightened.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'saving_throw_modifying'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.target.id && eventData.sourceAction.effect?.name === 'frightened';
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} gains advantage on the save from Brave.`, 2);
            eventData.advantage = true;
        }
    },
    danger_sense: {
        name: "Danger Sense",
        description: "Advantage on Dexterity saving throws against effects that you can see. (Simplified for simulator)",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'saving_throw_modifying'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.target.id && eventData.saveType === 'dex';
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} gains advantage on the save from Danger Sense.`, 2);
            eventData.advantage = true;
        }
    },
    legendary_resistance: {
        name: "Legendary Resistance",
        description: "If the creature fails a saving throw, it can choose to succeed instead.",
        valueType: 'number',
        placeholder: 'e.g., 3',
        consumesReaction: false, // This is a free ability, not a true reaction.
        trigger: {
            event: 'saving_throw_failed'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the one who failed the save.
            if (eventData.target.id !== reactor.id) return false;
            // Condition 2: The reactor must have uses of the ability left.
            return reactor.status.legendaryResistances > 0;
        },
        effect: (reactor, eventData) => {
            reactor.status.legendaryResistances--;
            eventData.outcome = 'success';
            log(`${reactor.name} uses Legendary Resistance to succeed! (${reactor.status.legendaryResistances} remaining)`, 2);
        }
    },
    relentless_endurance: {
        name: "Relentless Endurance",
        description: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. (Once per long rest)",
        valueType: 'boolean',
        consumesReaction: false, // This is a free ability, not a true reaction.
        trigger: {
            event: 'reduced_to_0_hp',
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the one being reduced to 0 hp.
            if (eventData.target.id !== reactor.id) {
                return false;
            }
            // Condition 2: The ability must not have been used yet.
            return !reactor.status.usedRelentless;
        },
        effect: (reactor, eventData) => {
            reactor.hp = 1;
            reactor.status.usedRelentless = true;
            log(`${reactor.name} uses Relentless Endurance to stay at 1 HP!`, 2);
        }
    },
    reckless: {
        name: "Reckless Attack",
        description: "Gain advantage on melee strength attacks, but attacks against you have advantage.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This is the offensive part. The reactor must be the attacker making a melee attack.
            return reactor.id === eventData.attacker.id && !eventData.action.ranged;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} attacks recklessly!`, 1);
            eventData.advantage = true;
            // Apply the 'reckless_state' condition which lasts until the start of their next turn.
            // We check if it's already applied to avoid duplicates.
            if (!hasCondition(reactor, 'reckless_state')) {
                reactor.status.conditions.push({ name: 'reckless_state', duration: 2 });
            }
        },
        getScore: (reactor, eventData) => {
            // AI logic for when to use Reckless Attack.
            // A simple heuristic: always use it if you're not at low health.
            // This only applies to the offensive choice, the defensive part is mandatory.
            if (reactor.id === eventData.attacker.id)
                return reactor.hp > reactor.maxHp * 0.25 ? 50 : 0;
            return 0;
        }
    },
    regeneration: {
        name: "Regeneration",
        description: "Regain a set amount of hit points at the start of its turn.",
        valueType: 'number',
        placeholder: 'e.g., 10',
        consumesReaction: false, // This is a free start-of-turn effect.
        trigger: {
            event: 'turn_started'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the one whose turn is starting, and not at max HP.
            return reactor.id === eventData.combatant.id && reactor.hp < reactor.maxHp;
        },
        effect: (reactor, eventData) => {
            const healAmount = parseInt(reactor.abilities.regeneration, 10) || 0;
            const heal = Math.min(healAmount, reactor.maxHp - reactor.hp);
            if (heal > 0) {
                reactor.hp += heal;
                log(`${reactor.name} regenerates ${heal} HP.`, 1);
            }
        }
    },
    // Utility
    action_surge: {
        name: "Action Surge",
        description: "Take one additional action on your turn.",
        valueType: 'number',
        placeholder: 'e.g., 1',
        consumesReaction: false, // Doesn't use the reaction action
        trigger: {
            event: 'extra_action_opportunity'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the one whose turn it is.
            if (reactor.id !== eventData.combatant.id) return false;
            // Condition 2: Must have uses left.
            return reactor.status.actionSurgeUses > 0;
        },
        effect: (reactor, eventData) => {
            reactor.status.actionSurgeUses--;
            log(`${reactor.name} uses Action Surge! (${reactor.status.actionSurgeUses} remaining)`, 1);
            // Set a flag that the main turn loop (executeTurn) will check for.
            // This avoids duplicating the action-handling logic here.
            reactor.status.hasActionSurge = true;
        },
        getScore: (reactor, eventData) => {
            // AI logic for when to use Action Surge.
            // Heuristic: Use it if there's a high-value opportunity.
            // 1. Is there an enemy who is very low on health?
            const killableOpponent = eventData.context.opponents.find(o => o.hp < (reactor.threat || 10));
            if (killableOpponent) {
                return 200; // Very high priority to finish someone off.
            }
            // 2. Are there multiple enemies still up?
            if (eventData.context.opponents.length > 1) {
                return 80; // Good priority to deal more damage.
            }
            return 0; // Don't waste it on a single, healthy opponent.
        }
    },
    // Class Features
    dark_ones_blessing: {
        name: "Dark One's Blessing",
        description: "When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to the value specified (typically your Warlock level + Charisma modifier).",
        valueType: 'number',
        placeholder: 'e.g., 5',
        trigger: {
            event: 'creature_defeated',
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the victor.
            if (eventData.victor.id !== reactor.id) {
                return false;
            }
            // Condition 2: The defeated creature must be on the opposing team.
            if (eventData.victor.team === eventData.defeated.team) {
                return false;
            }
            return true;
        },
        effect: (reactor, eventData) => {
            const thpAmount = parseInt(reactor.abilities.dark_ones_blessing, 10) || 0;
            if (thpAmount > 0) {
                grantTemporaryHp(reactor, thpAmount, "Dark One's Blessing");
            }
        }
    },
    lay_on_hands: {
        name: "Lay on Hands",
        description: "Heal a creature by drawing from a pool of hit points.",
        valueType: 'pool',
        placeholder: 'e.g., 5'
    },
    lucky: {
        name: "Lucky (Halfling)",
        description: "Reroll any 1s on d20 rolls (attack rolls, ability checks, saving throws).",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'd20_rolled'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the one who rolled, and at least one of the rolls must be a 1.
            return eventData.roller.id === reactor.id && eventData.rolls.includes(1);
        },
        effect: (reactor, eventData) => {
            // Per the rules, you can only reroll one of the dice.
            const indexOfOne = eventData.rolls.indexOf(1);
            if (indexOfOne !== -1) {
                eventData.rolls[indexOfOne] = Math.floor(Math.random() * 20) + 1;
                eventData.lucky = true; // Mark that lucky was used for this roll action.
            }
        }
    },
    great_weapon_fighting: {
        name: "Great Weapon Fighting",
        description: "When you roll a 1 or 2 on a damage die for an attack with a two-handed melee weapon, you can reroll the die.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'damage_dice_rolling'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the attacker.
            if (eventData.attacker.id !== reactor.id) return false;
            // The ability only applies to melee weapon attacks.
            return !eventData.action.ranged;
        },
        effect: (reactor, eventData) => {
            // The effect is to add the reroll option to the damage roll.
            eventData.options.reroll = [1, 2];
        }
    },
    protection: {
        name: "Protection",
        description: "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll.",
        valueType: 'boolean',
        trigger: {
            event: 'attack_declared',
        },
        conditions: (reactor, eventData) => {
            // 'reactor' is the combatant with this ability (the Fighter).
            // 'eventData' is the object dispatched by the event bus.
            // It contains { attacker, target, ... }

            // Condition 1: The reactor must be able to see the attacker.
            if (!canSee(reactor, eventData.attacker)) {
                return false;
            }

            // Condition 2: The attack target must not be the reactor themselves.
            if (eventData.target.id === reactor.id) {
                return false;
            }

            // Condition 3: The reactor and target must be adjacent. We'll use roles as a proxy for this.
            // A frontliner can protect another frontliner.
            // We also check team to ensure it's an ally.
            if (reactor.team !== eventData.target.team || (reactor.role || 'frontline') !== 'frontline' || (eventData.target.role || 'frontline') !== 'frontline') {
                return false;
            }

            return true;
        },
        effect: (reactor, eventData) => {
            eventData.disadvantage = true;
            log(`${reactor.name} uses their reaction to protect ${eventData.target.name}!`, 1);
        },
        getScore: (reactor, eventData) => {
            // If the attack already has disadvantage, this reaction provides no benefit.
            if (eventData.disadvantage) {
                return 0;
            }
            const attacker = eventData.attacker;
            const target = eventData.target;
            // Score is based on the attacker's threat and how "squishy" the target is (low AC, low HP).
            const BASELINE_HP = 50; // A baseline for an "average" creature's sturdiness.
            const acFactor = Math.max(1, 25 - target.ac);
            const hpFactor = 1 + (1 - (target.hp / target.maxHp));
            // This new factor makes protecting low-max-HP targets a much higher priority.
            const squishinessFactor = BASELINE_HP / target.maxHp;

            return attacker.threat * acFactor * hpFactor * squishinessFactor;
        }
    },
    advantage_on_initiative: {
        name: "Advantage on Initiative",
        description: "Gain advantage on initiative rolls.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'initiative_rolling'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.combatant.id;
        },
        effect: (reactor, eventData) => {
            eventData.options.advantage = true;
        }
    },
    // Utility/Support
    bardic_inspiration: {
        name: "Bardic Inspiration",
        description: "As a bonus action, grant an inspiration die to an ally within 60 feet that can hear you.",
        valueType: 'pool_and_dice', // e.g., { pool: 5, die: '1d6' }
        placeholder: 'e.g., 1d6',
        consumesReaction: false, // It's a bonus action
        trigger: {
            event: 'pre_action_bonus_opportunity'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: Reactor must be the one taking the bonus action.
            if (reactor.id !== eventData.combatant.id) return false;
            // Condition 2: Must not have used bonus action.
            if (reactor.status.usedBonusAction) return false;
            // Condition 3: Must have uses left.
            const pool = reactor.status.abilities.bardic_inspiration;
            if (!pool || pool.pool <= 0) return false;
            // Condition 4: Must have a valid ally to inspire.
            const validAllies = eventData.context.allies.filter(
                a => a.id !== reactor.id && !hasCondition(a, 'inspired')
            );
            return validAllies.length > 0;
        },
        effect: (reactor, eventData) => {
            const pool = reactor.status.abilities.bardic_inspiration;
            // Find best ally to inspire (for now, just the first valid one).
            const target = eventData.context.allies.find(
                a => a.id !== reactor.id && !hasCondition(a, 'inspired')
            );
            if (target) {
                log(`${reactor.name} uses Bardic Inspiration to inspire ${target.name}!`, 1);
                applyCondition(reactor, target, {
                    name: 'inspired',
                    duration: 100, // 10 minutes is effectively the whole combat
                    die: pool.die
                });
                pool.pool--;
                reactor.status.usedBonusAction = true;
            }
        },
        getScore: (reactor, eventData) => {
            // AI logic: Use it if there's an ally who can benefit.
            const validAllies = eventData.context.allies.filter(
                a => a.id !== reactor.id && !hasCondition(a, 'inspired')
            );
            // High score to prioritize over other bonus actions, but not as high as a "free" attack like GWM.
            return validAllies.length > 0 ? 95 : 0;
        }
    },
    // --- Monster Abilities ---
    pack_tactics: {
        name: "Pack Tactics",
        description: "Gain advantage on an attack roll against a creature if at least one of your allies is within 5 feet of the creature and the ally isn't incapacitated.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the attacker.
            if (eventData.attacker.id !== reactor.id) return false;
            // Condition 2: At least one non-incapacitated ally must be in the frontline.
            const hasFrontlineAlly = eventData.context.allies.some(
                ally => ally.id !== reactor.id && (ally.role || 'frontline') === 'frontline'
            );
            return hasFrontlineAlly;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} has advantage on the attack from Pack Tactics.`, 2);
            eventData.advantage = true;
        }
    },
    blood_frenzy: {
        name: "Blood Frenzy",
        description: "The creature has advantage on attack rolls against any target that does not have all of its hit points.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the attacker.
            if (eventData.attacker.id !== reactor.id) return false;
            // Condition 2: The target must be wounded (not at max HP).
            return eventData.target.hp < eventData.target.maxHp;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} has advantage on the attack from Blood Frenzy.`, 2);
            eventData.advantage = true;
        }
    },

    rampage: {
        name: "Rampage",
        description: "When the creature reduces an enemy to 0 HP on its turn, it can use a bonus action to make an attack.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            events: ['creature_defeated', 'post_action_bonus_opportunity']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'creature_defeated':
                    // Condition 1: The reactor must be the victor.
                    return eventData.victor.id === reactor.id;
                case 'post_action_bonus_opportunity':
                    // Condition 1: Reactor must be the one taking the bonus action.
                    if (reactor.id !== eventData.combatant.id) return false;
                    // Condition 2: Must have earned the Rampage attack and not used bonus action.
                    return reactor.status.canMakeRampageAttack && !reactor.status.usedBonusAction;
                default:
                    return false;
            }
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'creature_defeated':
                    reactor.status.canMakeRampageAttack = true;
                    break;
                case 'post_action_bonus_opportunity':
                    log(`${reactor.name} uses Rampage to make a bonus action attack!`, 1);
                    // Find the best available melee attack.
                    const meleeAttack = reactor.attacks.find(a => a.toHit && !a.ranged);
                    if (meleeAttack) {
                        performAction(reactor, meleeAttack, eventData.context);
                        reactor.status.usedBonusAction = true;
                    }
                    break;
            }
        },
        getScore: (reactor, eventData) => {
            // This is a free bonus action attack, so it should always be taken if available.
            return 200;
        }
    },

    sure_footed: {
        name: "Sure-Footed",
        description: "The creature has advantage on saving throws made against effects that would knock it prone.",
        valueType: 'boolean',
        consumesReaction: false,
        trigger: {
            event: 'saving_throw_modifying'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the target of the save.
            if (reactor.id !== eventData.target.id) return false;
            // Condition 2: The source action must be one that can cause the 'prone' condition.
            return eventData.sourceAction?.effect?.name === 'prone';
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} gains advantage on the save from Sure-Footed.`, 2);
            eventData.advantage = true;
        }
    },

    charge: {
        name: "Charge",
        description: "If the creature attacks a new target on its turn, it can choose to charge, dealing extra damage and potentially knocking the target prone.",
        valueType: 'charge_config',
        consumesReaction: false,
        trigger: {
            events: ['target_scoring', 'attack_declared', 'attack_hit', 'post_attack_hit', 'action_scoring', 'threat_calculating']
        },
        conditions: (reactor, eventData) => {
            const chargeConfig = reactor.abilities.charge || {};
            if (!chargeConfig.damage) return false;

            switch (eventData.eventName) {
                case 'target_scoring':
                    if (reactor.id !== eventData.attacker.id) return false;
                    return !reactor.status.engagedWith.includes(eventData.target.id);
                case 'attack_declared':
                    if (reactor.id !== eventData.attacker.id) return false;
                    if (eventData.action.ranged) return false;
                    // If attackName is specified, the action name must match.
                    if (chargeConfig.attackName && eventData.action.name !== chargeConfig.attackName) {
                        return false;
                    }
                    return !reactor.status.engagedWith.includes(eventData.target.id);
                case 'attack_hit':
                    return reactor.id === eventData.attacker.id && eventData.chargeActivated === true;
                case 'post_attack_hit':
                    return reactor.id === eventData.attacker.id && eventData.chargeActivated === true;
                case 'action_scoring': {
                    if (reactor.id !== eventData.attacker.id) return false;
                    if (chargeConfig.attackName && eventData.action.name !== chargeConfig.attackName) return false;
                    const hasNewTarget = eventData.context.opponents.some(opp => !reactor.status.engagedWith.includes(opp.id));
                    return hasNewTarget;
                }
                case 'threat_calculating':
                    return reactor.id === eventData.combatant.id;
            }
            return false;
        },
        effect: (reactor, eventData) => {
            const chargeConfig = reactor.abilities.charge || {};
            switch (eventData.eventName) {
                case 'target_scoring': {
                    eventData.score += calculateAverageDamage(chargeConfig.damage);
                    break;
                }
                case 'attack_declared':
                    log(`${reactor.name} charges at ${eventData.target.name}!`, 2);
                    eventData.chargeActivated = true;
                    break;
                case 'attack_hit': {
                    eventData.bonusDamage.push({ amount: chargeConfig.damage, type: eventData.action.damageType, source: 'Charge' });
                    break;
                }
                case 'post_attack_hit': {
                    // Only force a save if the DC is configured.
                    if (chargeConfig.dc) {
                        const saveResult = makeSavingThrow(eventData.target, chargeConfig.dc, chargeConfig.type, chargeConfig);
                        if (!saveResult.passed) {
                            applyCondition(reactor, eventData.target, { name: chargeConfig.effect || 'prone' }, chargeConfig.dc, eventData.context);
                        }
                    }
                    break;
                }
                case 'action_scoring':
                    eventData.score += calculateAverageDamage(chargeConfig.damage);
                    break;
                case 'threat_calculating':
                    // Only add threat if the charge is tied to an attack the combatant actually has.
                    if (chargeConfig.attackName) {
                        const hasChargeAttack = (reactor.attacks || []).some(a => a.name === chargeConfig.attackName);
                        if (!hasChargeAttack) break;
                    }
                    eventData.potentialDamage += calculateAverageDamage(chargeConfig.damage);
                    break;
            }
        },
        getScore: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'target_scoring':
                    return 1; // Automatic score modification, not an AI choice.
                case 'attack_declared':
                    return 100; // High score for the AI to choose to use the ability.
                case 'attack_hit':
                    return 1; // Automatic on-hit effect, not an AI choice.
                case 'post_attack_hit':
                    return 1; // Automatic on-hit effect, not an AI choice.
                case 'action_scoring':
                    return 1; // Automatic score modification
                case 'threat_calculating':
                    return 1; // Automatic score modification
            }
            return 0; // Default to 0 for any other case.
        }
    },

    // --- AI & Internal Abilities ---
    system_concentration_incapacitated: {
        name: "System: Concentration on Incapacitation",
        description: "Internal system to handle breaking concentration when incapacitated or defeated.",
        valueType: 'boolean',
        category: 'internal',
        consumesReaction: false,
        trigger: {
            events: ['condition_applied', 'creature_defeated'] // Changed to listen for the new, later event.
        },
        conditions: (reactor, eventData) => {
            const target = eventData.target || eventData.defeated;
            // The reactor must be the one affected by the condition or being defeated.
            if (reactor.id !== target.id) return false;
            // The reactor must be concentrating on a spell.
            return !!reactor.status.concentratingOn;
        },
        effect: (reactor, eventData) => {
            if (eventData.eventName === 'creature_defeated') {
                breakConcentration(reactor, eventData.context);
            } else if (eventData.eventName === 'condition_applied') {
                const conditionDef = CONDITIONS_LIBRARY[eventData.condition.name];
                if (conditionDef?.includes?.includes('incapacitated')) {
                    breakConcentration(reactor, eventData.context);
                }
            }
        }
    },
    system_concentration_save: {
        name: "System: Concentration Save",
        description: "Internal system to handle concentration saves when taking damage.",
        valueType: 'boolean',
        category: 'internal',
        consumesReaction: false,
        trigger: {
            event: 'damage_applying'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the target of the damage.
            if (reactor.id !== eventData.target.id) return false;
            // The reactor must be concentrating on a spell.
            return !!reactor.status.concentratingOn;
        },
        effect: (reactor, eventData) => {
            const damageTaken = eventData.damage;
            const dc = Math.max(10, Math.floor(damageTaken / 2));
            log(`${reactor.name} must make a DC ${dc} Constitution save to maintain concentration.`, 1);
            
            const saveResult = makeSavingThrow(reactor, dc, 'con', {}, eventData.context); // sourceAction can be empty
            
            if (!saveResult.passed) {
                log(`${reactor.name} fails the concentration save!`, 1);
                breakConcentration(reactor, eventData.context);
            } else {
                log(`${reactor.name} succeeds and maintains concentration.`, 1);
            }
        }
    },
    system_turn_end_handler: {
        name: "System: Turn End Handler",
        description: "Internal system to handle conditions that allow for a save at the end of a turn.",
        valueType: 'boolean',
        category: 'internal',
        consumesReaction: false,
        trigger: {
            event: 'turn_ended'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the one whose turn is ending.
            // This handler needs to run on every turn end to check for relative durations on other combatants.
            // The effect logic will be responsible for ensuring it only acts once.
            // We only need one instance of this handler to run, so we tie it to the combatant whose turn is ending.
            return reactor.id === eventData.combatant.id;
        },
        effect: (reactor, eventData) => {
            const activeCombatant = eventData.combatant; // The one whose turn is ending
            const allCombatants = eventData.allCombatants;
            if (!allCombatants) return; // Safeguard if the event payload is missing the array

            for (const combatant of allCombatants) {
                if (!combatant.status.conditions || combatant.status.conditions.length === 0) continue;

                const conditionsToRemove = new Set();

                // Handle repeating saves only for the active combatant
                if (combatant.id === activeCombatant.id) {
                    const conditionsToSaveAgainst = combatant.status.conditions.filter(
                        cond => cond.repeating_save?.event === 'turn_ended'
                    );
                    for (const condition of conditionsToSaveAgainst) {
                        log(`${combatant.name} attempts to save against ${condition.name}.`, 1);
                        const saveResult = makeSavingThrow(combatant, condition.saveDC, condition.repeating_save.type, {}, eventData.context);
                        if (saveResult.passed) {
                            log(`${combatant.name} breaks free from the ${condition.name} condition!`, 1);
                            conditionsToRemove.add(condition);
                        } else {
                            log(`${combatant.name} fails to break free.`, 1);
                        }
                    }
                }

                // Handle duration decrements for all combatants
                combatant.status.conditions.forEach(cond => {
                    let shouldDecrement = false;
                    if (cond.duration?.turnEnds) {
                        if (cond.duration.relativeTo === 'source') {
                            if (cond.sourceId === activeCombatant.id) shouldDecrement = true;
                        } else {
                            if (combatant.id === activeCombatant.id) shouldDecrement = true;
                        }
                    }
                    if (shouldDecrement) {
                        cond.duration.turnEnds--;
                    }
                });

                // Now, filter out any conditions that have expired or were saved against.
                combatant.status.conditions = combatant.status.conditions.filter(cond => {
                    if (conditionsToRemove.has(cond)) {
                        return false;
                    }
                    if (cond.duration?.turnEnds <= 0) {
                        const conditionDef = CONDITIONS_LIBRARY[cond.name];
                        const displayName = conditionDef ? conditionDef.name : cond.name;
                        log(`The ${displayName} effect on ${combatant.name} has expired.`, 1);
                        return false; // Discard expired condition
                    }
                    return true; // Keep the condition
                });
            }
        }
    },
    base_ai_targeting: {
        name: "Base AI Targeting",
        description: "The default logic for scoring potential targets based on threat, remaining HP, and kill potential.",
        valueType: 'boolean',
        category: 'internal',
        consumesReaction: false, // Not a reaction
        trigger: {
            event: 'target_scoring'
        },
        conditions: (reactor, eventData) => {
            // This logic applies when the reactor is the one attacking.
            return reactor.id === eventData.attacker.id;
        },
        effect: (reactor, eventData) => {
            const attacker = eventData.attacker;
            const target = eventData.target;
            
            // Factor 1: Prioritize higher threat targets
            eventData.score += (target.threat || 1) * 1.5;

            // Factor 2: Prioritize wounded targets
            const hpPercent = target.hp / target.maxHp;
            eventData.score += (1 - hpPercent) * 50;

            // Factor 3: Huge bonus for a likely kill this turn
            if ((attacker.threat || 0) >= target.hp) {
                eventData.score += 100;
            }
        }
    },
    // Resistances etc.
    resistance: {
        name: "Damage Resistance",
        description: "Take half damage from the specified types.",
        valueType: 'string',
        placeholder: 'e.g., fire,cold',
        consumesReaction: false,
        trigger: {
            event: 'damage_applying'
        },
        conditions: (reactor, eventData) => {
            if (reactor.id !== eventData.target.id) return false;
            const resistances = (reactor.abilities.resistance || '').split(',').map(r => r.trim());
            return resistances.includes(eventData.type) || resistances.includes('all');
        },
        effect: (reactor, eventData) => {
            eventData.grantResistance = true;
        }
    },
    vulnerability: {
        name: "Damage Vulnerability",
        description: "Take double damage from the specified types.",
        valueType: 'string',
        placeholder: 'e.g., fire,cold',
        consumesReaction: false,
        trigger: {
            event: 'damage_applying'
        },
        conditions: (reactor, eventData) => {
            if (reactor.id !== eventData.target.id) return false;
            const vulnerabilities = (reactor.abilities.vulnerability || '').split(',').map(v => v.trim());
            return vulnerabilities.includes(eventData.type);
        },
        effect: (reactor, eventData) => {
            eventData.grantVulnerability = true;
        }
    },
    immunity: {
        name: "Damage & Condition Immunity",
        description: "Take no damage from specified types and ignore specified conditions.",
        valueType: 'string',
        placeholder: 'e.g., poison,fire,charmed',
        consumesReaction: false,
        trigger: {
            events: ['damage_applying', 'condition_applying']
        },
        conditions: (reactor, eventData) => {
            if (reactor.id !== eventData.target.id) return false;
            const immunities = (reactor.abilities.immunity || '').split(',').map(i => i.trim());

            if (eventData.eventName === 'damage_applying') {
                return immunities.includes(eventData.type) || immunities.includes('all');
            }
            if (eventData.eventName === 'condition_applying') {
                return immunities.includes(eventData.condition.name);
            }
            return false;
        },
        effect: (reactor, eventData) => {
            eventData.isImmune = true;
        }
    }
};