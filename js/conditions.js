function _getIncapacitatedReason(reactor) {
    return reactor.status.conditions
        .filter(c => {
            const condDef = CONDITIONS_LIBRARY[c.name];
            return condDef?.includes?.includes('incapacitated') || c.name === 'incapacitated';
        })
        .map(c => c.name)
        .join(', ') || 'an unknown effect';
}

function _incapacitatedEffect(reactor, eventData) {
    eventData.canAct = false;
    eventData.reason = _getIncapacitatedReason(reactor);
}


var CONDITIONS_LIBRARY = {
    // Core Conditions from PHB Appendix A
    blinded: {
        name: "Blinded",
        description: "A blinded creature can’t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage.",
        effects: {
            isBlinded: true, // This is still useful for canSee()
        },
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks by the reactor, and attacks against the reactor.
            return reactor.id === eventData.attacker.id || reactor.id === eventData.target.id;
        },
        effect: (reactor, eventData) => {
            if (reactor.id === eventData.attacker.id) {
                log(`${reactor.name} is blinded and has disadvantage on the attack.`, 2);
                eventData.disadvantage = true;
            }
            if (reactor.id === eventData.target.id) {
                log(`Attacks against the blinded ${reactor.name} have advantage.`, 2);
                eventData.advantage = true;
            }
        },
    },
    charmed: {
        name: "Charmed",
        description: "A charmed creature can’t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.",
        trigger: {
            event: 'targets_filtering'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: The reactor must be the attacker.
            if (reactor.id !== eventData.attacker.id) return false;
            // Condition 2: The action must be harmful.
            const isHarmful = !eventData.action.heal;
            if (!isHarmful) return false;
            // Condition 3: The reactor must actually be charmed by someone.
            return reactor.status.conditions.some(c => c.name === 'charmed' && c.sourceId);
        },
        effect: (reactor, eventData) => {
            // Get all sources that have charmed the reactor.
            const charmerIds = reactor.status.conditions
                .filter(c => c.name === 'charmed' && c.sourceId)
                .map(c => c.sourceId);

            if (charmerIds.length === 0) return;

            // Find which of the potential targets are charmers.
            const charmersInTargets = eventData.potentialTargets.filter(t => charmerIds.includes(t.id));

            if (charmersInTargets.length > 0) {
                if (!reactor.status.loggedCharmMessageThisTurn) {
                    const charmerNames = charmersInTargets.map(c => c.name).join(', ');
                    log(`${reactor.name} is charmed by ${charmerNames} and cannot target them.`, 1);
                    reactor.status.loggedCharmMessageThisTurn = true;
                }
                // Filter out the charmers from the list of potential targets.
                eventData.potentialTargets = eventData.potentialTargets.filter(t => !charmerIds.includes(t.id));
            }
        }
    },
    deafened: {
        name: "Deafened",
        description: "A deafened creture can't hear and automatically fails any ability check that requires hearing.",
        effects: {
            // Note: Needs to be checked in specific spells and effects.
        }
    },
    dodging: {
        name: "Dodging",
        description: "Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage. You lose this benefit if you are incapacitated or if your speed is reduced to 0.",
        type: 'beneficial',
        category: 'internal',
        consumesReaction: false,
        trigger: {
            events: ['attack_declared', 'saving_throw_modifying']
        },
        conditions: (reactor, eventData) => {
            // Condition 1: Reactor must be the target of the effect.
            if (reactor.id !== eventData.target.id) return false;

            // Condition 2: Check the general rules for losing the Dodge benefit.
            const effects = getConditionEffects(reactor);
            if (effects.cannot?.includes('takeActions') || effects.speed === 0) {
                return false;
            }

            // Condition 3: Check the specific event and its rules.
            switch (eventData.eventName) {
                case 'attack_declared':
                    // Must be able to see the attacker.
                    return canSee(reactor, eventData.attacker);
                case 'saving_throw_modifying':
                    // Only applies to DEX saves.
                    return eventData.saveType === 'dex';
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_declared':
                    log(`${reactor.name} is Dodging, imposing disadvantage on the attack.`, 2);
                    eventData.disadvantage = true;
                    break;
                case 'saving_throw_modifying':
                    log(`${reactor.name} has advantage on the DEX save from Dodging.`, 2);
                    eventData.advantage = true;
                    break;
            }
        },
        getLogPhrase: (target, attacker, effect) => {
            // This condition provides a full, custom log message.
            return `${target.name} is now dodging until the start of its next turn.`;
        }
    },
    frightened: {
        name: "Frightened",
        description: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can’t willingly move closer to the source of its fear.",
        consumesReaction: false,
        trigger: {
            event: 'attack_declared' // In the future, this could also include 'ability_check_declared'
        },
        conditions: (reactor, eventData) => {
            // Condition 1: This only affects the creature's own attack rolls.
            if (reactor.id !== eventData.attacker.id) return false;

            // Condition 2: Find the source of fear and check visibility.
            const frightenedCondition = reactor.status.conditions.find(c => c.name === 'frightened' && c.sourceId);
            if (!frightenedCondition) return false;

            const allCombatantsInContext = [...eventData.context.allies, ...eventData.context.opponents];
            const source = allCombatantsInContext.find(c => c.id === frightenedCondition.sourceId);

            // If the source is gone or can't be seen, the condition has no effect on the attack.
            return source && source.hp > 0 && canSee(reactor, source);
        },
        effect: (reactor, eventData, conditionInstance) => {
            // We need to find the source again to include its name in the log.
            const allCombatantsInContext = [...eventData.context.allies, ...eventData.context.opponents];
            const source = allCombatantsInContext.find(c => c.id === conditionInstance.sourceId);

            log(`${reactor.name} has disadvantage on the attack because it is frightened of ${source.name}.`, 2);
            eventData.disadvantage = true;
        }
    },
    grappled: {
        name: "Grappled",
        description: "A grappled creature's speed becomes 0.",
        effects: {
            speed: 0
        }
    },
    incapacitated: {
        name: "Incapacitated",
        description: "An incapacitated creature can’t take actions or reactions.",
        effects: { cannot: ['takeActions', 'takeReactions'] },
        trigger: {
            event: 'action_attempting'
        },
        conditions: (reactor, eventData) => reactor.id === eventData.combatant.id,
        effect: _incapacitatedEffect
    },
    invisible: {
        name: "Invisible",
        description: "An invisible creature is impossible to see without the aid of magic or a special sense. Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.",
        effects: {
            isInvisible: true, // This is still useful for canSee()
        },
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.attacker.id || reactor.id === eventData.target.id;
        },
        effect: (reactor, eventData) => {
            if (reactor.id === eventData.attacker.id) {
                log(`${reactor.name} is invisible and has advantage on the attack.`, 2);
                eventData.advantage = true;
            }
            if (reactor.id === eventData.target.id) {
                log(`Attacks against the invisible ${reactor.name} have disadvantage.`, 2);
                eventData.disadvantage = true;
            }
        },
    },
    paralyzed: {
        name: "Paralyzed",
        description: "A paralyzed creature is incapacitated, can't move, automatically fails STR/DEX saves, and attacks against it have advantage. Hits from within 5ft are criticals.",
        includes: ['incapacitated'],
        effects: { speed: 0 },
        trigger: {
            events: ['attack_hit', 'saving_throw_modifying', 'action_attempting']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    return reactor.id === eventData.combatant.id;
                case 'attack_hit':
                    // Condition 1: The reactor must be the target of the attack.
                    if (reactor.id !== eventData.target.id) return false;
                    // Condition 2: The attack must be a melee attack.
                    return !eventData.action.ranged;
                case 'saving_throw_modifying': {
                    const autoFailSaves = ['str', 'dex'];
                    return reactor.id === eventData.target.id && autoFailSaves.includes(eventData.saveType);
                }
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    _incapacitatedEffect(reactor, eventData);
                    break;
                case 'attack_hit':
                    eventData.crit = true;
                    break;
                case 'saving_throw_modifying':
                    eventData.outcome = 'auto-fail';
                    break;
            }
        }
    },
    petrified: {
        name: "Petrified",
        description: "A petrified creature is incapacitated, can't move, automatically fails STR/DEX saves, has resistance to all damage, and is immune to poison. Attacks against it have advantage.",
        includes: ['incapacitated'],
        effects: { speed: 0 },
        trigger: {
            events: ['damage_applying', 'condition_applying', 'action_attempting']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    return reactor.id === eventData.combatant.id;
                case 'damage_applying':
                case 'condition_applying':
                    return reactor.id === eventData.target.id; // For damage/condition applying
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    _incapacitatedEffect(reactor, eventData);
                    break;
                case 'damage_applying':
                    // Grants resistance to all damage
                    eventData.grantResistance = true;
                    // Grants immunity to poison damage
                    if (eventData.type === 'poison') {
                        eventData.isImmune = true;
                    }
                    break;
                case 'condition_applying':
                    // Grants immunity to the 'poisoned' condition
                    if (eventData.condition.name === 'poisoned') {
                        eventData.isImmune = true;
                    }
                    break;
            }
        }
    },
    poisoned: {
        name: "Poisoned",
        description: "A poisoned creature has disadvantage on attack rolls and ability checks.",
        effects: {},
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.attacker.id;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} is poisoned and has disadvantage on the attack.`, 2);
            eventData.disadvantage = true;
        },
    },
    prone: {
        name: "Prone",
        description: "A prone creature has disadvantage on attack rolls. An attack roll against it has advantage if the attacker is within 5 feet, otherwise the attack roll has disadvantage.",
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks *by* or *against* the reactor.
            return reactor.id === eventData.target.id || reactor.id === eventData.attacker.id;
        },
        effect: (reactor, eventData) => {
            if (reactor.id === eventData.target.id) {
                if (eventData.action.ranged) {
                    log(`${reactor.name} is prone, imposing disadvantage on the ranged attack.`, 2);
                    eventData.disadvantage = true;
                } else {
                    log(`${reactor.name} is prone, granting advantage to the melee attack.`, 2);
                    eventData.advantage = true;
                }
            } else if (reactor.id === eventData.attacker.id) {
                log(`${reactor.name} is prone and has disadvantage on the attack.`, 2);
                eventData.disadvantage = true;
            }
        },
    },
    reckless_state: {
        name: "Reckless State",
        description: "Attacks against this creature have advantage until the start of its next turn.",
        category: 'internal',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks *against* the reactor.
            return reactor.id === eventData.target.id;
        },
        effect: (reactor, eventData) => {
            // This is not a choice, it's a consequence.
            // The log message is different from the one in the main ability.
            log(`${reactor.name} is being attacked recklessly, granting advantage to the attacker.`, 2);
            eventData.advantage = true;
        }
    },
    restrained: {
        name: "Restrained",
        description: "A restrained creature’s speed becomes 0, and it can’t benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.",
        effects: { speed: 0 },
        trigger: {
            events: ['attack_declared', 'saving_throw_modifying']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_declared':
                    return reactor.id === eventData.attacker.id || reactor.id === eventData.target.id;
                case 'saving_throw_modifying':
                    return reactor.id === eventData.target.id && eventData.saveType === 'dex';
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'attack_declared':
                    if (reactor.id === eventData.attacker.id) {
                        log(`${reactor.name} is restrained and has disadvantage on the attack.`, 2);
                        eventData.disadvantage = true;
                    }
                    if (reactor.id === eventData.target.id) {
                        log(`Attacks against the restrained ${reactor.name} have advantage.`, 2);
                        eventData.advantage = true;
                    }
                    break;
                case 'saving_throw_modifying':
                    log(`${reactor.name} is restrained and has disadvantage on the DEX save.`, 2);
                    eventData.disadvantage = true;
                    break;
            }
        },
    },
    stunned: {
        name: "Stunned",
        description: "A stunned creature is incapacitated, can't move, automatically fails STR/DEX saves, and attacks against it have advantage.",
        includes: ['incapacitated'],
        effects: { speed: 0 },
        trigger: {
            events: ['saving_throw_modifying', 'action_attempting']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    return reactor.id === eventData.combatant.id;
                case 'saving_throw_modifying': {
                    const autoFailSaves = ['str', 'dex']; // For saving_throw_modifying
                    return reactor.id === eventData.target.id && autoFailSaves.includes(eventData.saveType);
                }
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    _incapacitatedEffect(reactor, eventData);
                    break;
                case 'saving_throw_modifying':
                    eventData.outcome = 'auto-fail';
                    break;
            }
        }
    },
    unconscious: {
        name: "Unconscious",
        description: "An unconscious creature is incapacitated, prone, automatically fails STR/DEX saves, and attacks against it have advantage. Hits from within 5ft are criticals.",
        includes: ['incapacitated', 'prone'],
        effects: {},
        trigger: {
            events: ['attack_hit', 'action_attempting', 'saving_throw_modifying']
        },
        conditions: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    return reactor.id === eventData.combatant.id;
                case 'attack_hit':
                    // Condition 1: The reactor must be the target of the attack.
                    if (reactor.id !== eventData.target.id) return false;
                    // Condition 2: The attack must be a melee attack.
                    return !eventData.action.ranged;
                case 'saving_throw_modifying': {
                    const autoFailSaves = ['str', 'dex'];
                    return reactor.id === eventData.target.id && autoFailSaves.includes(eventData.saveType);
                }
            }
            return false;
        },
        effect: (reactor, eventData) => {
            switch (eventData.eventName) {
                case 'action_attempting':
                    _incapacitatedEffect(reactor, eventData);
                    break;
                case 'attack_hit':
                    eventData.crit = true;
                    break;
                case 'saving_throw_modifying':
                    eventData.outcome = 'auto-fail';
                    break;
            }
        }
    },
    // Custom / Other
    cannot_react: {
        name: "Cannot React",
        description: "A creature under this effect cannot take reactions.",
        effects: { cannot: ['takeReactions'] }
    },
    no_healing: {
        name: "Cannot Regain Hit Points",
        description: "A creature under this effect cannot regain hit points.",
        type: 'harmful',
        trigger: {
            event: 'heal_applying'
        },
        conditions: (reactor, eventData) => {
            // The reactor is the one with the condition.
            // We need to check if the reactor is the one being healed.
            return reactor.id === eventData.target.id;
        },
        effect: (reactor, eventData) => {
            log(`${reactor.name} cannot regain hit points.`, 2);
            eventData.amount = 0;
        },
        getLogPhrase: (target, attacker, effect) => {
            return `${target.name} can no longer regain hit points.`;
        }
    },
    inspired: {
        name: "Inspired",
        description: "Has a Bardic Inspiration die to add to one attack roll, ability check, or saving throw.",
        type: 'beneficial',
        category: 'internal',
        consumesReaction: false, // It's a free choice, not a formal reaction action.
        trigger: {
            event: 'd20_modifying'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the one who rolled.
            return reactor.id === eventData.roller.id;
        },
        getScore: (reactor, eventData) => {
            // AI logic: Use inspiration on a "marginal" roll.
            const roll = eventData.finalRoll;
            if (roll >= 9 && roll <= 15) {
                return 100; // High score to ensure it's used.
            }
            return 0; // Don't use it on very low or very high rolls.
        },
        effect: (reactor, eventData, conditionInstance) => {
            const bonus = rollDice(conditionInstance.die);
            eventData.bonus += bonus;
            log(`${reactor.name} uses Bardic Inspiration to add a +${bonus} to the roll!`, 2);

            // Remove the condition after use.
            reactor.status.conditions = reactor.status.conditions.filter(c => c !== conditionInstance);
        }
    },
    blessed: {
        name: "Blessed",
        description: "Add a 1d4 to attack rolls and saving throws.",
        type: 'beneficial', // For AI targeting
        consumesReaction: false,
        trigger: {
            event: 'd20_modifying'
        },
        conditions: (reactor, eventData) => {
            // The reactor must be the one who rolled.
            return reactor.id === eventData.roller.id;
        },
        effect: (reactor, eventData) => {
            const bonus = rollDice('1d4');
            eventData.bonus += bonus;
            eventData.blessBonus = bonus; // For logging
        },
        getScore: (actor, eventOrActionData, context) => {
            // This getScore is used for two purposes:
            // 1. As a reaction to a d20 roll (automatic).
            // 2. For the AI to decide whether to cast the Bless spell.

            // Case 1: This is a reaction to a d20 roll. It should be automatic.
            if (eventOrActionData.eventName === 'd20_modifying') {
                return 1; // A score > 0 means the effect will trigger.
            }

            // Case 2: This is the AI deciding whether to cast the Bless spell.
            const attacker = actor;
            const action = eventOrActionData;
            const targeting = action.targeting || 'any';
            let potentialTargets = [];
            if (targeting === 'self') {
                potentialTargets = [attacker];
            } else if (targeting === 'other') {
                potentialTargets = context.allies.filter(a => a.id !== attacker.id);
            } else { // 'any'
                potentialTargets = context.allies;
            }
            const validTargets = potentialTargets.filter(ally => !hasCondition(ally, 'blessed'));
            if (validTargets.length > 0) {
                return 90; // Base score for a useful buff
            }
            return 0;
        }
    },
    baned: {
        name: "Baned",
        description: "Subtract a 1d4 from attack rolls and saving throws.",
        type: 'harmful', // For AI targeting
        consumesReaction: false,
        trigger: {
            event: 'd20_modifying'
        },
        conditions: (reactor, eventData) => {
            return reactor.id === eventData.roller.id;
        },
        effect: (reactor, eventData) => {
            const penalty = rollDice('1d4');
            eventData.penalty += penalty;
            eventData.banePenalty = penalty; // For logging
        },
        getScore: (actor, eventOrActionData, context) => {
            // This getScore is used for two purposes:
            // 1. As a reaction to a d20 roll (automatic).
            // 2. For the AI to decide whether to cast the Bane spell.

            // Case 1: This is a reaction to a d20 roll. It should be automatic.
            if (eventOrActionData.eventName === 'd20_modifying') {
                return 1; // A score > 0 means the effect will trigger.
            }

            // Case 2: This is the AI deciding whether to cast the Bane spell.
            const attacker = actor;
            const action = eventOrActionData;
            const numActionTargets = parseInt(action.targets) || 1;
            const possibleTargets = getValidTargets(attacker, action, context);
            const validTargets = possibleTargets.filter(opp => !hasCondition(opp, 'baned'));
            
            if (validTargets.length >= numActionTargets) {
                return 85; // Base score for a useful debuff
            }
            return 0;
        }
    },
    damage_resistance: {
        name: "Damage Resistance",
        description: "Grants resistance to specific damage types for a set duration.",
        type: 'beneficial',
        consumesReaction: false,
        configurable: 'resistance_types', // Custom flag for the UI
        trigger: {
            event: 'damage_applying'
        },
        conditions: (reactor, eventData) => {
            // Find the specific condition instance on the reactor
            const conditionInstance = reactor.status.conditions.find(c => c.name === 'damage_resistance');
            if (!conditionInstance || !conditionInstance.types) {
                return false;
            }
            // Check if the reactor is the target and the damage type matches
            return reactor.id === eventData.target.id && conditionInstance.types.includes(eventData.type);
        },
        effect: (reactor, eventData) => {
            eventData.grantResistance = true;
        },
        getScore: (actor, eventOrActionData, context) => {
            // This getScore is used for two purposes:
            // 1. As a passive effect during damage calculation.
            // 2. For the AI to decide whether to cast an action that applies this condition.

            // Case 1: This is a reaction to damage applying. It should be automatic.
            if (eventOrActionData.eventName === 'damage_applying') {
                return 1; // A score > 0 means the effect will trigger.
            }

            // Case 2: This is the AI deciding whether to cast the spell.
            // The signature is now (actor, action, context).
            const action = eventOrActionData;

            // AI logic for deciding to cast an action that applies this condition (e.g., Blade Ward).
            // It's a defensive action, so it's only useful if there are opponents.
            if (context.opponents.length === 0) {
                return 0;
            }

            // Don't cast if the actor already has this condition.
            if (hasCondition(actor, 'damage_resistance')) {
                return 0;
            }

            // It's a decent defensive option, better than doing nothing (Dodge).
            // Give it a score that's higher than Dodge's implicit score but lower than a decent attack.
            return 40;
        }
    },
    advantage_on_attacks_made: {
        name: "Advantage on Attacks Made",
        description: "Grants advantage on attack rolls made by the affected creature.",
        type: 'beneficial',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        getScore: (actor, eventOrActionData, context) => {
            // This condition is automatic. A score > 0 ensures the effect triggers.
            return 1;
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks made by the reactor.
            return reactor.id === eventData.attacker.id;
        },
        effect: (reactor, eventData, conditionInstance) => {
            // If the condition is targeted (like from Guiding Bolt), check if the attack target matches the source.
            if (conditionInstance.sourceId && conditionInstance.sourceId !== eventData.target.id) {
                return; // Wrong target, do nothing.
            }

            // Apply advantage and log.
            eventData.advantage = true;
            if (conditionInstance.sourceId) {
                log(`${reactor.name} has advantage on the attack against ${eventData.target.name}.`, 2);
            } else {
                log(`${reactor.name} has advantage on the attack.`, 2);
            }

            // Consume the use, if applicable.
            consumeUse(reactor, conditionInstance, eventData.context);
        }
    },
    advantage_on_attacks_received: {
        name: "Advantage on Attacks Received",
        description: "Attack rolls made against this creature have advantage. Can be limited to a specific attacker.",
        type: 'harmful',
        consumesReaction: false,
        getScore: (actor, eventOrActionData, context) => {
            // This getScore is used for two purposes:
            // 1. As a reaction to an attack being declared (it should be automatic).
            // 2. For the AI to decide whether to cast an action that applies this condition.

            // Case 1: This is a reaction to an event. It should be automatic.
            if (eventOrActionData.eventName === 'attack_declared') {
                return 1; // A score > 0 ensures the automatic effect triggers.
            }

            // Case 2: This is the AI deciding whether to cast the spell.
            const action = eventOrActionData;
            // AI logic for casting an action that grants advantage on the next attack.
            // Don't cast if already concentrating on something.
            if (actor.status.concentratingOn) return 0;
            
            // It's a decent setup action. Give it a score slightly higher than a basic weapon attack.
            return 6;
        },
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks against the reactor.
            return reactor.id === eventData.target.id;
        },
        effect: (reactor, eventData, conditionInstance) => {
            // If the condition is targeted, check if the attack source matches.
            if (conditionInstance.sourceId && conditionInstance.sourceId !== eventData.attacker.id) {
                return; // Wrong attacker, do nothing.
            }

            // Apply advantage and log.
            eventData.advantage = true;
            if (conditionInstance.sourceId) {
                // The attacker's name is available in the event data.
                log(`Attacks against ${reactor.name} have advantage from ${eventData.attacker.name}.`, 2);
            } else {
                log(`Attacks against ${reactor.name} have advantage.`, 2);
            }

            // Consume the use, if applicable.
            consumeUse(reactor, conditionInstance, eventData.context);
        }
    },
    disadvantage_on_attacks_made: {
        name: "Disadvantage on Attacks Made",
        description: "Imposes disadvantage on attack rolls made by the affected creature.",
        type: 'harmful',
        consumesReaction: false,
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks by the reactor.
            return reactor.id === eventData.attacker.id;
        },
        effect: (reactor, eventData, conditionInstance) => {
            // If the condition is targeted (like from Chill Touch), check if the attack target matches the source.
            if (conditionInstance.sourceId && conditionInstance.sourceId !== eventData.target.id) {
                return; // Wrong target, do nothing.
            }

            eventData.disadvantage = true;
            if (conditionInstance.sourceId) {
                log(`${reactor.name} has disadvantage on the attack against ${eventData.target.name}.`, 2);
            } else {
                log(`${reactor.name} has disadvantage on the attack.`, 2);
            }
            consumeUse(reactor, conditionInstance, eventData.context);
        },
        getLogPhrase: (target, attacker, effect) => {
            // This condition provides a full, custom log message.
            return `${target.name} is now affected by Disadvantage on Attacks Made.`;
        }
    },
    disadvantage_on_attacks_received: {
        name: "Disadvantage on Attacks Received",
        description: "Attack rolls made against this creature have disadvantage. Can be limited to a specific attacker.",
        type: 'beneficial', // It's beneficial to the one who cast it, even if harmful to the target of the attack.
        consumesReaction: false,
        getScore: (actor, eventOrActionData, context) => {
            // Case 1: This is a reaction to an event. It should be automatic.
            if (eventOrActionData.eventName === 'attack_declared') {
                return 1; // A score > 0 ensures the automatic effect triggers.
            }

            // Case 2: This is the AI deciding whether to cast the spell.
            const action = eventOrActionData;
            const numActionTargets = parseInt(action.targets) || 1;
            const possibleTargets = getValidTargets(actor, action, context);
            
            // Don't apply if the most likely targets already have the condition.
            const validTargets = possibleTargets.filter(opp => !hasCondition(opp, 'disadvantage_on_attacks_received'));

            if (validTargets.length >= numActionTargets) {
                // It's a useful debuff. Give it a score comparable to a low-damage cantrip.
                return 5;
            }

            return 0;
        },
        trigger: {
            event: 'attack_declared'
        },
        conditions: (reactor, eventData) => {
            // This condition affects attacks against the reactor.
            return reactor.id === eventData.target.id;
        },
        effect: (reactor, eventData, conditionInstance) => {
            // If the condition is targeted, check if the attack source matches.
            if (conditionInstance.sourceId && conditionInstance.sourceId !== eventData.attacker.id) {
                return; // Wrong attacker, do nothing.
            }

            // Apply disadvantage and log.
            eventData.disadvantage = true;
            if (conditionInstance.sourceId) {
                log(`Attacks against ${reactor.name} have disadvantage from ${eventData.attacker.name}.`, 2);
            } else {
                log(`Attacks against ${reactor.name} have disadvantage.`, 2);
            }

            consumeUse(reactor, conditionInstance, eventData.context);
        }
    },
    saving_throw_modifier: {
        name: "Saving Throw Modifier",
        description: "Adds or subtracts a die roll from a saving throw.",
        type: 'beneficial',
        configurable: 'die', // Custom flag for the UI
        consumesReaction: false,
        trigger: {
            event: 'd20_modifying'
        },
        conditions: (reactor, eventData) => {
            // This condition only applies if the reactor is the one rolling, AND it's a saving throw.
            return reactor.id === eventData.roller.id && eventData.rollType === 'savingThrow';
        },
        getScore: (actor, eventOrActionData, contextOrConditionInstance) => {
            // Case 1: AI decides whether to USE the modifier during a save.
            if (eventOrActionData.eventName === 'd20_modifying') {
                const conditionInstance = contextOrConditionInstance;
                const { finalRoll, dc, roller, saveType } = eventOrActionData;
                if (!dc || !conditionInstance?.die) return 0; // Not enough info

                // Determine if it's a bonus or penalty.
                const die = conditionInstance.die;
                const isPenalty = die.startsWith('-');
                if (isPenalty) return 1; // Always apply penalties.

                const currentTotal = finalRoll + (roller.saves[saveType] || 0);
                // Calculate the max possible bonus from the die (e.g., '1d4' -> 4).
                const maxBonus = parseInt(die.split('d')[1], 10) || 0;

                const neededRoll = dc;

                // If we've already passed, don't use it.
                if (currentTotal >= neededRoll) return 0;

                // If the max possible bonus can't make us pass, don't use it.
                if (currentTotal + maxBonus < neededRoll) return 0;

                // Otherwise, it's a marginal roll where the bonus might help. Use it.
                return 100;
            }
            // Case 2: AI decides whether to CAST the spell. `contextOrConditionInstance` is the context here.
            const context = contextOrConditionInstance;
            if (actor.status.concentratingOn) return 0;
            if (!context || !context.allies) return 0;
            const validTargets = context.allies.filter(ally => ally.id !== actor.id && !hasCondition(ally, 'saving_throw_modifier'));
            return validTargets.length > 0 ? 5 : 0;
        },
        effect: (reactor, eventData, conditionInstance) => {
            const die = conditionInstance.die;
            if (!die) return;

            const isPenalty = die.startsWith('-');
            const diceNotation = isPenalty ? die.substring(1) : die;
            const roll = rollDice(diceNotation);

            if (isPenalty) {
                eventData.penalty += roll;
                log(`${reactor.name} is affected by Saving Throw Modifier, subtracting a -${roll} from the save!`, 2);
            } else {
                eventData.bonus += roll;
                log(`${reactor.name} uses Saving Throw Modifier to add a +${roll} to the save!`, 2);
            }
            consumeUse(reactor, conditionInstance, eventData.context);
        }
    }
};