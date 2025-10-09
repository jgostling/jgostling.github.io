var DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
].sort();

var sizeOrder = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

var CORE_IMMUNITY_CONDITIONS = [
    'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 
    'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
].sort();

function _readGraduatedEffectsFromContainer(container) {
    if (!container) return [];
    
    const onFailBy = [];
    // Iterate through direct children to be more robust than a broad querySelectorAll.
    // This avoids potential issues with nested structures or JSDOM quirks.
    const ruleRows = Array.from(container.children).filter(child => child.classList.contains('graduated-effect-rule'));

    ruleRows.forEach(ruleRow => {
        const marginInput = ruleRow.querySelector('.graduated-effect-margin');
        const margin = marginInput ? parseInt(marginInput.value, 10) : null;

        if (margin === null || isNaN(margin)) return;

        const rule = { margin };
        // The duration container is nested inside the ruleRow, so we query from the ruleRow itself for robustness.
        const sharedDuration = _readDurationFromContainer(ruleRow);
        if (sharedDuration) {
            rule.duration = sharedDuration;
        }

        const nestedEffectRows = ruleRow.querySelectorAll('.nested-effect-row');
        rule.effects = Array.from(nestedEffectRows).map(nestedRow => {
            return { name: nestedRow.querySelector('.nested-effect-name').value };
        }).filter(effect => effect.name);

        if (rule.effects.length > 0) onFailBy.push(rule);
    });
    return onFailBy;
}

