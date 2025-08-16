const ABILITIES_LIBRARY = {
    // Offensive
    great_weapon_master: {
        name: "Great Weapon Master",
        description: "Take a -5 penalty to the attack roll for +10 to the damage roll. (Applies to heavy weapons)",
        valueType: 'boolean'
    },
    sharpshooter: {
        name: "Sharpshooter",
        description: "Take a -5 penalty to the attack roll for +10 to the damage roll. (Applies to ranged weapons)",
        valueType: 'boolean'
    },
    savage_attacker: {
        name: "Savage Attacker",
        description: "Once per turn, reroll melee weapon damage and use the higher result.",
        valueType: 'boolean'
    },
    sneak_attack: {
        name: "Sneak Attack",
        description: "Once per turn, add extra damage when you have advantage or an ally is within 5ft of the target.",
        valueType: 'dice',
        placeholder: 'e.g., 3d6'
    },
    rage: {
        name: "Rage",
        description: "As a bonus action, gain resistance to physical damage and add a bonus to damage rolls.",
        valueType: 'number',
        placeholder: 'e.g., 2'
    },
    divine_smite: {
        name: "Divine Smite",
        description: "When you hit with a melee attack, you can expend a spell slot to deal extra radiant damage.",
        valueType: 'boolean'
    },
    multiattack: {
        name: "Multiattack",
        description: "Take a sequence of attacks as a single action.",
        valueType: 'string',
        placeholder: 'e.g., 2/Claw;1/Bite'
    },
    // Defensive
    heavy_armor_master: {
        name: "Heavy Armor Master",
        description: "Reduce incoming non-magical bludgeoning, piercing, and slashing damage by 3.",
        valueType: 'boolean'
    },
    magic_resistance: {
        name: "Magic Resistance",
        description: "Advantage on saving throws against spells and other magical effects.",
        valueType: 'boolean'
    },
    legendary_resistance: {
        name: "Legendary Resistance",
        description: "If the creature fails a saving throw, it can choose to succeed instead.",
        valueType: 'number',
        placeholder: 'e.g., 3'
    },
    relentless_endurance: {
        name: "Relentless Endurance",
        description: "When reduced to 0 HP but not killed outright, drop to 1 HP instead. (Once per long rest)",
        valueType: 'boolean'
    },
    reckless: {
        name: "Reckless Attack",
        description: "Gain advantage on melee strength attacks, but attacks against you have advantage.",
        valueType: 'boolean'
    },
    regeneration: {
        name: "Regeneration",
        description: "Regain a set amount of hit points at the start of its turn.",
        valueType: 'number',
        placeholder: 'e.g., 10'
    },
    // Utility
    action_surge: {
        name: "Action Surge",
        description: "Take one additional action on your turn.",
        valueType: 'number',
        placeholder: 'e.g., 1'
    },
    lucky: {
        name: "Lucky",
        description: "Reroll any 1s on d20 rolls (attack rolls, ability checks, saving throws).",
        valueType: 'boolean'
    },
    pack_tactics: {
        name: "Pack Tactics",
        description: "Gain advantage on an attack roll against a creature if at least one of your allies is within 5 feet of the creature and the ally isn't incapacitated.",
        valueType: 'boolean'
    },
    great_weapon_fighting: {
        name: "Great Weapon Fighting",
        description: "When you roll a 1 or 2 on a damage die for an attack with a two-handed melee weapon, you can reroll the die.",
        valueType: 'boolean'
    },
    advantage_on_initiative: {
        name: "Advantage on Initiative",
        description: "Gain advantage on initiative rolls.",
        valueType: 'boolean'
    },
    // Resistances etc.
    resistance: {
        name: "Damage Resistance",
        description: "Take half damage from the specified types.",
        valueType: 'string',
        placeholder: 'e.g., fire,cold'
    },
    vulnerability: {
        name: "Damage Vulnerability",
        description: "Take double damage from the specified types.",
        valueType: 'string',
        placeholder: 'e.g., fire,cold'
    },
    immunity: {
        name: "Damage Immunity",
        description: "Take no damage from the specified types.",
        valueType: 'string',
        placeholder: 'e.g., poison,fire'
    }
};