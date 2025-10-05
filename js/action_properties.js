// js/action_properties.js

var ACTION_PROPERTIES_LIBRARY = {
    advantage_vs_metal_armor: {
        name: "Advantage vs. Metal Armor",
        trigger: { event: 'attack_declared' },
        conditions: (action, eventData) => {
            // This property only applies if the target is wearing metal armor.
            return eventData.target.armor?.material === 'metal';
        },
        effect: (action, eventData) => {
            log(`${eventData.attacker.name} has advantage on the attack with ${action.name} due to the target's metal armor.`, 2);
            eventData.advantage = true;
        }
    }
    // Future action properties like 'agonizing_blast' or 'eldritch_spear' will be added here.
};