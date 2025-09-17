// js/data.js

var sizeOrder = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
var DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
].sort();

function readCombatantFromForm(existingId = null) {
    const prefix = 'editor';
    const combatant = {
        id: existingId,
        name: document.getElementById(`${prefix}-name`).value || 'Combatant',
        hp: parseInt(document.getElementById(`${prefix}-hp`).value) || 10,
        ac: parseInt(document.getElementById(`${prefix}-ac`).value) || 10,
        size: document.getElementById(`${prefix}-size`).value,
        role: document.getElementById(`${prefix}-role`).value,
        type: document.getElementById(`${prefix}-type`).value.toLowerCase(),
        initiative_mod: parseInt(document.getElementById(`${prefix}-init_mod`).value) || 0,
        saves: {},
        spell_slots: {},
        attacks: [],
        abilities: {}
    };
    combatant.maxHp = combatant.hp;

    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(s => {
        combatant.saves[s] = parseInt(document.getElementById(`${prefix}-save-${s}`).value) || 0;
    });
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(s => {
        combatant.spell_slots[s] = parseInt(document.getElementById(`${prefix}-slot-${s}`).value) || 0;
    });

    // Actions and abilities are edited in separate flows. When the main combatant form is saved,
    // we must preserve the existing attacks and abilities from the editor's state to prevent data loss.
    const { combatant: editorCombatant } = appState.getEditorState();
    combatant.attacks = editorCombatant ? deepCopy(editorCombatant.attacks) : [];
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

    // The form type is stored in a hidden input to make the form self-describing.
    const formType = getValue('action-editor-form-type');
    if (formType) {
        action.type = formType;
    }

    action.name = getValue('action-editor-name') || 'Unnamed Action';
    action.action = getValue('action-editor-action');

    const toHit = getInt('action-editor-toHit');
    if (toHit !== null) action.toHit = toHit;

    const damage = getValue('action-editor-damage');
    if (damage) action.damage = damage;

    // This is the damage type, not the action type.
    const damageType = getValue('action-editor-type');
    if (damageType) action.damageType = damageType;

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

    // --- On-Hit Effect Logic ---
    const onHitDamage = getValue('action-editor-onhit-damage');
    const onHitDamageType = getValue('action-editor-onhit-damage-type');
    const onHitSaveDc = getInt('action-editor-onhit-save-dc');
    const onHitSaveType = getValue('action-editor-onhit-save-type');
    const onHitOnSave = getValue('action-editor-onhit-on-save');
    const effectName = getValue('action-editor-effect-name');
    const effectDuration = getInt('action-editor-effect-duration');

    const onHitEffect = {};
    let hasOnHitData = false;

    if (onHitDamage) {
        onHitEffect.damage = onHitDamage;
        if (onHitDamageType) onHitEffect.damageType = onHitDamageType;
        hasOnHitData = true;
    }

    if (onHitSaveDc && onHitSaveType) {
        onHitEffect.save = { dc: onHitSaveDc, type: onHitSaveType };
        if (onHitOnSave) onHitEffect.on_save = onHitOnSave;
        hasOnHitData = true;
    }

    if (effectName && effectDuration !== null) {
        // This effect could be for an on_hit_effect or a primary effect.
        if (action.type === 'attack' || action.type === 'save') {
            onHitEffect.effect = { name: effectName, duration: effectDuration };
            hasOnHitData = true;
        } else { // 'effect' type
            action.effect = { name: effectName, duration: effectDuration };
        }
    }

    if (hasOnHitData) {
        action.on_hit_effect = onHitEffect;
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

    if (getChecked('action-editor-isMagical')) action.isMagical = true;

    // Multiattack properties
    const multiattackContainer = document.querySelector('[data-cy="multiattack-options"]');
    if (multiattackContainer) {
        action.multiattack = [];
        const checkboxes = multiattackContainer.querySelectorAll('input[type="checkbox"][data-sub-action-name]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const name = checkbox.dataset.subActionName;
                const countInput = multiattackContainer.querySelector(`input[type="number"][data-sub-action-count="${name}"]`);
                const count = parseInt(countInput.value, 10) || 1;
                action.multiattack.push({ name, count });
            }
        });
    }

    // Pool Heal properties
    const poolName = getValue('action-editor-pool-select');
    const poolHealAmount = getInt('action-editor-pool-heal-amount');
    if (poolName && poolHealAmount !== null) {
        action.type = 'pool_heal';
        action.poolName = poolName;
        action.amount = poolHealAmount;
    }

    return action;
}