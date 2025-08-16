// js/data.js

function readCombatantFromForm(team, existingId = null) {
    const prefix = team.toLowerCase();
    const combatant = {
        id: existingId || `c${Date.now()}${Math.random()}`,
        name: document.getElementById(`name-${prefix}`).value || 'Combatant',
        hp: parseInt(document.getElementById(`hp-${prefix}`).value) || 10,
        ac: parseInt(document.getElementById(`ac-${prefix}`).value) || 10,
        size: document.getElementById(`size-${prefix}`).value,
        role: document.getElementById(`role-${prefix}`).value,
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

    // This part is now handled by the action editor modal.
    // To prevent data loss during an edit before the new modal is fully implemented,
    // we preserve the existing attacks from the editor's state.
    const { combatant: editorCombatant } = appState.getEditorState();
    combatant.attacks = editorCombatant ? deepCopy(editorCombatant.attacks) : [];
    // Preserve abilities as well until the new UI is fully implemented.
    combatant.abilities = editorCombatant ? deepCopy(editorCombatant.abilities) : {};

    combatant.threat = calculateThreat(combatant);

    return combatant;
}

function readActionFromForm() {
    const action = {};

    const getValue = (id) => document.getElementById(id)?.value.trim() || null;
    const getInt = (id) => {
        const val = parseInt(document.getElementById(id)?.value, 10);
        return isNaN(val) ? null : val;
    };
    const getChecked = (id) => document.getElementById(id)?.checked || false;

    action.name = getValue('action-editor-name') || 'Unnamed Action';
    action.action = getValue('action-editor-action');

    const toHit = getInt('action-editor-toHit');
    if (toHit !== null) action.toHit = toHit;

    const damage = getValue('action-editor-damage');
    if (damage) action.damage = damage;

    const type = getValue('action-editor-type');
    if (type) action.type = type;

    if (getChecked('action-editor-ranged')) action.ranged = true;
    if (getChecked('action-editor-heavy')) action.heavy = true;

    const saveDc = getInt('action-editor-save-dc');
    const saveType = getValue('action-editor-save-type');
    if (saveDc !== null && saveType) {
        action.save = { dc: saveDc, type: saveType };
        if (getChecked('action-editor-half')) action.half = true;
    }

    const heal = getValue('action-editor-heal');
    if (heal) action.heal = heal;

    const effectName = getValue('action-editor-effect-name');
    const effectDuration = getInt('action-editor-effect-duration');
    if (effectName && effectDuration !== null) {
        action.effect = { name: effectName, duration: effectDuration };
    }

    const usesMax = getInt('action-editor-uses-max');
    const usesPer = getValue('action-editor-uses-per');
    if (usesMax !== null && usesPer) {
        action.uses = { max: usesMax, per: usesPer };
    }

    const spellLevel = getInt('action-editor-spellLevel');
    if (spellLevel !== null) action.spellLevel = spellLevel;

    const targets = getInt('action-editor-targets');
    if (targets !== null) action.targets = targets;

    const targeting = getValue('action-editor-targeting');
    if (targeting && targeting !== 'any') action.targeting = targeting;

    return action;
}