function _readDurationFromContainer(container) {
    if (!container) return null;

    const durationComponents = {};
    const rows = container.querySelectorAll('.duration-component-row');
    rows.forEach(row => {
        const rawValue = row.querySelector('.duration-value').value.trim();
        const unit = row.querySelector('.duration-unit').value;
        if (rawValue && unit) {
            if (rawValue.includes('d')) {
                durationComponents[unit] = rawValue;
            } else {
                const numericValue = parseInt(rawValue, 10);
                if (!isNaN(numericValue)) {
                    durationComponents[unit] = numericValue;
                }
            }
        }
    });

    return Object.keys(durationComponents).length > 0 ? durationComponents : null;
}

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

    if (document.getElementById(`${prefix}-wears-metal-armor`)?.checked) {
        combatant.armor = { material: 'metal' };
    }

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

    const readDuration = () => {
        const durationContainer = document.getElementById('duration-components-container');
        const durationComponents = _readDurationFromContainer(durationContainer) || {};
        const concentrationCheckbox = document.getElementById('action-editor-duration-concentration');
        if (concentrationCheckbox?.checked) {
            durationComponents.concentration = true;
        }

        const relativeCheckbox = document.getElementById('action-editor-duration-relative');
        if (relativeCheckbox?.checked) {
            durationComponents.relativeTo = 'source';
        }

        return Object.keys(durationComponents).length > 0 ? durationComponents : null;
    };

    // The form type is stored in a hidden input to make the form self-describing.
    const formType = getValue('action-editor-form-type');
    if (formType) {
        action.type = formType;
    }

    if (formType === 'targeted_effect') {
        // This is the new logic path for the streamlined form.
        action.formType = 'targeted_effect'; // Persist the form type for editing later.
        action.name = getValue('action-editor-name') || 'Unnamed Action';
        action.action = getValue('action-editor-action');

        // Read general properties
        const spellLevel = getInt('action-editor-spellLevel');
        if (spellLevel !== null) action.spellLevel = spellLevel;

        const targets = getInt('action-editor-targets');
        if (targets !== null) action.targets = targets;

        const targeting = getValue('action-editor-targeting');
        if (targeting) action.targeting = targeting;

        if (getChecked('action-editor-isMagical')) action.isMagical = true;

        // Determine type based on whether a save is enabled.
        if (getChecked('action-editor-enable-save')) {
            action.type = 'save';
            const saveDc = getInt('action-editor-save-dc');
            const saveType = getValue('action-editor-save-type');
            if (saveDc !== null && saveType) {
                action.save = { dc: saveDc, type: saveType };
                if (getChecked('action-editor-half')) action.half = true;
            }
        } else {
            action.type = 'effect';
        }

        const damage = getValue('action-editor-damage');
        if (damage) action.damage = damage;

        const damageType = getValue('action-editor-damage-type');
        if (damageType) action.damageType = damageType;

        // Read the first condition as the primary effect.
        const firstConditionRow = document.querySelector('.targeted-effect-condition-row');
        if (firstConditionRow) {
            const effectName = firstConditionRow.querySelector('.targeted-effect-condition-name').value;
            if (effectName) {
                const effectObject = { name: effectName };
                const duration = _readDurationFromContainer(firstConditionRow);
                if (duration) {
                    const relativeCheckbox = firstConditionRow.querySelector('.relative-to-caster-checkbox');
                    if (relativeCheckbox?.checked) duration.relativeTo = 'source';
                    effectObject.duration = duration;
                }
                const noSourceCheckbox = firstConditionRow.querySelector('.no-source-checkbox');
                // Ensure noSource is explicitly false if unchecked, to match the test expectation.
                effectObject.noSource = !!noSourceCheckbox?.checked;
                action.effect = effectObject;

                // Read extra config for the primary effect (e.g., resistance types)
                const resistanceSelector = firstConditionRow.querySelector('#action-editor-resistance-types');
                if (resistanceSelector) {
                    const selectedTypes = Array.from(resistanceSelector.selectedOptions).map(opt => opt.value);
                    if (selectedTypes.length > 0) effectObject.types = selectedTypes;
                }

                const dieInput = firstConditionRow.querySelector('#action-editor-effect-die');
                if (dieInput) {
                    const dieValue = dieInput.value.trim();
                    if (dieValue) effectObject.die = dieValue;
                }


                // Handle concentration for the primary effect
                const concentrationCheckbox = firstConditionRow.querySelector('.concentration-checkbox');
                if (concentrationCheckbox?.checked) {
                    if (!action.effect.duration) {
                        action.effect.duration = {};
                    }
                    action.effect.duration.concentration = true;
                }

                // If the primary effect has concentration, the top-level action should reflect that.
                if (action.effect.duration?.concentration) action.concentration = true;
            }
        }

        // Read graduated effects
        const onFailBy = _readGraduatedEffectsFromContainer(document.getElementById('graduated-effects-container-null'));
        if (onFailBy.length > 0) { action.on_fail_by = onFailBy; }

        // Read action properties
        const propertiesSelect = document.getElementById('action-editor-properties');
        if (propertiesSelect) {
            const selectedProperties = Array.from(propertiesSelect.selectedOptions).map(opt => opt.value).filter(Boolean);
            if (selectedProperties.length > 0) action.properties = selectedProperties;
        }

        return action; // Return early to avoid running the old parsing logic.
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
    if (formType === 'attack') {
        const onHitEffectsContainer = document.getElementById('on-hit-effects-container');
        if (onHitEffectsContainer) {
            const effectForms = onHitEffectsContainer.querySelectorAll('.on-hit-effect-form');
            const onHitEffects = [];

            effectForms.forEach(form => {
                const onHitEffect = {};
                let hasOnHitData = false;

                const getFormValue = (selector) => form.querySelector(selector)?.value.trim() || null;
                const getFormInt = (selector) => {
                    const val = parseInt(form.querySelector(selector)?.value, 10);
                    return isNaN(val) ? null : val;
                };

                const onHitIfTargetIsSelect = form.querySelector('.action-editor-onhit-if-target-is');
                if (onHitIfTargetIsSelect) {
                    const selectedTypes = Array.from(onHitIfTargetIsSelect.selectedOptions).map(opt => opt.value).filter(Boolean); // Filter out empty string from "-- Any --"
                    if (selectedTypes.length > 0) { onHitEffect.if_target_is = selectedTypes; hasOnHitData = true; }
                }

                const onHitDamage = getFormValue('.action-editor-onhit-damage');
                if (onHitDamage) { onHitEffect.damage = onHitDamage; hasOnHitData = true; }

                const onHitDamageType = getFormValue('.action-editor-onhit-damage-type');
                if (onHitDamageType) { onHitEffect.damageType = onHitDamageType; hasOnHitData = true; }

                const onHitSaveDc = getFormInt('.action-editor-onhit-save-dc');
                const onHitSaveType = getFormValue('.action-editor-onhit-save-type');
                if (onHitSaveDc && onHitSaveType) {
                    onHitEffect.save = { dc: onHitSaveDc, type: onHitSaveType };
                    const onHitOnSave = getFormValue('.action-editor-onhit-on-save');
                    if (onHitOnSave) onHitEffect.on_save = onHitOnSave;
                    hasOnHitData = true;
                }

                const onHitEffectName = getFormValue('.action-editor-onhit-effect-name');
                if (onHitEffectName) {
                    const effectObject = { name: onHitEffectName };

                    // Read duration from within the specific on-hit form, which has a unique container ID
                    const durationContainer = form.querySelector('[id^="duration-components-container"]');
                    const duration = _readDurationFromContainer(durationContainer); // This returns null if no duration
                    if (duration) {
                        const relativeCheckbox = form.querySelector('.relative-to-caster-checkbox');
                        if (relativeCheckbox?.checked) duration.relativeTo = 'source';

                        effectObject.duration = duration;
                    }

                    const noSourceCheckbox = form.querySelector('.no-source-checkbox');
                    if (noSourceCheckbox?.checked) effectObject.noSource = true;
                    
                    onHitEffect.effect = effectObject;
                    hasOnHitData = true;
                }

                // Read graduated effects for this on-hit effect.
                // The container ID is dynamically generated based on the on-hit effect's index.
                const onHitIndex = Array.from(effectForms).indexOf(form);
                const graduatedEffectsContainer = form.querySelector(`#graduated-effects-container-${onHitIndex}`);
                const onFailBy = _readGraduatedEffectsFromContainer(graduatedEffectsContainer);
                if (onFailBy.length > 0) {
                    onHitEffect.on_fail_by = onFailBy;
                    hasOnHitData = true; // A graduated effect is valid data.
                }

                if (hasOnHitData) onHitEffects.push(onHitEffect);
            });

            if (onHitEffects.length > 0) action.on_hit_effects = onHitEffects; // New array format
        }
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

    // Action Properties
    const propertiesSelect = document.getElementById('action-editor-properties');
    if (propertiesSelect) {
        const selectedProperties = Array.from(propertiesSelect.selectedOptions).map(opt => opt.value).filter(Boolean);
        if (selectedProperties.length > 0) action.properties = selectedProperties;
    }

    return action;
}