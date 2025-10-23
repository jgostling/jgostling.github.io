// js/monster_library_data.js

var MONSTER_LIBRARY_DATA = [
    {
        name: 'Acolyte',
        isExperimental: true,
        hp: 9,
        ac: 10,
        cr: '1/4',
        size: 'medium',
        type: 'humanoid',
        role: 'backline',
        initiative_mod: 0,
        saves: { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 },
        attacks: [
            { name: 'Sacred Flame', type: 'save', action: 'action', spellLevel: 0, damage: '1d8', damageType: 'radiant', save: { dc: 12, type: 'dex' } },
            { name: 'Club', toHit: 2, damage: '1d4', damageType: 'bludgeoning' },
            { name: 'Bless', type: 'effect', action: 'action', spellLevel: 1, targets: 3, targeting: 'any', effect: { name: 'blessed', duration: { minutes: 1, concentration: true } } },
            { name: 'Cure Wounds', type: 'heal', action: 'action', spellLevel: 1, heal: '1d8+2' }
            /* TODO: Sanctuary spell */
        ],
        abilities: {},
        spell_slots: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
    },
    {
        name: 'Awakened Shrub',
        isExperimental: true,
        hp: 10,
        ac: 9,
        cr: 0,
        size: 'small',
        type: 'plant',
        role: 'frontline',
        initiative_mod: -1,
        saves: { str: -4, dex: -1, con: 0, int: 0, wis: 0, cha: -2 },
        attacks: [
            { name: 'Rake', toHit: 1, damage: '1d4-1', damageType: 'slashing' }
        ],
        abilities: { damage_vulverability: ['fire'], damage_resistance: ['piercing'] /* TODO: False Appearance */}
    },
    {
        name: 'Axe Beak',
        hp: 19,
        ac: 11,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 2, dex: 1, con: 1, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Beak', toHit: 4, damage: '1d8+2', damageType: 'slashing' }
        ],
        abilities: {}
    },
    {
        name: 'Baboon',
        hp: 3,
        ac: 12,
        cr: 0,
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -1, dex: 2, con: 0, int: -3, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 1, damage: '1d4-1', damageType: 'piercing' }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Badger',
        hp: 3,
        ac: 10,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: -3, dex: 0, con: 1, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 2, damage: '1', damageType: 'piercing' }
        ],
        abilities: {}
    },
    {
        name: 'Bandit',
        hp: 11,
        ac: 12,
        cr: '1/8',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
        attacks: [
            { name: 'Scimitar', toHit: 3, damage: '1d6+1', damageType: 'slashing' },
            { name: 'Light Crossbow', toHit: 3, damage: '1d8+1', damageType: 'piercing', ranged: true }
        ],
        abilities: {}
    },
    {
        name: 'Bat',
        isExperimental: true,
        hp: 1,
        ac: 11,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -4, dex: 2, con: -1, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 0, damage: '1', damageType: 'piercing' }
        ],
        abilities: { /* TODO: Echolocation */}
    },    {
        name: 'Blink Dog',
        hp: 22,
        isExperimental: true,
        ac: 13,
        cr: '1/4',
        size: 'medium',
        type: 'fey',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 1, dex: 3, con: 1, int: 0, wis: 1, cha: 0 },
        attacks: [
            { name: 'Bite', toHit: 3, damage: '1d6+1', damageType: 'piercing' }
            /* TODO: Teleport */
        ],
        abilities: {}
    },

    {
        name: 'Blood Hawk',
        hp: 7,
        ac: 12,
        cr: '1/8',
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -2, dex: 2, con: 0, int: -4, wis: 2, cha: -3 },
        attacks: [
            { name: 'Beak', toHit: 4, damage: '1d4+2', damageType: 'piercing' }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Boar',
        isExperimental: true,
        hp: 11,
        ac: 11,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 1, dex: 0, con: 1, int: -4, wis: -1, cha: -3 },
        attacks: [
            { name: 'Tusk', toHit: 3, damage: '1d6+1', damageType: 'slashing' }
        ],
        abilities: { charge: { damage: '1d6', dc: 11, type: 'str', effect: 'prone', attackName: 'Tusk' } /* TODO: Relentless */ }
    },
    {
        name: 'Brown Bear',
        hp: 34,
        ac: 11,
        cr: '1',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 4, dex: 0, con: 3, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 6, damage: '1d8+4', damageType: 'piercing' },
            { name: 'Claws', toHit: 6, damage: '2d6+4', damageType: 'slashing' },
            { name: 'Multiattack', type: 'multiattack', multiattack: [{ name: 'Bite', count: 1 }, { name: 'Claws', count: 1 }] }
        ],
        abilities: {}
    },
    {
        name: 'Bugbear',
        hp: 27,
        ac: 16,
        cr: '1',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 2, dex: 2, con: 1, int: -1, wis: 0, cha: -1 },
        attacks: [
            { name: 'Morningstar', toHit: 4, damage: '2d8+2', damageType: 'piercing' },
            { name: 'Javelin (Melee)', toHit: 4, damage: '2d6+2', damageType: 'piercing' },
            { name: 'Javelin (Ranged)', toHit: 4, damage: '1d6+2', damageType: 'piercing', ranged: true }
        ],
        abilities: {}
    },
    {
        name: 'Camel',
        hp: 15,
        ac: 9,
        cr: '1/8',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: -1,
        saves: { str: 3, dex: -1, con: 2, int: -4, wis: -1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 5, damage: '1d4', damageType: 'bludgeoning' }
        ],
        abilities: {}
    },
    {
        name: 'Cat',
        hp: 2,
        ac: 12,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -4, dex: 2, con: 0, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Claws', toHit: 0, damage: '1', damageType: 'piercing' }
        ],
        abilities: {}
    },
    {
        name: 'Commoner',
        hp: 4,
        ac: 10,
        cr: 0,
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        attacks: [
            { name: 'Club', toHit: 0, damage: '1d4', damageType: 'bludgeoning' }
        ],
        abilities: {}
    },
    {
        name: 'Constrictor Snake',
        isExperimental: true,
        hp: 13,
        ac: 12,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 2, dex: 2, con: 1, int: -5, wis: 0, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d6+2', damageType: 'piercing' },
            { name: 'Constrict', toHit: 4, damage: '1d8+2', damageType: 'bludgeoning' /* TODO: Grapple and Restrain */ }
        ],
        abilities: {}
    },
    {
        name: 'Crab',
        hp: 2,
        ac: 11,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: -4, dex: 0, con: 0, int: -5, wis: -1, cha: -4 },
        attacks: [
            { name: 'Claw', toHit: 0, damage: '1', damageType: 'bludgeoning' }
        ],
        abilities: {}
    },
    {
        name: 'Cultist',
        isExperimental: true,
        hp: 9,
        ac: 12,
        cr: '1/8',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 0, dex: 1, con: 0, int: 0, wis: 0, cha: 0 },
        attacks: [
            { name: 'Scimitar', toHit: 3, damage: '1d6+1', damageType: 'slashing' }
        ],
        abilities: { /* TODO: Dark Devotion */ }
    },
    {
        name: 'Deer',
        hp: 4,
        ac: 13,
        cr: 0,
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 0, dex: 3, con: 0, int: -4, wis: 2, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 2, damage: '1d4', damageType: 'piercing' }
        ],
        abilities: {}
    },
    {
        name: 'Dire Wolf',
        hp: 37,
        ac: 14,
        cr: '1',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 3, dex: 2, con: 2, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 5, damage: '2d6+3', damageType: 'piercing', on_hit_effects: [{ save: { dc: 13, type: 'str' }, effect: { name: 'prone' } }] }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Draft Horse',
        hp: 19,
        ac: 10,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 4, dex: 0, con: 1, int: -4, wis: 0, cha: -2 },
        attacks: [
            { name: 'Hooves', toHit: 6, damage: '2d4+4', damageType: 'bludgeoning' }
        ],
        abilities: {}
    },
    {
        name: 'Dretch',
        isExperimental: true,
        hp: 18,
        ac: 11,
        cr: '1/4',
        size: 'small',
        type: 'fiend',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 0, dex: 0, con: 1, int: -3, wis: -1, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 2, damage: '1d6', damageType: 'piercing' },
            { name: 'Claws', toHit: 2, damage: '2d4', damageType: 'slashing' },
            { name: 'Multiattack', type: 'multiattack', multiattack: [{ name: 'Bite', count: 1 }, { name: 'Claws', count: 1 }] }
            /* TODO: Fetid Cloud */
        ],
        abilities: { damage_resistance: ['cold', 'fire', 'lightning'], damage_immunity: ['poison'], condition_immunity: ['poisoned'] }
    },
    {
        name: 'Drow',
        isExperimental: true,
        hp: 13,
        ac: 15,
        cr: '1/4',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 1 },
        attacks: [
            { name: 'Shortsword', toHit: 4, damage: '1d6+2', damageType: 'piercing' },
            { name: 'Hand Crossbow', toHit: 4, damage: '1d6+2', damageType: 'piercing', on_hit_effects: [{ save: { dc: 13, type: 'con' }, on_save: 'negated', effect: { name: 'poisoned', duration: { hours: 1 }, on_fail_by: [ { margin: 5, effects: ['unconscious'] } ] } }], ranged: true }
            /* TODO: Darkness spell, Faerie Fire spell */
        ],
        abilities: { fey_ancestry: true }
    },
    {
        name: 'Eagle',
        hp: 3,
        ac: 12,
        cr: 0,
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -2, dex: 2, con: 0, int: -4, wis: 2, cha: -2 },
        attacks: [
            { name: 'Talons', toHit: 4, damage: '1d4+2', damageType: 'slashing' }
        ],
        abilities: {}
    },
    {
        name: 'Elk',
        isExperimental: true,
        hp: 13,
        ac: 10,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 3, dex: 0, con: 1, int: -4, wis: 0, cha: -2 },
        attacks: [
            { name: 'Ram', toHit: 5, damage: '1d6+3', damageType: 'bludgeoning' },
            { name: 'Hooves', toHit: 5, damage: '2d4+3', damageType: 'bludgeoning' /* TODO: only on prone targets */ }
        ],
        abilities: { charge: { damage: '2d6', dc: 13, type: 'str', effect: 'prone', attackName: 'Ram' } }
    },
    {
        name: 'Flying Snake',
        isExperimental: true,
        hp: 5,
        ac: 14,
        cr: '1/8',
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 4,
        saves: { str: -3, dex: 4, con: 0, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 6, damage: '1', damageType: 'piercing', on_hit_effects: [{ damage: '3d4', damageType: 'poison' }] }
        ],
        abilities: { /* TODO: Flyby */ }
    },
    {
        name: 'Flying Sword',
        isExperimental: true,
        hp: 17,
        ac: 17,
        cr: '1/4',
        size: 'small',
        type: 'construct',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 1, dex: 4, con: 0, int: -5, wis: -3, cha: -5 },
        attacks: [
            { name: 'Longsword', toHit: 3, damage: '1d8+1', damageType: 'slashing' }
        ],
        abilities: { damage_immunity: ['poison', 'psychic'], condition_immunity: ['blinded', 'charmed', 'deafened', 'frightened', 'paralyzed', 'petrified', 'poisoned'] /* TODO: Antoimagic Susceptibility, False Appearance */ }
    },
    {
        name: 'Frog',
        hp: 1,
        ac: 11,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: -5, dex: 1, con: -1, int: -5, wis: -1, cha: -4 },
        attacks: [],
        abilities: {}
    },
    {
        name: 'Giant Badger',
        hp: 13,
        ac: 10,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 1, dex: 0, con: 2, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 3, damage: '1d6+1', damageType: 'piercing' },
            { name: 'Claws', toHit: 3, damage: '2d4+1', damageType: 'slashing' },
            { name: 'Multiattack', type: 'multiattack', multiattack: [{ name: 'Bite', count: 1 }, { name: 'Claws', count: 1 }] }
        ],
        abilities: {}
    },
    {
        name: 'Giant Bat',
        hp: 22,
        ac: 13,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 2, dex: 3, con: 0, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d6+2', damageType: 'piercing' }
        ],
        abilities: { /* TODO: Echolocation */ }
    },
    {
        name: 'Giant Centipede',
        hp: 4,
        ac: 13,
        cr: '1/4',
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -3, dex: 2, con: 1, int: -5, wis: -2, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d4+2', damageType: 'piercing', on_hit_effects: [{ damage: '3d6', damageType: 'poison', save: { dc: 11, type: 'con' }, on_save: 'negated', effects: [{ name: 'paralyzed' /* TODO: also poisoned */, duration: { hours: 1 } }] }] }
        ],
        abilities: {}
    },
    {
        name: 'Giant Crab',
        hp: 13,
        ac: 15,
        cr: '1/8',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 1, dex: 2, con: 0, int: -5, wis: -1, cha: -4 },
        attacks: [
            { name: 'Claw', toHit: 3, damage: '1d6+1', damageType: 'bludgeoning' /* TODO: Grapple */ }
        ],
        abilities: {}
    },
    {
        name: 'Giant Frog',
        isExperimental: true,
        hp: 18,
        ac: 11,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 1, dex: 1, con: 0, int: -4, wis: 0, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 3, damage: '1d6+1', damageType: 'piercing' /* TODO: Grapple and Swallow */ }
        ],
        abilities: {}
    },
    {
        name: 'Giant Lizard',
        hp: 19,
        ac: 12,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 2, dex: 1, con: 1, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d8+2', damageType: 'piercing' }
        ],
        abilities: {}
    },
    {
        name: 'Giant Owl',
        hp: 19,
        ac: 12,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 1, dex: 2, con: 1, int: -1, wis: 1, cha: 0 },
        attacks: [
            { name: 'Talons', toHit: 3, damage: '2d6+1', damageType: 'slashing' }
        ],
        abilities: { /* TODO: Flyby */ }
    },
    {
        name: 'Giant Poisonous Snake',
        hp: 11,
        ac: 14,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 4,
        saves: { str: 0, dex: 4, con: 1, int: -4, wis: 0, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 6, damage: '1d4+4', damageType: 'piercing', on_hit_effects: [{ damage: '3d6', damageType: 'poison', save: { dc: 11, type: 'con' }, on_save: 'half' }] }
        ],
        abilities: {}
    },
    {
        name: 'Giant Eagle',
        hp: 26,
        ac: 13,
        cr: '1',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 3, dex: 3, con: 1, int: -1, wis: 2, cha: 0 },
        attacks: [
            { name: 'Beak', toHit: 5, damage: '1d6+3', damageType: 'piercing' },
            { name: 'Talons', toHit: 5, damage: '2d6+3', damageType: 'slashing' },
            { name: 'Multiattack', type: 'multiattack', multiattack: [{ name: 'Beak', count: 1 }, { name: 'Talons', count: 1 }] }
        ],
        abilities: {}
    },
    {
        name: 'Giant Fire Beetle',
        hp: 4,
        ac: 13,
        cr: 0,
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: -1, dex: 0, con: 1, int: -5, wis: -2, cha: 0 },
        attacks: [
            { name: 'Bite', toHit: 1, damage: '1d6-1', damageType: 'slashing' }
        ],
        abilities: {}
    },
    {
        name: 'Giant Rat',
        hp: 7,
        ac: 12,
        cr: '1/8',
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -2, dex: 2, con: 0, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d4+2', damageType: 'piercing' }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Giant Spider (Partial)',
        isExperimental: true,
        hp: 26,
        ac: 14,
        cr: '1',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 1, dex: 3, con: 1, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 5, damage: '1d8+3', damageType: 'piercing', on_hit_effects: [{ damage: '2d8', damageType: 'poison', save: { dc: 11, type: 'con' }, on_save: 'half' }] }
        ],
        abilities: {}
    },
    {
        name: 'Giant Weasel',
        hp: 9,
        ac: 13,
        cr: '1/8',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 0, dex: 3, con: 0, int: -3, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 5, damage: '1d4+3', damageType: 'piercing' }
        ],
        abilities: {}
    },
    {
        name: 'Giant Wolf Spider',
        isExperimental: true,
        hp: 11,
        ac: 13,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: 1, dex: 3, con: 1, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 3, damage: '1d6+1', damageType: 'piercing', on_hit_effects: [{ damage: '2d6', damageType: 'poison', save: { dc: 11, type: 'con' }, on_save: 'half' }] /* TODO: effects on reducing the target to 0 hp with poison */ }
        ],
        abilities: {}
    },
    {
        name: 'Goat',
        hp: 4,
        ac: 10,
        cr: 0,
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 1, dex: 0, con: 0, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Ram', toHit: 3, damage: '1d4+1', damageType: 'bludgeoning' }
        ],
        abilities: { charge: { damage: '1d4', dc: 10, type: 'str', effect: 'prone', attackName: 'Ram' }, sure_footed: true }
    },
    {
        name: 'Goblin',
        isExperimental: true,
        hp: 7,
        ac: 15,
        cr: '1/4',
        size: 'small',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -1, dex: 2, con: 0, int: 0, wis: -1, cha: -1 },
        attacks: [
            { name: 'Scimitar', toHit: 4, damage: '1d6+2', damageType: 'slashing' },
            { name: 'Shortbow', toHit: 4, damage: '1d6+2', damageType: 'piercing', ranged: true }
        ],
        abilities: { /* TODO: Nimble Escape */ }
    },
    {
        name: 'Grimlock',
        isExperimental: true,
        hp: 11,
        ac: 14,
        cr: '1/4',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 3, dex: 1, con: 1, int: -1, wis: -1, cha: -2 },
        attacks: [
            { name: 'Spiked Bone Club', toHit: 5, damage: '1d4+3', damageType: 'bludgeoning', on_hit_effects: [{ damage: '1d4', damageType: 'piercing'} ] }
        ],
        abilities: { condition_immunity: ['blinded'] /* TODO: Blind Senses, Stone Camouflage */ }
    },
    {
        name: 'Guard',
        hp: 11,
        ac: 16,
        cr: '1/8',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 1, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
        attacks: [
            { name: 'Spear (Melee)', toHit: 3, damage: '1d6+1', damageType: 'piercing' },
            /* TODO: Versatile/two-handed weapons dropping shield */
            { name: 'Spear (Ranged)', toHit: 3, damage: '1d6+1', damageType: 'piercing', ranged: true }
        ],
        abilities: {}
    },
    {
        name: 'Hawk',
        hp: 1,
        ac: 13,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: -3, dex: 3, con: -1, int: -4, wis: 2, cha: -2 },
        attacks: [
            { name: 'Talons', toHit: 5, damage: '1', damageType: 'slashing' }
        ],
        abilities: {}
    },
    {
        name: 'Homunculus',
        hp: 5,
        ac: 13,
        cr: 0,
        size: 'tiny',
        type: 'construct',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -3, dex: 2, con: 0, int: 0, wis: 0, cha: -2 },
        attacks: [
            {
                name: 'Bite', toHit: 4, damage: '1d4+1', damageType: 'piercing',
                on_hit_effects: [ { save: { dc: 10, type: 'con' }, on_save: 'negated', effect: { name: 'poisoned', duration: { minutes: 1 } },
                    on_fail_by: [ { margin: 5, duration: { minutes: '1d10' }, effects: [ { name: 'poisoned' }, { name: 'unconscious' } ] } ] }
                ]
            }
        ],
        abilities: {}
    },
    {
        name: 'Hyena',
        hp: 5,
        ac: 11,
        cr: 0,
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 0, dex: 1, con: 1, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bite', toHit: 2, damage: '1d6', damageType: 'piercing' }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Jackal',
        hp: 3,
        ac: 12,
        cr: 0,
        size: 'small',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -1, dex: 2, con: 0, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 1, damage: '1d4-1', damageType: 'piercing' }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Kobold',
        hp: 5,
        ac: 12,
        cr: '1/8',
        size: 'small',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -2, dex: 2, con: -1, int: -1, wis: -2, cha: -1 },
        attacks: [
            { name: 'Dagger', toHit: 4, damage: '1d4+2', damageType: 'piercing' },
            { name: 'Sling', toHit: 4, damage: '1d4+2', damageType: 'bludgeoning', ranged: true }
        ],
        abilities: { pack_tactics: true }
    },
	{
		name: 'Lemure',
		hp: 13,
		ac: 7,
		cr: 0,
		size: 'medium',
		type: 'fiend',
		role: 'frontline',
		initiative_mod: -3,
		saves: { str: 0, dex: -3, con: 0, int: -5, wis: 0, cha: -4 },
		attacks: [
		    { name: 'Fist', toHit: 3, damage: '1d4', damageType: 'bludgeoning' }
		],
		abilities: {}
	},
	{
		name: 'Lizard',
		hp: 2,
		ac: 10,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 0,
		saves: { str: -4, dex: 0, con: 0, int: -5, wis: -1, cha: -4 },
		attacks: [
		    { name: 'Bite', toHit: 0, damage: '1', damageType: 'piercing' }
		],
		abilities: {}
	},
    {
        name: 'Mage',
        isExperimental: true,
        hp: 40,
        ac: 12,
        cr: '6',
        size: 'medium',
        type: 'humanoid',
        role: 'backline',
        initiative_mod: 2,
        saves: { str: -1, dex: 2, con: 0, int: 6, wis: 4, cha: 0 },
        attacks: [
            { name: 'Dagger', toHit: 4, damage: '1d4+1', damageType: 'piercing' },
            { name: 'Fire Bolt', type: 'attack', action: 'action', spellLevel: 0, toHit: 6, damage: '2d10', damageType: 'fire', ranged: true, isMagical: true },
            { name: 'Magic Missile', type: 'damage', action: 'action', spellLevel: 1, damage: '3d4+3', damageType: 'force' },
            { name: 'Fireball', type: 'save', action: 'action', spellLevel: 3, damage: '8d6', damageType: 'fire', save: { dc: 14, type: 'dex' }, half: true },
            { name: 'Cone of Cold', type: 'save', action: 'action', spellLevel: 5, damage: '8d8', damageType: 'cold', save: { dc: 14, type: 'con' }, half: true },
            { name: 'Ice Storm', type: 'save', action: 'action', spellLevel: 4, damage: '2d8', damageType: 'bludgeoning', on_hit_effects: [{ damage: '4d6', damageType: 'cold' }], save: { dc: 14, type: 'dex' }, half: true }
        ],
        abilities: {},
        spell_slots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 }
    },
    {
        name: 'Mastiff',
        hp: 5,
        ac: 12,
        cr: '1/8',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 1, dex: 2, con: 1, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 3, damage: '1d6+1', damageType: 'piercing', on_hit_effects: [{ save: { dc: 11, type: 'str' }, effect: { name: 'prone' } }] }
        ],
        abilities: {}
    },
    {
        name: 'Merfolk',
        hp: 11,
        ac: 11,
        cr: '1/8',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 1 },
        attacks: [
            { name: 'Spear (Melee)', toHit: 2, damage: '1d8', damageType: 'piercing' },
            { name: 'Spear (Ranged)', toHit: 2, damage: '1d6', damageType: 'piercing', ranged: true }
        ],
        abilities: {}
    },
    {
        name: 'Mule',
        hp: 11,
        ac: 10,
        cr: '1/8',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 2, dex: 0, con: 1, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Hooves', toHit: 2, damage: '1d4+2', damageType: 'bludgeoning' }
        ],
        abilities: { sure_footed: true }
    },
    {
        name: 'Noble',
        hp: 9,
        ac: 15,
        cr: '1/8',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 0, dex: 1, con: 0, int: 1, wis: 2, cha: 3 },
        attacks: [
            { name: 'Rapier', toHit: 3, damage: '1d8+1', damageType: 'piercing' }
        ],
        /* TODO: Reactions, parry. */
        abilities: {}
    },
    {
        name: 'Ogre',
        hp: 59,
        ac: 11,
        cr: '2',
        size: 'large',
        type: 'giant',
        role: 'frontline',
        initiative_mod: -1,
        saves: { str: 4, dex: -1, con: 3, int: -3, wis: -2, cha: -2 },
        attacks: [
            { name: 'Greatclub', toHit: 6, damage: '2d8+4', damageType: 'bludgeoning' },
            { name: 'Javelin', toHit: 6, damage: '2d6+4', damageType: 'piercing', ranged: true }
        ],
        abilities: {}
    },
    {
        name: 'Orc',
        hp: 15,
        ac: 13,
        cr: '1/2',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 3, dex: 1, con: 3, int: -2, wis: 0, cha: 0 },
        attacks: [
            { name: 'Greataxe', toHit: 5, damage: '1d12+3', damageType: 'slashing' },
            { name: 'Javelin', toHit: 5, damage: '1d6+3', damageType: 'piercing', ranged: true }
        ],
        abilities: {}
    },
	{
		name: 'Octopus (Partial)',
		isExperimental: true,
		hp: 3,
		ac: 12,
		cr: 0,
		size: 'small',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 2,
		saves: { str: -3, dex: 2, con: 0, int: -4, wis: 0, cha: -3 },
		attacks: [
		    { name: 'Tentacles', toHit: 4, damage: '1', damageType: 'bludgeoning' /* TODO: Grapple */ }
            /* TODO: Ink Cloud */
		],
		abilities: { /* TODO: Underwater camouflage */ }
	},
	{
		name: 'Owl (Partial)',
		isExperimental: true,
		hp: 1,
		ac: 11,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 1,
		saves: { str: -4, dex: 1, con: -1, int: -4, wis: 1, cha: -2 },
		attacks: [
		    { name: 'Talons', toHit: 3, damage: '1', damageType: 'slashing' }
		],
		abilities: { /* TODO: Flyby */ }
	},
    {
        name: 'Panther',
        isExperimental: true,
        hp: 13,
        ac: 12,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 2, dex: 2, con: 0, int: -4, wis: 2, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d6+2', damageType: 'piercing' },
            { name: 'Claw', toHit: 4, damage: '1d4+2', damageType: 'slashing' }
        ],
        abilities: { /* TODO: Pounce (looks like an extension of Charge) */ }
    },
    {
        name: 'Poisonous Snake',
        hp: 2,
        ac: 13,
        cr: '1/8',
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: -4, dex: 3, con: 0, int: -5, wis: 0, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 5, damage: '1', damageType: 'piercing', on_hit_effects: [{ damage: '2d4', damageType: 'poison', save: { dc: 10, type: 'con' }, on_save: 'half' }] }
        ],
        abilities: {}
    },
    {
        name: 'Pony',
        hp: 11,
        ac: 10,
        cr: '1/8',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 2, dex: 0, con: 1, int: -4, wis: 0, cha: -2 },
        attacks: [
            { name: 'Hooves', toHit: 4, damage: '2d4+2', damageType: 'bludgeoning' }
        ]
    },
    {
        name: 'Pseudodragon',
        hp: 7,
        ac: 13,
        cr: '1/4',
        size: 'tiny',
        type: 'dragon',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -2, dex: 2, con: 1, int: 0, wis: 1, cha: 0 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1d4+2', damageType: 'piercing' },
            { name: 'Sting', toHit: 4, damage: '1d4+2', damageType: 'piercing', on_hit_effects: [{ save: { dc: 11, type: 'con' }, on_save: 'negated', effect: { name: 'poisoned', duration: { hours: 1 } }, on_fail_by: [{ margin: 5, duration: { hours: '1' }, effects: [{ name: 'unconscious' }] }] }] }
        ],
        abilities: { magic_resistance: true }
    },
	{
		name: 'Quipper',
		hp: 1,
		ac: 13,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 3,
		saves: { str: -4, dex: 3, con: -1, int: -5, wis: -2, cha: -4 },
		attacks: [
		    { name: 'Bite', toHit: 5, damage: '1', damageType: 'piercing' }
		],
		abilities: {}
	},
	{
		name: 'Rat',
		hp: 1,
		ac: 10,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 0,
		saves: { str: -4, dex: 0, con: -1, int: -4, wis: 0, cha: -3 },
		attacks: [
		    { name: 'Bite', toHit: 0, damage: '1', damageType: 'piercing' }
		],
		abilities: {}
	},
	{
		name: 'Raven',
		hp: 1,
		ac: 12,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 2,
		saves: { str: -4, dex: 2, con: -1, int: -4, wis: 1, cha: -2 },
		attacks: [
		    { name: 'Beak', toHit: 4, damage: '1', damageType: 'piercing' }
		],
		abilities: {}
	},
    {
        name: 'Riding Horse',
        hp: 13,
        ac: 10,
        cr: '1/4',
        size: 'large',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 3, dex: 0, con: 1, int: -4, wis: 0, cha: -2 },
        attacks: [
            { name: 'Hooves', toHit: 5, damage: '2d4+3', damageType: 'bludgeoning' }
        ],
        abilities: {}
    },
	{
		name: 'Scorpion',
		hp: 1,
		ac: 11,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 0,
		saves: { str: -4, dex: 0, con: -1, int: -5, wis: -1, cha: -4 },
		attacks: [
		    { name: 'Sting', toHit: 2, damage: '1', damageType: 'piercing', on_hit_effects: [{damage: '1d8', damageType: 'poison', save: { dc: 9, type: 'con' }, on_save: 'half' }] }
		],
		abilities: {}
	},
	{
		name: 'Sea Horse',
		hp: 1,
		ac: 11,
		cr: 0,
		size: 'tiny',
		type: 'beast',
		role: 'frontline',
		initiative_mod: 1,
		saves: { str: -5, dex: 1, con: -1, int: -5, wis: 0, cha: -4 },
		attacks: [],
		abilities: {}
	},
    {
        name: 'Shrieker',
        hp: 13,
        ac: 5,
        cr: 0,
        size: 'medium',
        type: 'plant',
        role: 'frontline',
        initiative_mod: -5,
        saves: { str: -5, dex: -5, con: 0, int: -5, wis: -4, cha: -5 },
        attacks: [],
        abilities: { condition_immunity: ['blinded', 'deafened', 'frightened'] }
    },
    {
        name: 'Skeleton',
        hp: 13,
        ac: 13,
        cr: '1/4',
        size: 'medium',
        type: 'undead',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 0, dex: 2, con: 2, int: -2, wis: -1, cha: -3 },
        attacks: [
            { name: 'Shortsword', toHit: 4, damage: '1d6+2', damageType: 'piercing' },
            { name: 'Shortbow', toHit: 4, damage: '1d6+2', damageType: 'piercing', ranged: true }
        ],
        abilities: { damage_immunity: ['poison'], condition_immunity: ['exhaustion', 'poisoned'], vulnerability: ['bludgeoning'] }
    },
    {
        name: 'Spider',
        hp: 1,
        ac: 12,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -4, dex: 2, con: -1, int: -5, wis: 0, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '1', damageType: 'piercing', on_hit_effects: [{ damage: '1d4', damageType: 'poison', save: { dc: 9, type: 'con' }, on_save: 'negated' }] }
        ],
        abilities: {}
    },
    {
        name: 'Giant Spider',
        isExperimental: true,
        hp: 2,
        ac: 15,
        cr: '1/4',
        size: 'tiny',
        type: 'fey',
        role: 'backline',
        initiative_mod: 4,
        saves: { str: -4, dex: 4, con: 0, int: 2, wis: 1, cha: 0 },
        attacks: [
            { name: 'Longsword', toHit: 2, damage: '1', damageType: 'slashing' },
            { name: 'Shortbow', toHit: 6, damage: '1', damageType: 'piercing', on_hit_effects: [{ save: { dc: 10, type: 'con' }, on_save: 'negated', effect: { name: 'poisoned', duration: { minutes: 1 } }, on_fail_by: [{ margin: 5, duration: { minutes: '1' }, effects: [{ name: 'unconscious' }] }] }], ranged: true }
        ],
        abilities: { /* TODO: Invisibility */ }
    },
    {
        name: 'Steam Mephit',
        isExperimental: true,
        hp: 21,
        ac: 10,
        cr: '1/4',
        size: 'small',
        type: 'elemental',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: -3, dex: 0, con: 0, int: 0, win: 0, cha: 1 },
        attacks: [
            { name: 'Claws', toHit: 2, damage: '1d4', damageType: 'slashing', on_hit_effects: [{ damage: '1d4', damageType: 'fire' } ] },
            /* TODO: Steam Breath */
            { name: 'Blur', type: 'effect', targeting: 'self', effect: { name: 'disadvantage_on_attacks_received', duration: { minutes: 1, concentration: true} } }
        ],
        abilities: { damage_immunity: ['fire', 'poison'], condition_immunity: ['poisoned'] }
    },
    {
        name: 'Stirge',
        isExperimental: true,
        hp: 2,
        ac: 14,
        cr: '1/8',
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: -3, dex: 3, con: 0, int: -4, wis: -1, cha: -2 },
        attacks: [
            { name: 'Blood Drain', toHit: 5, damage: '1d4+3', damageType: 'piercing' /* TODO: Attach and drain blood */ }
        ],
        abilities: {}
    },
    {
        name: 'Swarm of Bats',
        isExperimental: true,
        hp: 22,
        ac: 12,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -3, dex: 2, con: 0, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Bites', toHit: 4, damage: '2d4', damageType: 'piercing' /* TODO: reduce damage when udner 1/2 hp */ }
        ],
        abilities: { resistance: ['bludgeoning', 'piercing', 'slashing'], condition_immunity: ['charmed', 'frightened', 'grappled', 'paralyzed', 'petrified', 'prone', 'restrained', 'stunned'] }
        /* TODO: Echolocation and swarm (no healing, no temp hp) */
    },
    {
        name: 'Swarm of Rats',
        isExperimental: true,
        hp: 24,
        ac: 10,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: -1, dex: 0, con: -1, int: -4, wis: 0, cha: -4 },
        attacks: [
            { name: 'Bites', toHit: 2, damage: '2d6', damageType: 'piercing' /* TODO: reduce damage when udner 1/2 hp */ }
        ],
        abilities: { resistance: ['bludgeoning', 'piercing', 'slashing'], condition_immunity: ['charmed', 'frightened', 'grappled', 'paralyzed', 'petrified', 'prone', 'restrained', 'stunned'] }
        /* TODO: Swarm (no healing, no temp hp) */
    },
    {
        name: 'Swarm of Ravens',
        isExperimental: true,
        hp: 24,
        ac: 12,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: -2, dex: 2, con: -1, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Beaks', toHit: 4, damage: '2d6', damageType: 'piercing' /* TODO: reduce damage when udner 1/2 hp */ }
        ],
        abilities: { resistance: ['bludgeoning', 'piercing', 'slashing'], condition_immunity: ['charmed', 'frightened', 'grappled', 'paralyzed', 'petrified', 'prone', 'restrained', 'stunned'] }
        /* TODO: Swarm (no healing, no temp hp) */
    },
    {
        name: 'Tribal Warrior',
        hp: 11,
        ac: 12,
        cr: '1/8',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: 1, dex: 0, con: 1, int: -1, wis: 0, cha: -1 },
        attacks: [
            { name: 'Spear (Melee)', toHit: 3, damage: '1d6+1', damageType: 'piercing' },
            { name: 'Spear (Ranged)', toHit: 3, damage: '1d6+1', damageType: 'piercing', ranged: true }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Troll',
        hp: 84,
        ac: 15,
        cr: '5',
        size: 'large',
        type: 'giant',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 4, dex: 1, con: 5, int: -2, wis: -1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 7, damage: '1d6+4', damageType: 'piercing' },
            { name: 'Claw', toHit: 7, damage: '2d6+4', damageType: 'slashing' },
            { name: 'Multiattack', type: 'multiattack', multiattack: [{ name: 'Bite', count: 1 }, { name: 'Claw', count: 2 }] }
        ],
        abilities: { regeneration: 10 }
    },
    {
        name: 'Veteran',
        hp: 58,
        ac: 17,
        cr: '3',
        size: 'medium',
        type: 'humanoid',
        role: 'frontline',
        initiative_mod: 1,
        saves: { str: 3, dex: 1, con: 2, int: 0, wis: 0, cha: 0 },
        attacks: [
            { name: 'Longsword (One-Handed)', toHit: 5, damage: '1d8+3', damageType: 'slashing' },
            { name: 'Longsword (Two-Handed)', toHit: 5, damage: '1d10+3', damageType: 'slashing' },
            { name: 'Shortsword', toHit: 5, damage: '1d6+3', damageType: 'piercing' },
            { name: 'Heavy Crossbow', toHit: 3, damage: '1d10+1', damageType: 'piercing', ranged: true },
            { name: 'Multiattack (One-Handed)', type: 'multiattack', multiattack: [{ name: 'Longsword (One-Handed)', count: 2 }, { name: 'Shortsword', count: 1 }] },
            { name: 'Multiattack (Two-Handed)', type: 'multiattack', multiattack: [{ name: 'Longsword (Two-Handed)', count: 2 }] }
        ],
        abilities: {}
    },
    {
        name: 'Violet Fungus',
        isExperimental: true,
        hp: 18,
        ac: 5,
        cr: '1/4',
        size: 'medium',
        type: 'plant',
        role: 'frontline',
        initiative_mod: -5,
        saves: { str: -4, dex: -5, con: 0, int: -5, wis: -4, cha: -5 },
        attacks: [
            { name: 'Rotting Touch', toHit: 2, damage: '1d8', damageType: 'necrotic' },
            { name: 'Multiattack', type: 'multiattack', multiattack: [{ name: 'Rotting Touch', count: '2' }] /* TODO: multiattack count as die expression */ }
        ],
        abilities: { condition_immunity: ['blinded', 'deafened', 'frightened'] }
        /* TODO: False Appearance */
    },
    {
        name: 'Vulture',
        hp: 5,
        ac: 10,
        cr: 0,
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 0,
        saves: { str: -2, dex: 0, con: 1, int: -4, wis: 1, cha: -3 },
        attacks: [
            { name: 'Beak', toHit: 2, damage: '1d4', damageType: 'piercing' }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Weasel',
        hp: 1,
        ac: 13,
        cr: 0,
        size: 'tiny',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 3,
        saves: { str: -4, dex: 3, con: -1, int: -4, wis: 1, cha: -4 },
        attacks: [
            { name: 'Bite', toHit: 5, damage: '1', damageType: 'piercing' }
        ],
        abilities: {}
    },
    {
        name: 'Wolf',
        hp: 11,
        ac: 13,
        cr: '1/4',
        size: 'medium',
        type: 'beast',
        role: 'frontline',
        initiative_mod: 2,
        saves: { str: 1, dex: 2, con: 1, int: -4, wis: 1, cha: -2 },
        attacks: [
            { name: 'Bite', toHit: 4, damage: '2d4+2', damageType: 'piercing', on_hit_effects: [{ save: { dc: 11, type: 'str' }, effect: { name: 'prone' } }] }
        ],
        abilities: { pack_tactics: true }
    },
    {
        name: 'Zombie',
        isExperimental: true,
        hp: 22,
        ac: 8,
        cr: '1/4',
        size: 'medium',
        type: 'undead',
        role: 'frontline',
        initiative_mod: -2,
        saves: { str: 1, dex: -2, con: 3, int: -4, wis: 0, cha: -3 },
        attacks: [
            { name: 'Slam', toHit: 3, damage: '1d6+1', damageType: 'bludgeoning' }
        ],
        abilities: { damage_immunity: ['poison'], condition_immunity: ['poisoned'] }
        /* TODO: Undead Fortitude */
    }
];