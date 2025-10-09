// js/monster_library_data.js

var MONSTER_LIBRARY_DATA = [
    {
        name: 'Acolyte',
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
        ],
        abilities: {},
        spell_slots: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
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
        name: 'Giant Spider (Partial)',
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
        name: 'Goblin (Partial)',
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
        ]
    },
    {
        name: 'Mage (Partial)',
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
        name: 'Zombie (Partial)',
        hp: 22,
        ac: 8,
        cr: '1/4',
        size: 'medium',
        type: 'undead',
        role: 'frontline',
        initiative_mod: -2,
        saves: { str: 1, dex: -2, con: 3, int: -4, wis: -2, cha: -3 },
        attacks: [
            { name: 'Slam', toHit: 3, damage: '1d6+1', damageType: 'bludgeoning' }
        ],
        abilities: { damage_immunity: ['poison'], condition_immunity: ['poisoned'] }
    }
];