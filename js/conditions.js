var CONDITIONS_LIBRARY = {
    // Core Conditions from PHB Appendix A
    blinded: {
        name: "Blinded",
        description: "A blinded creature can’t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage.",
        effects: {
            isBlinded: true,
            grantsAdvantageToAttackers: true,
            disadvantageOn: ['attackRolls']
        }
    },
    charmed: {
        name: "Charmed",
        description: "A charmed creature can’t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.",
        effects: {} // Targeting restriction is handled in the AI logic.
    },
    deafened: {
        name: "Deafened",
        description: "A deafened creture can't hear and automatically fails any ability check that requires hearing.",
        effects: {
            // Note: Needs to be checked in specific spells and effects.
        }
    },
    frightened: {
        name: "Frightened",
        description: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can’t willingly move closer to the source of its fear.",
        effects: {
            // This is a special condition handled by the simulation logic.
            disadvantageIfSourceVisible: ['attackRolls', 'abilityChecks'],
            // Note: The movement restriction is a complex AI change for later.
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
        effects: {
            cannot: ['takeActions', 'takeReactions']
        }
    },
    invisible: {
        name: "Invisible",
        description: "An invisible creature is impossible to see without the aid of magic or a special sense. Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.",
        effects: {
            isInvisible: true,
            advantageOn: ['attackRolls'],
            grantsDisadvantageToAttackers: true
        }
    },
    paralyzed: {
        name: "Paralyzed",
        description: "A paralyzed creature is incapacitated, can't move, automatically fails STR/DEX saves, and attacks against it have advantage. Hits from within 5ft are criticals.",
        includes: ['incapacitated'],
        effects: {
            speed: 0,
            grantsAdvantageToAttackers: true,
            autoFailSaves: ['str', 'dex'],
            autoCritIfMelee: true
        }
    },
    petrified: {
        name: "Petrified",
        description: "A petrified creature is incapacitated, can't move, automatically fails STR/DEX saves, has resistance to all damage, and is immune to poison. Attacks against it have advantage.",
        includes: ['incapacitated'],
        effects: {
            speed: 0,
            grantsAdvantageToAttackers: true,
            autoFailSaves: ['str', 'dex'],
            resistanceTo: ['all'],
            immunityTo: ['poison', 'poisoned'] // Damage type and condition name
        }
    },
    poisoned: {
        name: "Poisoned",
        description: "A poisoned creature has disadvantage on attack rolls and ability checks.",
        effects: {
            disadvantageOn: ['attackRolls', 'abilityChecks']
        }
    },
    prone: {
        name: "Prone",
        description: "A prone creature has disadvantage on attack rolls. An attack roll against it has advantage if the attacker is within 5 feet, otherwise the attack roll has disadvantage.",
        effects: {
            disadvantageOn: ['attackRolls'],
            isProne: true // Special flag for attack logic
        }
    },
    restrained: {
        name: "Restrained",
        description: "A restrained creature’s speed becomes 0, and it can’t benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.",
        effects: {
            speed: 0,
            grantsAdvantageToAttackers: true,
            disadvantageOn: ['attackRolls', 'dexSaves']
        }
    },
    stunned: {
        name: "Stunned",
        description: "A stunned creature is incapacitated, can't move, automatically fails STR/DEX saves, and attacks against it have advantage.",
        includes: ['incapacitated'],
        effects: {
            speed: 0,
            grantsAdvantageToAttackers: true,
            autoFailSaves: ['str', 'dex']
        }
    },
    unconscious: {
        name: "Unconscious",
        description: "An unconscious creature is incapacitated, prone, automatically fails STR/DEX saves, and attacks against it have advantage. Hits from within 5ft are criticals.",
        includes: ['incapacitated', 'prone'],
        effects: {
            grantsAdvantageToAttackers: true,
            autoFailSaves: ['str', 'dex'],
            autoCritIfMelee: true
        }
    },
    // Custom / Other
    blessed: {
        name: "Blessed",
        description: "Add a 1d4 to attack rolls and saving throws.",
        effects: { isBlessed: true },
        type: 'beneficial'
    },
    baned: {
        name: "Baned",
        description: "Subtract a 1d4 from attack rolls and saving throws.",
        effects: { isBaned: true },
        type: 'harmful'
    }
};