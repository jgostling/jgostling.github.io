// js/data.js

function readCombatantFromForm(team, existingId = null) {
    const prefix = team.toLowerCase();
    const combatant = {
        id: existingId || `c${Date.now()}${Math.random()}`,
        team: team,
        name: document.getElementById(`name-${prefix}`).value || 'Combatant',
        hp: parseInt(document.getElementById(`hp-${prefix}`).value) || 10,
        ac: parseInt(document.getElementById(`ac-${prefix}`).value) || 10,
        size: document.getElementById(`size-${prefix}`).value,
        type: document.getElementById(`type-${prefix}`).value.toLowerCase(),
        initiative_mod: parseInt(document.getElementById(`init_mod-${prefix}`).value) || 0,
        saves: {},
        spell_slots: {},
        attacks: [],
        abilities: {}
    };
    combatant.maxHp = combatant.hp;

    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(s => {
        combatant.saves[s] = parseInt(document.getElementById(`save-${s}-${prefix}`).value) || 0;
    });
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(s => {
        combatant.spell_slots[s] = parseInt(document.getElementById(`slot-${s}-${prefix}`).value) || 0;
    });

    const attacksText = document.getElementById(`attacks-${prefix}`).value;
    combatant.attacks = attacksText.split('\n').filter(l => l.trim()).map(l => parseAction(l));
    
    const abilitiesText = document.getElementById(`abilities-${prefix}`).value;
    abilitiesText.split(',').map(s => s.trim().toLowerCase()).filter(s => s).forEach(ability => {
        const [key, value] = ability.split(':').map(s => s.trim());
        combatant.abilities[key] = value || true;
    });

    return combatant;
}

function parseAction(line) {
    const action = { action: 'action' };
    line.split(',').forEach(part => {
        const [key, ...valParts] = part.split(':');
        const value = valParts.join(':').trim();
        const keyTrim = key.trim();
        
        if (keyTrim === 'spell') action.spellLevel = parseInt(value);
        else if (keyTrim === 'save') {
            const [dc, type] = value.split('/');
            action.save = { dc: parseInt(dc), type: type.trim() };
        }
        else if (keyTrim === 'uses') {
            const [val, per] = value.split('/');
            action.uses = { max: parseInt(val), per: per || 'combat' };
        }
        else if (keyTrim === 'effect') {
            const [name, duration] = value.split('/');
            action.effect = { name: name.trim(), duration: parseInt(duration) || 10 };
        }
        else if (keyTrim === 'heavy' || keyTrim === 'ranged') {
            action[keyTrim] = true;
        }
        else action[keyTrim] = value;
    });
    return action;
}

function stringifyAction(action) {
    return Object.entries(action).map(([key, value]) => {
        if (key === 'spellLevel') return `spell:${value}`;
        if (key === 'save' && value) return `save:${value.dc}/${value.type}`;
        if (key === 'uses' && value) return `uses:${value.max}/${value.per}`;
        if (key === 'effect' && value) return `effect:${value.name}/${value.duration}`;
        if (key === 'heavy' && value === true) return 'heavy';
        if (key === 'ranged' && value === true) return 'ranged';
        if (value && typeof value !== 'boolean') return `${key}:${value}`;
        return null;
    }).filter(Boolean).join(', ');
}