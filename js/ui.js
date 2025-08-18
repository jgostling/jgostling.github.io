// js/ui.js

function _getTooltipHTML(text) {
    return `
        <span class="tooltip-container">
            <span class="tooltip-icon" data-action="toggle-tooltip">?</span>
            <span class="tooltip-box">${text}</span>
        </span>
    `;
}

function getEditorHTML() {
    const { combatant, team, isEditing } = appState.getEditorState();
    const data = combatant || {};
    const prefix = 'modal'; // Use a single, static prefix for the modal editor
    
    const name = data.name || '';
    const hp = data.hp || '';
    const ac = data.ac || '';
    const size = data.size || 'medium';
    const role = data.role || 'frontline';
    const type = data.type || '';
    const init_mod = data.initiative_mod || 0;
    const saves = data.saves || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const spell_slots = data.spell_slots || { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };

    const currentAbilities = data.abilities ? Object.keys(data.abilities) : [];
    const availableAbilities = Object.entries(ABILITIES_LIBRARY)
        .filter(([key]) => !currentAbilities.includes(key))
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    
    const abilityOptions = availableAbilities.map(([key, ability]) => 
        `<option value="${key}">${ability.name}</option>`
    ).join('');

    return `
        <h3 class="font-semibold text-lg mb-2 text-white">${isEditing ? `Editing ${name}` : `Add Combatant to Team ${team}`}</h3>
        <input type="hidden" id="id-${prefix}" value="${data.id || ''}">
        
        <div class="flex border-b border-gray-700 mb-4">
            <button class="tab active" data-action="switch-tab" data-team="${prefix}" data-tab="stats">Core Stats</button>
            <button class="tab" data-action="switch-tab" data-team="${prefix}" data-tab="actions">Attacks & Spells</button>
            <button class="tab" data-action="switch-tab" data-team="${prefix}" data-tab="abilities">Abilities</button>
        </div>

        <div id="tab-${prefix}-stats" class="tab-content active space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <input type="text" id="name-${prefix}" placeholder="Name" class="form-input col-span-2 sm:col-span-1" value="${name}">
                <div class="flex items-center">
                    <input type="text" id="type-${prefix}" placeholder="Type (e.g. fiend)" class="form-input w-full" value="${type}">
                    ${_getTooltipHTML('Creature type, e.g., "fiend" or "undead". This can interact with certain abilities like Divine Smite.')}
                </div>
                <input type="number" id="hp-${prefix}" placeholder="HP" class="form-input" value="${hp}">
                <input type="number" id="ac-${prefix}" placeholder="AC" class="form-input" value="${ac}">
                <select id="size-${prefix}" class="form-select">${sizeOrder.map(s => `<option value="${s}" ${s === size ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select>
                <div class="flex items-center">
                    <select id="role-${prefix}" class="form-select w-full">
                        <option value="frontline" ${role === 'frontline' ? 'selected' : ''}>Frontline</option>
                        <option value="backline" ${role === 'backline' ? 'selected' : ''}>Backline</option>
                    </select>
                    ${_getTooltipHTML('Determines targeting priority. Melee attackers must target available "Frontline" combatants before "Backline" ones.')}
                </div>
                <input type="number" id="init_mod-${prefix}" placeholder="Init Mod" class="form-input" value="${init_mod}">
                <input type="number" id="count-${prefix}" placeholder="Count" value="1" class="form-input" ${isEditing ? 'disabled' : ''}>
            </div>
            <h4 class="font-semibold pt-2 border-t border-gray-600">Saving Throws</h4>
            <div class="grid grid-cols-3 gap-4">
                ${Object.keys(saves).map(s => `<input type="number" id="save-${s}-${prefix}" placeholder="${s.toUpperCase()}" class="form-input" value="${saves[s]}">`).join('')}
            </div>
             <h4 class="font-semibold pt-2 border-t border-gray-600">Spell Slots</h4>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-4">
                ${Object.keys(spell_slots).map(s => `<input type="number" id="slot-${s}-${prefix}" placeholder="Lvl ${s}" class="form-input" value="${spell_slots[s]}">`).join('')}
            </div>
        </div>

        <div id="tab-${prefix}-actions" class="tab-content">
            <div id="action-list-container" class="space-y-2 max-h-64 overflow-y-auto p-1">
                ${renderActionListHTML(data.attacks || [])}
            </div>
            <div class="mt-4">
                <button data-action="open-action-editor" class="btn btn-secondary w-full">Add New Action</button>
            </div>
        </div>

        <div id="tab-${prefix}-abilities" class="tab-content">
            <div class="flex gap-2 items-center">
                <select id="ability-select" class="form-select flex-grow">
                    <option value="">-- Select an Ability --</option>
                    ${abilityOptions}
                </select>
                <button data-action="configure-selected-ability" class="btn btn-secondary">Add</button>
            </div>
            <div id="ability-description-container" class="ability-description mt-3 p-2 bg-gray-900 rounded-md">
                <!-- Description will be injected here -->
            </div>
            <div id="ability-list-container" class="mt-4 space-y-2 max-h-64 overflow-y-auto p-1">
                ${renderAbilityListHTML(data.abilities || {})}
            </div>
        </div>

        <div class="flex gap-4 mt-4">
            <button data-action="commit" class="btn ${team === 'A' ? 'btn-primary' : 'btn-danger'} flex-grow">${isEditing ? 'Update Combatant' : 'Add to Team'}</button>
            <button data-action="cancel-edit" class="btn btn-secondary">Cancel</button>
        </div>
    `;
}

function renderActionListHTML(actions) {
    if (!actions || actions.length === 0) {
        return '<p class="text-gray-400 text-center py-4">No actions defined.</p>';
    }
    return actions.map((action, index) => {
        const summary = action.damage ? `${action.damage}` : (action.heal ? `${action.heal} heal` : (action.effect ? `Effect: ${action.effect.name}`: 'Utility'));
        return `
            <div class="bg-gray-800 p-2 rounded-md flex justify-between items-center">
                <div>
                    <p class="font-semibold text-white">${action.name || 'Unnamed Action'}</p>
                    <p class="text-xs text-gray-400">${summary}</p>
                </div>
                <div class="flex gap-2"><button data-action="edit-action" data-index="${index}" class="btn btn-secondary p-1 text-xs">Edit</button><button data-action="remove-action" data-index="${index}" class="btn btn-danger p-1 text-xs">Remove</button></div>
            </div>
        `;
    }).join('');
}

function renderAbilityListHTML(abilities) {
    if (!abilities || Object.keys(abilities).length === 0) {
        return '<p class="text-gray-400 text-center py-4">No abilities defined.</p>';
    }
    return Object.entries(abilities).map(([key, value]) => {
        const abilityInfo = ABILITIES_LIBRARY[key];
        if (!abilityInfo) return ''; // Skip unknown abilities

        let valueDisplay = '';
        if (value === true) {
            valueDisplay = 'Enabled';
        } else if (typeof value === 'string' || typeof value === 'number') {
            valueDisplay = `Value: <span class="font-mono text-yellow-300">${value}</span>`;
        }

        return `
            <div class="bg-gray-800 p-2 rounded-md flex justify-between items-center">
                <div><p class="font-semibold text-white">${abilityInfo.name}</p><p class="text-xs text-gray-400">${valueDisplay}</p></div>
                <div class="flex gap-2"><button data-action="remove-ability" data-key="${key}" class="btn btn-danger p-1 text-xs">Remove</button></div>
            </div>`;
    }).join('');
}

function switchTab(prefix, tabName) {
    document.querySelectorAll(`#editor-modal-content .tab`).forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`#editor-modal-content .tab-content`).forEach(c => c.classList.remove('active'));
    document.querySelector(`#editor-modal-content button[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${prefix}-${tabName}`).classList.add('active');
}

function openEditorModal(team, id = null) {
    if (id) {
        appState.openEditorForUpdate(team, id);
    } else {
        appState.openEditorForAdd(team);
    }
    document.getElementById('editor-modal-content').innerHTML = getEditorHTML();
    document.getElementById('editor-modal-overlay').classList.remove('hidden');
    document.getElementById('editor-modal').classList.remove('hidden');
    // Add listener for the new abilities dropdown
    document.getElementById('ability-select').addEventListener('change', updateAbilityDescription);
    updateAbilityDescription(); // Set initial state for the description
}

function closeEditorModal() {
    closeActionEditorModal(); // Ensure sub-modal is closed before closing the main one
    appState.clearEditorState();
    document.getElementById('editor-modal-overlay').classList.add('hidden');
    document.getElementById('editor-modal').classList.add('hidden');
    document.getElementById('editor-modal-content').innerHTML = ''; // Clear content for next use
}

function openActionEditorModal(index = null) {
    let formHTML;
    if (index !== null) {
        // Editing an existing action - determine which form to show
        appState.openActionEditorForUpdate(index);
        const { action, isNew } = appState.getActionEditorState();

        if (action.toHit) {
            formHTML = getAttackActionFormHTML(action, isNew);
        } else if (action.save) {
            formHTML = getSaveActionFormHTML(action, isNew);
        } else if (action.heal) {
            formHTML = getHealActionFormHTML(action, isNew);
        } else { // Default to the effect form if no other primary type is identified
            formHTML = getEffectActionFormHTML(action, isNew);
        }
    } else {
        // Creating a new action - show the wizard selection screen.
        appState.openActionEditorForNew();
        formHTML = getActionWizardSelectionHTML();
    }

    document.getElementById('action-editor-modal-content').innerHTML = formHTML;
    document.getElementById('action-editor-modal-overlay').classList.remove('hidden');
    document.getElementById('action-editor-modal').classList.remove('hidden');
}

function getActionWizardSelectionHTML() {
    return `
        <h3 class="font-semibold text-lg mb-4 text-white">New Action: What kind of action is it?</h3>
        <p class="text-sm text-gray-400 mb-6">Choose the primary purpose of this action. This will determine which options are available.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button class="wizard-choice-card" data-action="select-action-type" data-type="attack"><h4 class="font-semibold text-white">Make an Attack Roll</h4><p class="text-xs text-gray-400">Actions that use a 'To Hit' roll against a target's AC. (e.g., Sword, Fire Bolt)</p></button>
            <button class="wizard-choice-card" data-action="select-action-type" data-type="save"><h4 class="font-semibold text-white">Force a Saving Throw</h4><p class="text-xs text-gray-400">Actions that force a target to make a saving throw against your DC. (e.g., Fireball, Poison Spray)</p></button>
            <button class="wizard-choice-card" data-action="select-action-type" data-type="heal"><h4 class="font-semibold text-white">Provide Healing</h4><p class="text-xs text-gray-400">Actions that restore hit points to a target. (e.g., Cure Wounds, Healing Word)</p></button>
            <button class="wizard-choice-card" data-action="select-action-type" data-type="effect"><h4 class="font-semibold text-white">Apply an Effect</h4><p class="text-xs text-gray-400">Actions that apply a condition or other effect without direct damage or healing. (e.g., Bless, Bane)</p></button>
        </div>
        <div class="flex justify-end mt-6"><button data-action="cancel-action-edit" class="btn btn-secondary">Cancel</button></div>
    `;
}

function _getSharedActionFormAccordionsHTML(action) {
    const actionTypes = ['action', 'bonus_action', 'reaction'];
    const usePeriods = ['combat', 'round', 'turn'];
    const targetingTypes = ['any', 'self', 'other'];

    return `
        <h4 class="action-form-section-header">General Properties</h4>
        <!-- Core Details -->
        <div class="accordion-item active">
            <button type="button" class="accordion-header" data-action="toggle-accordion">Core Details</button>
            <div class="accordion-content">
                <div class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" id="action-editor-name" placeholder="Action Name" class="form-input" value="${action.name || ''}">
                    <select id="action-editor-action" class="form-select">
                        ${actionTypes.map(t => `<option value="${t}" ${action.action === t ? 'selected' : ''}>${t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        <!-- Usage Limit Properties -->
        <div class="accordion-item">
            <button type="button" class="accordion-header" data-action="toggle-accordion">
                <span class="flex items-center">
                    Usage Limits
                    ${_getTooltipHTML('Limit how many times this action can be used per combat, round, or turn.')}
                </span>
            </button>
            <div class="accordion-content">
                <div class="p-3 grid grid-cols-2 gap-4">
                    <input type="number" id="action-editor-uses-max" placeholder="Max Uses" class="form-input" value="${action.uses?.max || ''}">
                    <select id="action-editor-uses-per" class="form-select">
                        <option value="">Use Period</option>
                        ${usePeriods.map(p => `<option value="${p}" ${action.uses?.per === p ? 'selected' : ''}>Per ${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        <!-- General Spell/Effect Properties -->
        <div class="accordion-item">
            <button type="button" class="accordion-header" data-action="toggle-accordion">General</button>
            <div class="accordion-content">
                <div class="p-3">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input type="number" id="action-editor-spellLevel" placeholder="Spell Level (0-9)" class="form-input" value="${action.spellLevel || ''}">
                        <input type="number" id="action-editor-targets" placeholder="# of Targets" class="form-input" value="${action.targets || ''}">
                        <div class="flex items-center">
                            <select id="action-editor-targeting" class="form-select w-full">
                                ${targetingTypes.map(t => `<option value="${t}" ${action.targeting === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                            </select>
                            ${_getTooltipHTML('Determines who can be targeted. "Self" only targets the caster. "Other" targets allies but not self. "Any" can target anyone.')}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mt-4">
                        <input type="checkbox" id="action-editor-isMagical" class="form-checkbox" ${action.isMagical ? 'checked' : ''}>
                        <label for="action-editor-isMagical">Is this a magical effect?</label>
                        ${_getTooltipHTML('Check this if the action is a spell or creates a magical effect. This is important for abilities like Magic Resistance or Gnome Cunning.')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAttackActionFormHTML(action, isNew) {
    return `
        <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Attack Action' : `Editing: ${action.name}`}</h3>
        <div class="space-y-2">
            ${_getSharedActionFormAccordionsHTML(action)}
            <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
            <!-- Attack Properties -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">Attack</button>
                <div class="accordion-content">
                    <div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input type="number" id="action-editor-toHit" placeholder="To Hit Bonus" class="form-input" value="${action.toHit || ''}">
                        <input type="text" id="action-editor-damage" placeholder="Damage (e.g. 2d6+3)" class="form-input col-span-2" value="${action.damage || ''}">
                        <input type="text" id="action-editor-type" placeholder="Damage Type" class="form-input" value="${action.type || ''}">
                        <div class="flex items-center gap-2"><input type="checkbox" id="action-editor-ranged" class="form-checkbox" ${action.ranged ? 'checked' : ''}><label for="action-editor-ranged">Ranged</label></div>
                        <div class="flex items-center gap-2"><input type="checkbox" id="action-editor-heavy" class="form-checkbox" ${action.heavy ? 'checked' : ''}><label for="action-editor-heavy">Heavy</label></div>
                    </div>
                </div>
            </div>
            <!-- Effect Properties (Optional) -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">
                    <span class="flex items-center">
                        Effect on Hit
                        ${_getTooltipHTML('Optionally apply a status effect if the attack hits. The effect name must match a defined condition in the simulation logic (e.g., "poisoned").')}
                    </span>
                </button>
                <div class="accordion-content">
                    <div class="p-3 grid grid-cols-2 gap-4">
                        <input type="text" id="action-editor-effect-name" placeholder="Effect Name (e.g. poisoned)" class="form-input" value="${action.effect?.name || ''}">
                        <input type="number" id="action-editor-effect-duration" placeholder="Duration (rounds)" class="form-input" value="${action.effect?.duration || ''}">
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-4 mt-6">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="cancel-action-edit" class="btn btn-secondary">Cancel</button>
        </div>
    `;
}

function getSaveActionFormHTML(action, isNew) {
    const saveTypes = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    return `
        <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Saving Throw Action' : `Editing: ${action.name}`}</h3>
        <div class="space-y-2">
            ${_getSharedActionFormAccordionsHTML(action)}
            <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
            <!-- Save-based Effect Properties -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">Saving Throw</button>
                <div class="accordion-content">
                    <div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input type="number" id="action-editor-save-dc" placeholder="Save DC" class="form-input" value="${action.save?.dc || ''}">
                        <select id="action-editor-save-type" class="form-select">
                            <option value="">Save Type</option>
                            ${saveTypes.map(t => `<option value="${t}" ${action.save?.type === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                        </select>
                        <div class="flex items-center gap-2 col-span-2 sm:col-span-1">
                            <input type="checkbox" id="action-editor-half" class="form-checkbox" ${action.half ? 'checked' : ''}>
                            <div class="flex items-center">
                                <label for="action-editor-half">Half damage on save</label>
                                ${_getTooltipHTML('If checked, a successful save results in the target taking half of the rolled damage.')}
                            </div>
                        </div>
                        <input type="text" id="action-editor-damage" placeholder="Damage (e.g. 8d6)" class="form-input col-span-2" value="${action.damage || ''}">
                        <input type="text" id="action-editor-type" placeholder="Damage Type" class="form-input" value="${action.type || ''}">
                    </div>
                </div>
            </div>
            <!-- Effect Properties (Optional) -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">
                    <span class="flex items-center">
                        Effect on Fail
                        ${_getTooltipHTML('Optionally apply a status effect to the target if they fail their saving throw.')}
                    </span>
                </button>
                <div class="accordion-content">
                    <div class="p-3 grid grid-cols-2 gap-4">
                        <input type="text" id="action-editor-effect-name" placeholder="Effect Name (e.g. poisoned)" class="form-input" value="${action.effect?.name || ''}">
                        <input type="number" id="action-editor-effect-duration" placeholder="Duration (rounds)" class="form-input" value="${action.effect?.duration || ''}">
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-4 mt-6">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="cancel-action-edit" class="btn btn-secondary">Cancel</button>
        </div>
    `;
}

function getHealActionFormHTML(action, isNew) {
    return `
        <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Healing Action' : `Editing: ${action.name}`}</h3>
        <div class="space-y-2">
            ${_getSharedActionFormAccordionsHTML(action)}
            <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
            <!-- Healing Properties -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">Healing</button>
                <div class="accordion-content">
                    <div class="p-3">
                        <input type="text" id="action-editor-heal" placeholder="Heal Amount (e.g. 1d8+5)" class="form-input" value="${action.heal || ''}">
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-4 mt-6">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="cancel-action-edit" class="btn btn-secondary">Cancel</button>
        </div>
    `;
}

function getEffectActionFormHTML(action, isNew) {
    return `
        <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Effect Action' : `Editing: ${action.name}`}</h3>
        <div class="space-y-2">
            ${_getSharedActionFormAccordionsHTML(action)}
            <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
            <!-- Effect Properties -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">Effect</button>
                <div class="accordion-content">
                    <div class="p-3 grid grid-cols-2 gap-4">
                        <input type="text" id="action-editor-effect-name" placeholder="Effect Name (e.g. blessed)" class="form-input" value="${action.effect?.name || ''}">
                        <input type="number" id="action-editor-effect-duration" placeholder="Duration (rounds)" class="form-input" value="${action.effect?.duration || ''}">
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-4 mt-6">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="cancel-action-edit" class="btn btn-secondary">Cancel</button>
        </div>
    `;
}

function closeActionEditorModal() {
    appState.clearActionEditorState();
    document.getElementById('action-editor-modal-overlay').classList.add('hidden');
    document.getElementById('action-editor-modal').classList.add('hidden');
    document.getElementById('action-editor-modal-content').innerHTML = '';
}

function renderAbilityConfigScreen(abilityKey) {
    const ability = ABILITIES_LIBRARY[abilityKey];
    if (!ability) {
        console.error(`Ability with key ${abilityKey} not found in library.`);
        closeAbilityEditorModal();
        return;
    }

    let inputHTML = '';
    const inputId = 'ability-config-value';

    switch (ability.valueType) {
        case 'number':
            inputHTML = `<label for="${inputId}" class="block font-semibold mb-1">${ability.name} Value</label>
                         <input type="number" id="${inputId}" placeholder="${ability.placeholder || ''}" class="form-input w-full">`;
            break;
        case 'dice':
        case 'string':
            inputHTML = `<label for="${inputId}" class="block font-semibold mb-1">${ability.name} Value</label>
                         <input type="text" id="${inputId}" placeholder="${ability.placeholder || ''}" class="form-input w-full">`;
            break;
        case 'boolean':
            // No input needed, the presence of the ability is enough.
            inputHTML = `<p class="text-gray-400 italic">This ability doesn't require a specific value.</p>`;
            break;
    }

    const modalHTML = `
        <h3 class="font-semibold text-lg mb-2 text-white">Configure: ${ability.name}</h3>
        <p class="text-sm text-gray-400 mb-4">${ability.description}</p>
        
        <div class="mb-4">
            ${inputHTML}
        </div>

        <div class="flex justify-end gap-4 mt-6">
            <button data-action="commit-ability" data-key="${abilityKey}" class="btn btn-primary">Save Ability</button>
            <button data-action="cancel-ability-config" class="btn btn-secondary">Back to List</button>
        </div>
    `;
    document.getElementById('ability-editor-modal-content').innerHTML = modalHTML;
}

function closeAbilityEditorModal() {
    document.getElementById('ability-editor-modal-overlay').classList.add('hidden');
    document.getElementById('ability-editor-modal').classList.add('hidden');
    document.getElementById('ability-editor-modal-content').innerHTML = '';
}

function updateAbilityDescription() {
    const select = document.getElementById('ability-select');
    const container = document.getElementById('ability-description-container');
    if (!select || !container) return;

    const selectedKey = select.value;

    if (!selectedKey) {
        container.innerHTML = '<p class="text-gray-500">Select an ability to see its description.</p>';
        return;
    }

    const ability = ABILITIES_LIBRARY[selectedKey];
    if (ability) {
        container.innerHTML = ability.description;
    } else {
        container.innerHTML = '';
    }
}

function _syncEditorFormState() {
    const { combatant: stateCombatant } = appState.getEditorState();
    // Read the current values from the form and merge them into the editor's state
    // to prevent data loss when re-rendering the modal.
    const currentFormState = readCombatantFromForm('modal', stateCombatant?.id);
    appState.getEditorState().combatant = currentFormState;
}

function configureSelectedAbility() {
    const select = document.getElementById('ability-select');
    const abilityKey = select.value;
    if (abilityKey) {
        renderAbilityConfigScreen(abilityKey);
        document.getElementById('ability-editor-modal-overlay').classList.remove('hidden');
        document.getElementById('ability-editor-modal').classList.remove('hidden');
    }
}

function commitAbility(key) {
    _syncEditorFormState();

    const { combatant } = appState.getEditorState();
    const ability = ABILITIES_LIBRARY[key];
    if (!combatant || !ability) {
        console.error("Error committing ability.");
        closeAbilityEditorModal();
        return;
    }

    let value = true;
    if (ability.valueType !== 'boolean') {
        const input = document.getElementById('ability-config-value');
        value = ability.valueType === 'number' ? parseInt(input.value, 10) : input.value;
        if (ability.valueType === 'number' && isNaN(value)) {
            alert(`Please enter a valid number for ${ability.name}.`);
            return;
        }
        if (!value && value !== 0) {
            alert(`Please enter a value for ${ability.name}.`);
            return;
        }
    }

    combatant.abilities[key] = value;
    document.getElementById('editor-modal-content').innerHTML = getEditorHTML();
    switchTab('modal', 'abilities');
    closeAbilityEditorModal();
}

function removeAbilityFromEditor(key) {
    _syncEditorFormState();

    const { combatant } = appState.getEditorState();
    if (combatant && combatant.abilities && combatant.abilities.hasOwnProperty(key)) {
        delete combatant.abilities[key];
        document.getElementById('editor-modal-content').innerHTML = getEditorHTML();
        switchTab('modal', 'abilities');
    }
}

function commitAction() {
    const newAction = readActionFromForm();
    const { combatant } = appState.getEditorState();
    const { index, isNew } = appState.getActionEditorState();

    if (!combatant) {
        console.error("Cannot commit action: No combatant is being edited.");
        closeActionEditorModal();
        return;
    }
    
    if (!combatant.attacks) {
        combatant.attacks = [];
    }

    if (isNew) {
        combatant.attacks.push(newAction);
    } else {
        combatant.attacks[index] = newAction;
    }

    document.getElementById('action-list-container').innerHTML = renderActionListHTML(combatant.attacks);
    closeActionEditorModal();
}

function removeActionFromEditor(index) {
    if (!confirm("Are you sure you want to remove this action?")) {
        return;
    }

    const { combatant } = appState.getEditorState();
    if (!combatant || !combatant.attacks) {
        console.error("Cannot remove action: No combatant or attacks array found in editor state.");
        return;
    }

    const actionIndex = parseInt(index, 10);
    if (isNaN(actionIndex) || actionIndex < 0 || actionIndex >= combatant.attacks.length) {
        console.error(`Invalid index for action removal: ${index}`);
        return;
    }

    combatant.attacks.splice(actionIndex, 1);

    // Re-render the list to show the change
    document.getElementById('action-list-container').innerHTML = renderActionListHTML(combatant.attacks);
}

function handleCommit() {
    const { combatant, team, isEditing } = appState.getEditorState();

    if (isEditing) {
        const updatedCombatant = readCombatantFromForm('modal', combatant.id);
        updatedCombatant.team = team;
        appState.updateCombatant(team, updatedCombatant);
    } else {
        const count = parseInt(document.getElementById(`count-modal`).value) || 1;
        for (let i = 0; i < count; i++) {
            const newCombatant = readCombatantFromForm('modal');
            if (count > 1) newCombatant.name += ` ${i + 1}`;
            newCombatant.team = team;
            appState.addCombatant(team, newCombatant);
        }
    }
    renderTeams();
    closeEditorModal();
}

function saveTeam(team) {
    const { teamA, teamB } = appState.getTeams();
    const teamToSave = team === 'A' ? teamA : teamB;

    if (teamToSave.length === 0) {
        alert(`Team ${team} is empty. Nothing to save.`);
        return;
    }

    // Use null, 2 for pretty-printing the JSON to make it human-readable.
    const dataStr = JSON.stringify(teamToSave, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd_team_${team.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadTeam(team) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            const combatants = JSON.parse(event.target.result);
            appState.setTeam(team, combatants);
            renderTeams();
        };
        reader.readAsText(file);
    };

    input.click();
}

function editCombatant(team, id) {
    openEditorModal(team, id);
}

function cancelEdit() {
    closeEditorModal();
}

function copyCombatant(team, id) {
    appState.copyCombatant(team, id);
    renderTeams();
}

function moveCombatant(team, id, direction) {
    appState.moveCombatant(team, id, direction);
    renderTeams();
}

function removeCombatant(team, id) {
    appState.removeCombatant(team, id);
    renderTeams();
}

function renderTeams() {
    const { teamA, teamB } = appState.getTeams();
    document.getElementById('team-a-list').innerHTML = teamA.map(c => renderCombatantCard(c, 'A')).join('');
    document.getElementById('team-b-list').innerHTML = teamB.map(c => renderCombatantCard(c, 'B')).join('');
}

function renderCombatantCard(c, team) {
    const roleDisplay = (c.role || 'frontline').charAt(0).toUpperCase() + (c.role || 'frontline').slice(1);
    const abilityNames = c.abilities && Object.keys(c.abilities).length > 0 
        ? Object.keys(c.abilities).map(key => ABILITIES_LIBRARY[key]?.name || key).join(', ') 
        : 'None';
    return `
        <div class="bg-gray-700 p-3 rounded-md flex justify-between items-center">
            <div>
                <p class="font-bold text-white">${c.name} <span class="text-xs text-gray-400">(${roleDisplay}, ${c.size})</span></p>
                <p class="text-sm text-gray-300">HP: ${c.hp}, AC: ${c.ac}, Init: ${c.initiative_mod >= 0 ? '+' : ''}${c.initiative_mod}, Threat: ${c.threat || 1}${_getTooltipHTML("An estimate of the combatant's average damage per round. Used by the AI for target selection.")}</p>
                <p class="text-xs text-gray-400">Abilities: ${abilityNames}</p>
            </div>
            <div class="flex gap-1">
                <button data-action="move-combatant" data-team="${team}" data-id="${c.id}" data-direction="-1" class="btn btn-secondary p-1 text-xs">▲</button>
                <button data-action="move-combatant" data-team="${team}" data-id="${c.id}" data-direction="1" class="btn btn-secondary p-1 text-xs">▼</button>
                <button data-action="edit-combatant" data-team="${team}" data-id="${c.id}" class="btn btn-secondary p-1 text-xs">Edit</button>
                <button data-action="copy-combatant" data-team="${team}" data-id="${c.id}" class="btn btn-secondary p-1 text-xs">Copy</button>
                <button data-action="remove-combatant" data-team="${team}" data-id="${c.id}" class="btn btn-danger p-1 text-xs">&times;</button>
            </div>
        </div>`;
}