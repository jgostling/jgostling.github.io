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
    extra_crit_dice: {
        name: "Extra Critical Damage Dice",
        description: "On a critical hit with a melee weapon attack, roll additional weapon damage dice. Used for Savage Attacks (1) and Brutal Critical (1-3).",
        valueType: 'number',
        placeholder: 'e.g., 1'
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
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                sourceType: ['magical']
            }]
        }
    },
    gnome_cunning: {
        name: "Gnome Cunning",
        description: "Advantage on Intelligence, Wisdom, and Charisma saving throws against magic.",
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                on: ['int', 'wis', 'cha'],
                sourceType: ['magical']
            }]
        }
    },
    dwarven_resilience: {
        name: "Dwarven Resilience",
        description: "Advantage on saving throws against poison, and resistance against poison damage.",
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                vs: ['poison', 'poisoned'] // Catches poison damage and the poisoned condition
            }]
        },
        // This new property will be read by the damage calculation logic.
        grantsResistance: ['poison']
    },
    stout_resilience: {
        name: "Stout Resilience",
        description: "Advantage on saving throws against poison, and resistance against poison damage.",
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                vs: ['poison', 'poisoned'] // Catches poison damage and the poisoned condition
            }]
        },
        // This new property will be read by the damage calculation logic.
        grantsResistance: ['poison']
    },
    fey_ancestry: {
        name: "Fey Ancestry",
        description: "Advantage on saving throws against being charmed.",
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                vs: ['charmed'] // This is a condition name
            }]
        }
    },
    brave: {
        name: "Brave",
        description: "Advantage on saving throws against being frightened.",
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                vs: ['frightened']
            }]
        }
    },
    danger_sense: {
        name: "Danger Sense",
        description: "Advantage on Dexterity saving throws against effects that you can see. (Simplified for simulator)",
        valueType: 'boolean',
        rules: {
            saveAdvantage: [{
                on: ['dex']
            }]
        }
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
        name: "Lucky (Halfling)",
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