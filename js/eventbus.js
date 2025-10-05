// js/eventbus.js

var EventBus = class EventBus {
    constructor() {
        // The listeners property will be a map where keys are event names
        // and values are arrays of combatants subscribed to that event.
        // e.g., { 'attack_declared': [fighter, wizard], 'spell_cast': [wizard] }
        this.listeners = {};
    }

    /**
     * Subscribes a combatant to a specific event.
     * @param {string} eventName - The name of the event (e.g., 'attack_declared').
     * @param {object} combatant - The combatant instance that is listening.
     */
    subscribe(eventName, combatant) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        // Avoid duplicate subscriptions
        if (!this.listeners[eventName].includes(combatant)) {
            this.listeners[eventName].push(combatant);
        }
    }

    /**
     * Unsubscribes a combatant from a specific event. Useful for when a combatant is removed.
     * @param {string} eventName - The name of the event.
     * @param {object} combatant - The combatant instance to unsubscribe.
     */
    unsubscribe(eventName, combatant) {
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(
                listener => listener !== combatant
            );
        }
    }

    /**
     * A private helper to check if a reaction ability/condition can be triggered.
     * @param {object} reactor - The combatant whose reaction is being checked.
     * @param {object} definition - The ability or condition definition from the library.
     * @param {string} eventName - The name of the event being dispatched.
     * @returns {boolean} True if the reaction can be triggered, false otherwise.
     * @private
     */
    _canTriggerReaction(reactor, definition, eventName) {
        // An ability/condition is considered a reaction if it has a trigger property.
        if (!definition || !definition.trigger) {
            return false;
        }
        const triggerEvents = definition.trigger.events || [definition.trigger.event];
        if (!triggerEvents.includes(eventName)) {
            return false;
        }
        // If this ability consumes a reaction, check if the reaction has been used.
        if (definition.consumesReaction !== false && reactor.status.usedReaction) {
            return false;
        }

        // Check for conditions that prevent reactions (e.g., Shocking Grasp, Incapacitated).
        const conditionEffects = getConditionEffects(reactor);
        // This check should only apply to abilities that actually consume a reaction.
        // Internal, "free" abilities should still trigger even if the creature is incapacitated.
        if (definition.consumesReaction !== false && conditionEffects.cannot?.includes('takeReactions')) {
            return false; 
        }

        // If the reactor is at 0 HP, only allow abilities that can trigger at 0 HP.
        return !(reactor.hp <= 0 && !triggerEvents.includes('reduced_to_0_hp'));
    }

    /**
     * Dispatches an event to all subscribed combatants, allowing them to react.
     * This is a synchronous operation that modifies the eventData object.
     * @param {string} eventName - The name of the event being dispatched.
     * @param {object} eventData - A mutable object containing details about the event.
     * @returns {object} The (potentially modified) eventData object.
     */
    dispatch(eventName, eventData) {
        const subscribers = this.listeners[eventName] || [];
        const allReactors = new Set(subscribers);

        // Automatically include the primary actor(s) of an event as potential reactors.
        // This is crucial for dynamic conditions where the actor isn't pre-subscribed.
        if (eventData.attacker) allReactors.add(eventData.attacker);
        if (eventData.target) allReactors.add(eventData.target);
        if (eventData.roller) allReactors.add(eventData.roller); // For d20 rolls
        if (eventData.combatant) allReactors.add(eventData.combatant); // For turn-based events

        if (allReactors.size === 0) {
            return eventData; // No one is listening, return immediately.
        }

        // Add the event name to the data payload for subscribers that need it.
        eventData.eventName = eventName;

        // --- Process Action Properties ---
        // This is a new loop that checks the action itself for properties that modify the event.
        const action = eventData.action;
        if (action && action.properties) {
            for (const propKey of action.properties) {
                const propDef = ACTION_PROPERTIES_LIBRARY[propKey];
                // Check if the property listens to the current event
                if (propDef?.trigger?.event === eventName) {
                    // Check if the property's conditions are met
                    if (propDef.conditions(action, eventData)) {
                        // Apply the effect
                        propDef.effect(action, eventData);
                    }
                }
            }
        }

        for (const reactor of allReactors) {
            // --- Process abilities from active conditions ---
            if (reactor.status) { // A reactor might not have a status object (e.g., during setup).
                for (const condition of (reactor.status.conditions || [])) {
                    const conditionDef = CONDITIONS_LIBRARY[condition.name];

                    if (!this._canTriggerReaction(reactor, conditionDef, eventName)) continue;

                    if (conditionDef.conditions(reactor, eventData)) {
                        // If a condition has a getScore method, it's a choice. Otherwise, it's automatic.
                        if (typeof conditionDef.getScore === 'function') {
                            const score = getReactionScore(reactor, conditionDef, eventData, condition);
                            if (score > 0) {
                                conditionDef.effect(reactor, eventData, condition);
                                if (conditionDef.consumesReaction !== false) {
                                    reactor.status.usedReaction = true;
                                }
                            }
                        } else {
                            // Automatic effect, no AI decision needed.
                            conditionDef.effect(reactor, eventData, condition);
                            if (conditionDef.consumesReaction !== false) {
                                reactor.status.usedReaction = true;
                            }
                        }
                    }
                }
            }

            // --- Process abilities from the character sheet ---
            for (const abilityKey in reactor.abilities) {
                const ability = ABILITIES_LIBRARY[abilityKey];

                if (!this._canTriggerReaction(reactor, ability, eventName)) continue;

                if (ability.conditions(reactor, eventData)) {
                    // If an ability has a getScore method, it's a choice for the AI.
                    // Otherwise, it's an automatic effect.
                    if (typeof ability.getScore === 'function') {
                        const score = getReactionScore(reactor, ability, eventData);
                        if (score > 0) {
                            ability.effect(reactor, eventData);
                            if (ability.consumesReaction !== false) {
                                reactor.status.usedReaction = true;
                            }
                        }
                    } else {
                        ability.effect(reactor, eventData);
                        if (ability.consumesReaction !== false) {
                            reactor.status.usedReaction = true;
                        }
                    }
                }
            }
        }

        return eventData;
    }
}

// Export a single instance to be used throughout the app by explicitly attaching it to the window object.
var eventBus = new EventBus();