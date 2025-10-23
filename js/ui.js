// js/ui.js
// This file contains the UI rendering functions for the application.
const CREATURE_TYPES = [
    'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 
    'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'
];

let tooltipCounter = 0;

function renderTeams() {
  const { teamA, teamB } = appState.getTeams();
  document.getElementById('team-a-list').innerHTML = teamA.map(c => renderCombatantCard(c, 'A')).join('');
  document.getElementById('team-b-list').innerHTML = teamB.map(c => renderCombatantCard(c, 'B')).join('');
}

function _getTooltipHTML(text) {
    const tooltipId = `tooltip-${tooltipCounter++}`;
    return `
        <span class="tooltip-container">
            <span class="tooltip-icon" data-action="toggle-tooltip" data-tooltip-id="${tooltipId}">?</span>
            <span id="${tooltipId}" class="tooltip-box">${text}</span>
        </span>
    `;
}

function renderCombatantCard(c, team) {
    const roleDisplay = (c.role || 'frontline').charAt(0).toUpperCase() + (c.role || 'frontline').slice(1);
    const abilityNames = c.abilities && Object.keys(c.abilities).length > 0 
        ? Object.keys(c.abilities).map(key => ABILITIES_LIBRARY[key]?.name || key).join(', ') 
        : 'None';
    const typeDisplay = c.type ? `<p class="italic text-gray-300">${c.type.charAt(0).toUpperCase() + c.type.slice(1)}</p>` : '';
    return `
        <div class="bg-gray-700 p-3 rounded-md flex justify-between items-center">
            <div>
                <p class="font-bold text-white">${c.name} <span class="text-xs text-gray-400">(${roleDisplay}, ${c.size || 'medium'})</span></p>
                ${typeDisplay}
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

function openEditorDrawer(team, id = null) {
    if (id) {
        appState.openEditorForUpdate(team, id);
    } else {
        appState.openEditorForAdd(team);
    }

    const drawerContent = document.getElementById('editor-drawer-content');
    const drawer = document.getElementById('editor-drawer');
    const overlay = document.getElementById('editor-drawer-overlay');

    drawerContent.innerHTML = getEditorDrawerHTML(); // This function renders the content
    overlay.classList.remove('hidden');
    drawer.classList.add('active');
    _initializeAbilitySelect();
    updateAbilityDescription();
}

function closeEditorDrawer() {
    const drawerContent = document.getElementById('editor-drawer-content');
    const drawer = document.getElementById('editor-drawer');
    const overlay = document.getElementById('editor-drawer-overlay');

    drawer.classList.remove('active');
    overlay.classList.add('hidden');
    drawerContent.innerHTML = '';
    appState.clearEditorState();
}

function getEditorDrawerHTML(options = {}) {
    const { combatant, team, isEditing } = appState.getEditorState();
    const data = combatant || {};
    const prefix = 'editor';

    const name = data.name || '';
    const hp = data.hp || '';
    const ac = data.ac || '';
    const size = data.size || 'medium';
    const role = data.role || 'frontline';
    const type = data.type || '';
    const init_mod = data.initiative_mod || 0;
    const saves = data.saves || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const spell_slots = data.spell_slots || { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };

    const activeAccordionId = options.activeAccordionId || 'general';

    const currentAbilities = data.abilities ? Object.keys(data.abilities) : [];
    const availableAbilities = Object.entries(ABILITIES_LIBRARY)
        .filter(([key, value]) => !currentAbilities.includes(key) && value.category !== 'internal')
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    
    const typeOptions = CREATURE_TYPES.map(t => {
        const lowerT = t.toLowerCase();
        return `<option value="${lowerT}" ${lowerT === type ? 'selected' : ''}>${t}</option>`;
    }).join('');
    
    const abilityOptions = availableAbilities.map(([key, ability]) => 
        `<option value="${key}">${ability.name}</option>`
    ).join('');

    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-2 text-white">${isEditing ? `Editing ${name}` : `Add Combatant to Team ${team}`}</h3>
            <input type="hidden" id="id-${prefix}" value="${data.id || ''}">
        </div>

        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <div class="space-y-2">
                <div class="accordion-item ${activeAccordionId === 'general' ? 'active' : ''}">
                    <button type="button" class="accordion-header" data-action="toggle-accordion" data-accordion-id="general">General</button>
                    <div class="accordion-content">
                        <div class="p-3">
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <input type="text" id="${prefix}-name" placeholder="Name" class="form-input col-span-2 sm:col-span-1" value="${name}">
                                <div class="flex items-center">
                                    <select id="${prefix}-type" class="form-select w-full">
                                        <option value="">-- Select Type --</option>
                                        ${typeOptions}
                                    </select>
                                    ${_getTooltipHTML('Creature type, e.g., "Fiend" or "Undead". This can interact with certain abilities like Divine Smite.')}
                                </div>
                                <input type="number" id="${prefix}-hp" placeholder="HP" class="form-input" value="${hp}">
                                <input type="number" id="${prefix}-ac" placeholder="AC" class="form-input" value="${ac}">
                                <select id="${prefix}-size" class="form-select">${sizeOrder.map(s => `<option value="${s}" ${s === size ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select>
                                <div class="flex items-center">
                                    <select id="${prefix}-role" class="form-select w-full">
                                        <option value="frontline" ${role === 'frontline' ? 'selected' : ''}>Frontline</option>
                                        <option value="backline" ${role === 'backline' ? 'selected' : ''}>Backline</option>
                                    </select>
                                    ${_getTooltipHTML('Determines targeting priority. Melee attackers must target available "Frontline" combatants before "Backline" ones.')}
                                </div>
                                <input type="number" id="${prefix}-init_mod" placeholder="Init Mod" class="form-input" value="${init_mod}">
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" id="${prefix}-wears-metal-armor" class="form-checkbox" ${data.armor?.material === 'metal' ? 'checked' : ''}>
                                    <label for="${prefix}-wears-metal-armor">Wears Metal Armor</label>
                                </div>
                                <input type="number" id="${prefix}-count" placeholder="Count" value="1" class="form-input" ${isEditing ? 'disabled' : ''}>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="accordion-item ${activeAccordionId === 'saving-throws' ? 'active' : ''}">
                    <button type="button" class="accordion-header" data-action="toggle-accordion" data-accordion-id="saving-throws">Saving Throws</button>
                    <div class="accordion-content"><div class="p-3"><div class="grid grid-cols-3 gap-4">${Object.keys(saves).map(s => `<input type="number" id="${prefix}-save-${s}" placeholder="${s.toUpperCase()}" class="form-input" value="${saves[s]}">`).join('')}</div></div></div>
                </div>
                <div class="accordion-item ${activeAccordionId === 'spell-slots' ? 'active' : ''}">
                    <button type="button" class="accordion-header" data-action="toggle-accordion" data-accordion-id="spell-slots">Spell Slots</button>
                    <div class="accordion-content"><div class="p-3"><div class="grid grid-cols-3 sm:grid-cols-5 gap-4">${Object.keys(spell_slots).map(s => `<input type="number" id="${prefix}-slot-${s}" placeholder="Lvl ${s}" class="form-input" value="${spell_slots[s]}">`).join('')}</div></div></div>
                </div>
            </div>

            <div class="accordion-item mt-2 ${activeAccordionId === 'abilities' ? 'active' : ''}">
                <button type="button" class="accordion-header" data-action="toggle-accordion" data-accordion-id="abilities">Abilities</button>
                <div class="accordion-content">
                    <div class="p-3">
                        <div id="ability-select-wrapper">
                            <select id="ability-select" class="form-select flex-grow">
                                <option value="">-- Select an Ability --</option>
                                ${abilityOptions}
                            </select>
                        </div>
                        <div class="flex gap-2 items-center mt-2"><button data-action="configure-selected-ability" class="btn btn-secondary flex-grow">Add</button></div>
                        <div id="ability-description-container" class="ability-description mt-3 p-2 bg-gray-900 rounded-md"></div>
                        <div id="ability-list-container" class="mt-4 space-y-2 max-h-64 overflow-y-auto p-1">${renderAbilityListHTML(data.abilities || {})}</div>
                    </div>
                </div>
            </div>

            <div class="accordion-item mt-2 ${activeAccordionId === 'actions' ? 'active' : ''}">
                <button type="button" class="accordion-header" data-action="toggle-accordion" data-accordion-id="actions">Actions</button>
                <div class="accordion-content">
                    <div class="p-3">
                        <div id="action-list-container" class="space-y-2 max-h-64 overflow-y-auto p-1">
                            ${renderActionListHTML(data.attacks || [])}
                        </div>
                        <div class="mt-4">
                            <button data-action="open-action-editor" class="btn btn-secondary w-full">Add New Action</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-4 mt-6 flex-shrink-0">
            <button data-action="commit" class="btn ${team === 'A' ? 'btn-primary' : 'btn-danger'} flex-grow">${isEditing ? 'Update Combatant' : 'Add to Team'}</button>
            <button data-action="cancel-edit" class="btn btn-secondary">Cancel</button>
        </div>
    `;
}

function handleCommit() {
    const { combatant, team, isEditing } = appState.getEditorState();

    if (isEditing) {
        const updatedCombatant = readCombatantFromForm(combatant.id);
        updatedCombatant.team = team;
        appState.updateCombatant(team, updatedCombatant);
    } else {
        const count = parseInt(document.getElementById(`editor-count`).value) || 1;
        const baseCombatant = readCombatantFromForm();
        for (let i = 0; i < count; i++) {
            const newCombatant = deepCopy(baseCombatant);
            newCombatant.id = `c${Date.now()}${Math.random()}`;
            if (count > 1) {
                newCombatant.name = `${baseCombatant.name} ${i + 1}`;
            }
            newCombatant.team = team;
            appState.addCombatant(team, newCombatant);
        }
    }
    renderTeams();
    closeEditorDrawer();
}

function _initializeAbilitySelect() {
    const abilitySelect = document.getElementById('ability-select');
    if (abilitySelect && typeof Choices !== 'undefined') {
        const choices = new Choices(abilitySelect, {
            searchEnabled: true,
            itemSelectText: '',
            shouldSort: false,
            searchResultLimit: 100,
            fuseOptions: {
                keys: ['label'],
                threshold: 0.0,
                ignoreLocation: true,
                shouldSort: false
            }
        });
        abilitySelect.addEventListener('change', () => updateAbilityDescription());
        return choices;
    }
    return null;
}

/**
 * Initializes all elements matching a selector as Choices.js multi-select instances.
 * This provides a consistent look and feel for all multi-selects in the app.
 * @param {string} selector - The CSS selector for the <select> elements to initialize.
 */
function _initializeMultiSelects(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        if (el && typeof Choices !== 'undefined' && !el.classList.contains('choices__input')) {
            new Choices(el, {
                removeItemButton: true,
                placeholder: true,
                placeholderValue: 'Select option(s)...',
                shouldSort: false,
                fuseOptions: { threshold: 0.0 } // Exact match only
            });
        }
    });
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

function _getAbilityValueDisplay(value) {
    if (value === true) {
        return 'Enabled';
    }
    if (typeof value === 'object' && value.pool !== undefined && value.die !== undefined) {
        return `Pool: <span class="font-mono text-yellow-300">${value.pool}</span>, Die: <span class="font-mono text-yellow-300">${value.die}</span>`;
    }
    if (typeof value === 'object' && value.pool !== undefined) {
        return `Pool: <span class="font-mono text-yellow-300">${value.pool}</span>`;
    }
    if (typeof value === 'object' && value.damage) { // charge_config
        const attackPart = value.attackName ? ` (on ${value.attackName})` : '';
        const savePart = (typeof value.dc === 'number' && value.type && value.effect) ? `, Save: DC ${value.dc} ${value.type.toUpperCase()}, Effect: ${value.effect}` : '';
        return `Damage: ${value.damage}${attackPart}${savePart}`;
    }
    if (Array.isArray(value)) {
        return `Value: <span class="font-mono text-yellow-300">${[...value].sort().join(', ')}</span>`;
    }
    return `Value: <span class="font-mono text-yellow-300">${value}</span>`;
}

function renderAbilityListHTML(abilities) {
    if (!abilities || Object.keys(abilities).length === 0) {
        return '<p class="text-gray-400 text-center py-4">No abilities defined.</p>';
    }
    return Object.entries(abilities).map(([key, value]) => {
        const abilityInfo = ABILITIES_LIBRARY[key];
        if (!abilityInfo) return ''; // Skip unknown abilities

        const valueDisplay = _getAbilityValueDisplay(value);

        return `
            <div class="bg-gray-800 p-2 rounded-md flex justify-between items-center">
                <div>
                    <p class="font-semibold text-white">${abilityInfo.name}</p>
                    <p class="text-xs text-gray-400">${valueDisplay}</p>
                </div>
                <div class="flex gap-2"><button data-action="edit-ability" data-key="${key}" class="btn btn-secondary p-1 text-xs">Edit</button><button data-action="remove-ability" data-key="${key}" class="btn btn-danger p-1 text-xs">Remove</button></div>
            </div>`;
    }).join('');
}

function editCombatant(team, id) {
    openEditorDrawer(team, id);
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
    // This function triggers the click on the pre-existing hidden file input.
    // The file handling logic is attached in main.js.
    const input = document.querySelector(`[data-cy="load-team-input-${team}"]`);
    if (input) {
        input.click();
    } else {
        console.error(`File input for team ${team} not found.`);
    }
}

function removeActionFromEditor(index) {
    if (!confirm("Are you sure you want to remove this action?")) {
        return;
    }

    _syncEditorFormState();

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
    renderMainEditorInDrawer({ activeAccordionId: 'actions' });
}

function cancelActionEditor() {
    renderMainEditorInDrawer();
}

function _syncEditorFormState() {
    const { combatant: stateCombatant } = appState.getEditorState();
    // Read the current values from the form and merge them into the editor's state
    // to prevent data loss when re-rendering the modal.
    const currentFormState = readCombatantFromForm(stateCombatant?.id);
    appState.getEditorState().combatant = currentFormState;

    // If the action editor form is present in the DOM, sync its state too.
    // This is crucial for handling re-renders from `change` events within the action form.
    if (document.getElementById('action-editor-form-type')) {
        const { actionEditorState } = appState.getEditorState();
        if (actionEditorState) {
            actionEditorState.action = readActionFromForm();
        }
    }
}

function configureSelectedAbility() {
    _syncEditorFormState();
    const select = document.getElementById('ability-select');
    const abilityKey = select ? select.value : null;
    
    if (abilityKey) {
        const ability = ABILITIES_LIBRARY[abilityKey];
        if (!ability) return;

        if (ability.valueType === 'boolean') {
            commitAbility(abilityKey);
        } else {
            renderAbilityConfigScreen(abilityKey);
        }
    }
}

function _getAbilityMultiSelectHTML(ability, options, selectedValues = []) {
    const optionHTML = options.map(([value, text]) => 
        `<option value="${value}" ${selectedValues.includes(value) ? 'selected' : ''}>${text}</option>`
    ).join('');

    return `
        <label for="ability-config-types" class="block font-semibold mb-1">${ability.name} Types</label>
        <div id="ability-config-wrapper">
            <select id="ability-config-types" class="form-select w-full" multiple>${optionHTML}</select>
        </div>
    `;
}

function renderAbilityConfigScreen(abilityKey) {
    const drawerContent = document.getElementById('editor-drawer-content');
    const ability = ABILITIES_LIBRARY[abilityKey];
    if (!ability) {
        console.error(`Ability with key ${abilityKey} not found in library.`);
        return;
    }

    const { combatant } = appState.getEditorState();
    const existingValue = combatant?.abilities?.[abilityKey];

    let inputHTML = '';
    const inputId = 'ability-config-value';

    switch (ability.valueType) {
        case 'pool': {
            const poolValue = existingValue?.pool ?? '';
            inputHTML = `<label for="ability-config-pool" class="block font-semibold mb-1">${ability.name} Pool Size</label>
                         <input type="number" id="ability-config-pool" placeholder="${ability.placeholder || ''}" class="form-input w-full" value="${poolValue}">`;
            break;
        }
        case 'pool_and_dice': {
            const poolValue = existingValue?.pool ?? '';
            const dieValue = existingValue?.die ?? '';
            inputHTML = `<label for="ability-config-pool" class="block font-semibold mb-1">${ability.name} Pool Size</label>
                         <input type="number" id="ability-config-pool" placeholder="e.g., 5" class="form-input w-full mb-4" value="${poolValue}">
                         <label for="ability-config-die" class="block font-semibold mb-1">Inspiration Die</label>
                         <input type="text" id="ability-config-die" placeholder="${ability.placeholder || 'e.g., 1d6'}" class="form-input w-full" value="${dieValue}">`;
            break;
        }
        case 'charge_config': {
            const val = existingValue || {};
            const attackOptions = (combatant.attacks || [])
                .filter(a => a.toHit)
                .map(a => `<option value="${a.name}" ${val.attackName === a.name ? 'selected' : ''}>${a.name}</option>`)
                .join('');
            const saveTypes = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            const conditionOptions = Object.entries(CONDITIONS_LIBRARY)
                .filter(([, def]) => def.category !== 'internal')
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .map(([key, def]) => `<option value="${key}" ${val.effect === key ? 'selected' : ''}>${def.name}</option>`)
                .join('');
            inputHTML = `
                <label for="ability-config-charge-damage" class="block font-semibold mb-1">Bonus Damage</label>
                <input type="text" id="ability-config-charge-damage" placeholder="e.g., 2d6" class="form-input w-full mb-4" value="${val.damage || ''}">
                <label for="ability-config-charge-dc" class="block font-semibold mb-1">Save DC</label>
                <input type="number" id="ability-config-charge-dc" placeholder="e.g., 14" class="form-input w-full mb-4" value="${val.dc || ''}">
                <label for="ability-config-charge-type" class="block font-semibold mb-1">Save Type</label>
                <select id="ability-config-charge-type" class="form-select w-full mb-4">${saveTypes.map(t => `<option value="${t}" ${val.type === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}</select>
                <label for="ability-config-charge-effect" class="block font-semibold mb-1">Effect on Fail</label>
                <select id="ability-config-charge-effect" class="form-select w-full mb-4">${conditionOptions}</select>
                <label for="ability-config-charge-attack" class="block font-semibold mb-1">Specific Attack</label>
                <select id="ability-config-charge-attack" class="form-select w-full"><option value="" ${!val.attackName ? 'selected' : ''}>Any Melee Attack</option>${attackOptions}</select>
            `;
            break;
        }
        case 'damage_types': {
            const options = DAMAGE_TYPES.map(type => [type, type.charAt(0).toUpperCase() + type.slice(1)]);
            inputHTML = _getAbilityMultiSelectHTML(ability, options, existingValue);
            break;
        }
        case 'condition_names': {
            const options = Object.entries(CONDITIONS_LIBRARY)
                // Only include the core, named conditions that a creature can be immune to.
                .filter(([key]) => CORE_IMMUNITY_CONDITIONS.includes(key))
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .map(([key, def]) => [key, def.name]);
            inputHTML = _getAbilityMultiSelectHTML(ability, options, existingValue);
            break;
        }
        case 'number': // Fall-through
        case 'dice':   // Fall-through
        case 'string': {
            const inputType = ability.valueType === 'number' ? 'number' : 'text';
            const value = existingValue ?? '';
            inputHTML = `<label for="${inputId}" class="block font-semibold mb-1">${ability.name} Value</label><input type="${inputType}" id="${inputId}" placeholder="${ability.placeholder || ''}" class="form-input w-full" value="${value}">`;
            break;
        }
        case 'boolean':
            inputHTML = `<p class="text-gray-400 italic">This ability doesn't require a specific value.</p>`;
            break;
    }

    drawerContent.innerHTML = `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-2 text-white">Configure: ${ability.name}</h3>
            <p class="text-sm text-gray-400 mb-4">${ability.description}</p>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1"><div class="mb-4">${inputHTML}</div></div>
        <div class="flex justify-end gap-4 mt-6 flex-shrink-0">
            <button data-action="commit-ability" data-key="${abilityKey}" class="btn btn-primary">Save Ability</button>
            <button data-action="back-to-main-editor" class="btn btn-secondary">Back</button>
        </div>
    `;

    // Initialize the new multi-select component.
    _initializeMultiSelects('[id="ability-config-wrapper"] select');
}

function commitAbility(key) {
    const { combatant } = appState.getEditorState();
    const ability = ABILITIES_LIBRARY[key];
    if (!combatant || !ability) return;

    let value = true;
    switch (ability.valueType) {
        case 'boolean':
            value = true;
            break;
        case 'pool': {
            const input = document.getElementById('ability-config-pool');
            const poolValue = parseInt(input.value, 10);
            if (isNaN(poolValue) || poolValue < 0) { console.error(`Invalid pool value: ${input.value}`); return; }
            value = { pool: poolValue };
            break;
        }
        case 'pool_and_dice': {
            const poolInput = document.getElementById('ability-config-pool');
            const dieInput = document.getElementById('ability-config-die');
            const poolValue = parseInt(poolInput.value, 10);
            const dieValue = dieInput.value.trim();
            if (isNaN(poolValue) || poolValue < 0) { console.error(`Invalid pool value: ${poolInput.value}`); return; }
            if (!dieValue || !/^\d*d\d+$/.test(dieValue)) { console.error(`Invalid die value: ${dieValue}`); return; }
            value = { pool: poolValue, die: dieValue };
            break;
        }
        case 'charge_config': {
            const damage = document.getElementById('ability-config-charge-damage').value.trim();
            const dc = parseInt(document.getElementById('ability-config-charge-dc').value, 10);
            const type = document.getElementById('ability-config-charge-type').value;
            const effect = document.getElementById('ability-config-charge-effect').value;
            const attackName = document.getElementById('ability-config-charge-attack').value;
            if (calculateAverageDamage(damage) === null) { console.error(`Invalid damage format: ${damage}`); return; }
            if (document.getElementById('ability-config-charge-dc').value.trim() !== '' && (isNaN(dc) || dc < 0)) { console.error(`Invalid DC: ${dc}`); return; }
            value = (dc > 0) ? { damage, dc, type, effect } : { damage };
            if (attackName) value.attackName = attackName;
            break;
        }
        case 'damage_types':
        case 'condition_names': {
            const multiSelect = document.getElementById('ability-config-types');
            if (multiSelect) {
                value = Array.from(multiSelect.selectedOptions).map(opt => opt.value).sort();
            }
            break;
        }
        default: { // Handles 'number', 'dice', 'string'
            const input = document.getElementById('ability-config-value');
            value = ability.valueType === 'number' ? parseInt(input.value, 10) : (input.value || '');
            break;
        }
    }

    combatant.abilities[key] = value;
    renderMainEditorInDrawer({ activeAccordionId: 'abilities' });
}

function removeAbilityFromEditor(key) {
    const { combatant } = appState.getEditorState();
    if (combatant && combatant.abilities && combatant.abilities.hasOwnProperty(key)) {
        delete combatant.abilities[key];
        renderMainEditorInDrawer({ activeAccordionId: 'abilities' });
    }
}

function renderActionEditorInDrawer(index = null) {
    _syncEditorFormState();
    const drawerContent = document.getElementById('editor-drawer-content');
    if (index !== null) {
        appState.openActionEditorForUpdate(index);
        const { action } = appState.getActionEditorState();
        const getTypeOfAction = (act) => {
            if (act.formType) return act.formType; // Prioritize the new form type
            if (act.type) return act.type; // Fallback to the general type
            if (act.multiattack) return 'multiattack';
            if (act.toHit) return 'attack';
            if (act.save) return 'save';
            if (act.heal) return 'heal';
            if (act.effect) return 'effect';
            return 'attack';
        };
        selectActionType(getTypeOfAction(action));
    } else {
        appState.openActionEditorForNew();
        drawerContent.innerHTML = getActionWizardSelectionHTML();
    }
}

function selectActionType(type) {
    const drawerContent = document.getElementById('editor-drawer-content');
    const { action, isNew } = appState.getActionEditorState();
    let formHTML;

    switch (type) {
        case 'attack': formHTML = getAttackActionFormHTML(action, isNew); break;
        case 'targeted_effect': formHTML = getTargetedEffectActionFormHTML(action, isNew); break;
        case 'heal': formHTML = getHealActionFormHTML(action, isNew); break;
        case 'pool_heal': formHTML = getPoolHealActionFormHTML(action, isNew); break;
        case 'multiattack': formHTML = getMultiattackActionFormHTML(action, isNew); break;
        default: console.error(`Unknown action type: ${type}`); return;
    }
    drawerContent.innerHTML = formHTML;
    _initializeMultiSelects('#action-properties-wrapper select, [id^="onhit-if-target-is-wrapper-"] select, [id^="onhit-resistance-types-wrapper-"] select');
}

function commitAction() {
    const newAction = readActionFromForm();
    const { combatant } = appState.getEditorState();
    const { index, isNew } = appState.getActionEditorState();

    if (!combatant) {
        console.error("Cannot commit action: No combatant is being edited.");
        closeEditorDrawer();
        return;
    }
    
    if (!combatant.attacks) combatant.attacks = [];

    if (isNew) {
        combatant.attacks.push(newAction);
    } else {
        combatant.attacks[index] = newAction;
    }

    renderMainEditorInDrawer({ activeAccordionId: 'actions' });
}

function renderMainEditorInDrawer(options = {}) {
    const drawerContent = document.getElementById('editor-drawer-content');
    drawerContent.innerHTML = getEditorDrawerHTML(options);
    _initializeAbilitySelect();
    updateAbilityDescription();
}

function _getDurationComponentsHTML(effect, index = null) {
    const duration = effect?.duration || {};
    const components = Object.entries(duration).filter(([key]) => !['concentration', 'relativeTo'].includes(key));

    const concentrationChecked = duration.concentration ? 'checked' : '';
    const suffix = index !== null ? `-${index}` : '';
    const containerId = `duration-components-container${suffix}`;
    const concentrationCheckboxId = `action-editor-duration-concentration${suffix}`;
    const relativeCheckboxId = `action-editor-duration-relative${suffix}`;

    const rowsHTML = components.map(([unit, value]) => {
        return `
            <div class="duration-component-row flex items-center gap-2 bg-gray-900 p-2 rounded">
                <input type="text" class="duration-value form-input w-20 text-center" value="${value}">
                <select class="duration-unit form-select flex-grow">
                    <option value="rounds" ${unit === 'rounds' ? 'selected' : ''}>Rounds (start of turn)</option>
                    <option value="turnEnds" ${unit === 'turnEnds' ? 'selected' : ''}>Rounds (end of turn)</option>
                    <option value="uses" ${unit === 'uses' ? 'selected' : ''}>Uses</option>
                    <option value="minutes" ${unit === 'minutes' ? 'selected' : ''}>Minutes</option>
                    <option value="hours" ${unit === 'hours' ? 'selected' : ''}>Hours</option>
                </select>
                <button data-action="remove-duration-component" class="btn btn-danger p-1 text-xs">&times;</button>
            </div>
        `;
    }).join('');

    const showRelativeToCaster = components.some(([unit]) => unit === 'turnEnds' || unit === 'rounds');
    const relativeToCasterHTML = `
        <div data-cy="relative-to-caster-container" style="display: ${showRelativeToCaster ? '' : 'none'};">
            <div class="flex items-center gap-2 mt-2 ml-4">
                <input type="checkbox" id="${relativeCheckboxId}" class="form-checkbox relative-to-caster-checkbox" ${duration.relativeTo === 'source' ? 'checked' : ''}>
                <label for="${relativeCheckboxId}">Relative to Caster</label>
                ${_getTooltipHTML("If checked, this duration will count down based on the original caster's turn, not the target's. Useful for effects like True Strike or Vicious Mockery.")}
            </div>
        </div>
    `;

    return `
        <div class="mt-2">
            <div id="${containerId}" class="space-y-2">${rowsHTML}</div>
            ${relativeToCasterHTML}
            <button data-action="add-duration-component" class="btn btn-secondary w-full mt-2 text-sm">Add Duration Component</button>
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
                <input type="checkbox" id="${concentrationCheckboxId}" class="form-checkbox concentration-checkbox" ${concentrationChecked}>
                <label for="${concentrationCheckboxId}">Requires Concentration</label>
                ${_getTooltipHTML("If checked, this effect requires the caster to maintain concentration. Taking damage, being incapacitated, or casting another concentration spell can break it.")}
            </div>
            <div class="flex items-center gap-2 mt-2">
                <input type="checkbox" id="action-editor-no-source-${index !== null ? index : ''}" class="form-checkbox no-source-checkbox" ${effect?.noSource ? 'checked' : ''}>
                <label for="action-editor-no-source-${index !== null ? index : ''}">Effect is Not from a Source</label>
                ${_getTooltipHTML("Check this for effects like Vicious Mockery, where the debuff applies to the target's next action against anyone, not just against the caster.")}
            </div>
        </div>
    `;
}

function _getExtraConfigHTMLForEffect(effect, index) {
    let extraConfigHTML = '';
    const selectedConditionKey = effect?.name;
    if (selectedConditionKey) {
        const conditionDef = CONDITIONS_LIBRARY[selectedConditionKey];
        if (conditionDef && conditionDef.configurable === 'resistance_types') {
            const selectedTypes = effect?.types || [];
            const wrapperId = `onhit-resistance-types-wrapper-${index}`;
            const damageTypeOptions = DAMAGE_TYPES.map(type => 
                `<option value="${type}" ${selectedTypes.includes(type) ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
            ).join('');

            extraConfigHTML = `
                <div class="mt-2" id="${wrapperId}">
                    <label for="action-editor-resistance-types" class="block font-semibold mb-1">Resistance Types</label>
                    <select id="action-editor-resistance-types" class="form-select w-full" multiple>
                        ${damageTypeOptions}
                    </select>
                </div>
            `;
        }
        if (conditionDef && conditionDef.configurable === 'die') {
            const dieValue = effect?.die || '';
            extraConfigHTML = `
                <div class="mt-2" data-cy="die-config">
                    <label for="action-editor-effect-die" class="block font-semibold mb-1">${conditionDef.name} Die</label>
                    <input type="text" id="action-editor-effect-die" class="form-input w-full" value="${dieValue}" placeholder="e.g., 1d4 or -1d4">
                </div>
            `;
        }
    }
    return extraConfigHTML;
}

function _getNestedEffectRowHTML(effect = {}, onHitEffectIndex, ruleIndex, nestedIndex) {
    const effectName = effect.name || '';
    const conditionOptions = Object.entries(CONDITIONS_LIBRARY)
        .filter(([, def]) => def.category !== 'internal')
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([key, def]) => `<option value="${key}" ${effectName === key ? 'selected' : ''}>${def.name}</option>`)
        .join('');

    return `
        <div class="nested-effect-row flex items-center gap-2">
            <select class="nested-effect-name form-select w-full">
                <option value="">-- Select Condition --</option>${conditionOptions}
            </select>
            <button type="button" data-action="remove-nested-effect" class="btn btn-danger p-1 text-xs">&times;</button>
        </div>`;
}

function _getGraduatedEffectRuleHTML(rule = {}, onHitEffectIndex, ruleIndex) {
    const margin = rule.margin || '';
    const nestedEffectsHTML = (rule.effects || []).map((effect, nestedIndex) => {
        return _getNestedEffectRowHTML(effect, onHitEffectIndex, ruleIndex, nestedIndex);
    }).join('');

    // The duration is now at the rule level. We pass the rule object itself to the duration helper.
    // We also need a more unique suffix for the duration component IDs.
    const durationSuffix = `graduated-${onHitEffectIndex ?? 'null'}-${ruleIndex}`;
    const sharedDurationHTML = _getDurationComponentsHTML(rule, durationSuffix);

    return `
        <div class="graduated-effect-rule bg-gray-900 p-3 rounded-md border border-gray-700 space-y-3">
            <div class="graduated-effect-rule-header flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <label class="text-sm font-medium">If save fails by at least</label>
                    <input type="number" class="graduated-effect-margin form-input w-20 text-center" value="${margin}">
                </div>
                <button type="button" data-action="remove-graduated-rule" class="btn btn-danger p-1 text-xs">&times;</button>
            </div>
            <div class="shared-duration-container border-t border-b border-gray-800 py-3">${sharedDurationHTML}</div>
            <div class="nested-effects-container space-y-2">${nestedEffectsHTML}</div>
            <button type="button" data-action="add-nested-effect" class="btn btn-secondary w-full mt-2 text-sm">Add Effect to this Rule</button>
        </div>
    `;
}

function getActionWizardSelectionHTML() {
    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-4 text-white">New Action: What kind of action is it?</h3>
            <p class="text-sm text-gray-400 mb-6">Choose the primary purpose of this action. This will determine which options are available.</p>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" data-cy="action-wizard-choices">
                <button class="wizard-choice-card" data-action="select-action-type" data-type="attack"><h4 class="font-semibold text-white">Make an Attack Roll</h4><p class="text-xs text-gray-400">Actions that use a 'To Hit' roll against a target's AC. (e.g., Sword, Fire Bolt)</p></button>
                <button class="wizard-choice-card" data-action="select-action-type" data-type="targeted_effect"><h4 class="font-semibold text-white">Targeted Effect</h4><p class="text-xs text-gray-400">An effect with damage, a save, and/or conditions. (Recommended)</p></button>
                <button class="wizard-choice-card" data-action="select-action-type" data-type="heal"><h4 class="font-semibold text-white">Provide Healing</h4><p class="text-xs text-gray-400">Actions that restore hit points to a target. (e.g., Cure Wounds, Healing Word)</p></button>
                <button class="wizard-choice-card" data-action="select-action-type" data-type="pool_heal"><h4 class="font-semibold text-white">Heal from Resource Pool</h4><p class="text-xs text-gray-400">Actions that consume points from a resource pool to heal. (e.g., Lay on Hands)</p></button>
                <button class="wizard-choice-card col-span-1 sm:col-span-2" data-action="select-action-type" data-type="multiattack"><h4 class="font-semibold text-white">Compose a Multiattack</h4><p class="text-xs text-gray-400">Combine multiple other actions into a single sequence. (e.g., 2 Claw attacks and 1 Bite attack)</p></button>
            </div>
        </div>
        <div class="flex justify-end mt-6 flex-shrink-0"><button data-action="back-to-main-editor" class="btn btn-secondary">Back</button></div>
    `;
}

function _getSharedActionFormAccordionsHTML(action) {
    const actionTypes = ['action', 'bonus_action', 'reaction'];
    const usePeriods = ['combat', 'round', 'turn'];
    const targetingTypes = ['any', 'self', 'other'];

    return `
        <h4 class="action-form-section-header">General Properties</h4>
        <div class="accordion-item active">
            <button type="button" class="accordion-header" data-action="toggle-accordion">Core Details</button>
            <div class="accordion-content">
                <div class="p-3">
                    <select id="action-editor-action" class="form-select">${actionTypes.map(t => `<option value="${t}" ${action.action === t ? 'selected' : ''}>${t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('')}</select>
                </div>
            </div>
        </div>
        <div class="accordion-item">
            <button type="button" class="accordion-header" data-action="toggle-accordion">Usage Limits</button>
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
        <div class="accordion-item">
            <button type="button" class="accordion-header" data-action="toggle-accordion">General</button>
            <div class="accordion-content">
                <div class="p-3">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input type="number" id="action-editor-spellLevel" placeholder="Spell Level (0-9)" class="form-input" value="${action.spellLevel ?? ''}">
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

function _getActionPropertiesAccordionHTML(action) {
    if (!window.ACTION_PROPERTIES_LIBRARY || Object.keys(window.ACTION_PROPERTIES_LIBRARY).length === 0) {
        return '';
    }

    const propertyOptions = Object.entries(ACTION_PROPERTIES_LIBRARY)
        .map(([key, prop]) => {
            const isSelected = action.properties?.includes(key) ? 'selected' : '';
            return `<option value="${key}" ${isSelected}>${prop.name}</option>`;
        }).join('');

    return `
        <div class="accordion-item">
            <button type="button" class="accordion-header" data-action="toggle-accordion">Action Properties</button>
            <div class="accordion-content">
                <div class="p-3">
                    <div id="action-properties-wrapper">
                        <select id="action-editor-properties" class="form-select w-full" multiple>${propertyOptions}</select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function _getOnHitEffectFormHTML(effectData = {}, index) {
    const conditionOptions = Object.entries(CONDITIONS_LIBRARY)
        .filter(([, def]) => def.category !== 'internal')
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([key, def]) => `<option value="${key}" ${effectData.effect?.name === key ? 'selected' : ''}>${def.name}</option>`)
        .join('');

    const graduatedEffectsHTML = (effectData.on_fail_by || []).map((rule, ruleIndex) => { // eslint-disable-line no-unused-vars
        return _getGraduatedEffectRuleHTML(rule, index, ruleIndex);
    }).join('');

    const extraConfigHTML = _getExtraConfigHTMLForEffect(effectData.effect, index);

    return `
        <div class="on-hit-effect-form p-3 space-y-4">
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label for="action-editor-onhit-if-target-is" class="block text-sm font-medium text-gray-300">Condition: If Target Is...</label>
                    ${_getTooltipHTML("If a type is selected, this on-hit effect will only apply if the target's creature type matches.")}
                </div>
                <div id="onhit-if-target-is-wrapper-${index}">
                    <select class="action-editor-onhit-if-target-is form-select w-full" multiple>
                        <option value="">-- Any Creature Type --</option>
                        ${CREATURE_TYPES.map(t => `<option value="${t.toLowerCase()}" ${Array.isArray(effectData.if_target_is) && effectData.if_target_is.includes(t.toLowerCase()) ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Bonus Damage</label>
                <div class="grid grid-cols-2 gap-2">
                    <input type="text" class="action-editor-onhit-damage form-input" placeholder="e.g., 7d6" value="${effectData.damage || ''}">
                    <select class="action-editor-onhit-damage-type form-select">
                        <option value="">-- Damage Type --</option>
                        ${DAMAGE_TYPES.map(t => `<option value="${t}" ${effectData.damageType === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Saving Throw</label>
                <div class="grid grid-cols-3 gap-2">
                    <input type="number" class="action-editor-onhit-save-dc form-input" placeholder="DC" value="${effectData.save?.dc || ''}">
                    <select class="action-editor-onhit-save-type form-select">
                        <option value="">-- Save Type --</option>
                        ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(t => `<option value="${t}" ${effectData.save?.type === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                    </select>
                    <select class="action-editor-onhit-on-save form-select">
                        <option value="negated" ${effectData.on_save === 'negated' ? 'selected' : ''}>Negates Effect</option>
                        <option value="half" ${effectData.on_save === 'half' ? 'selected' : ''}>Half Damage</option>
                    </select>
                </div>
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Condition on Fail</label>
                <select class="action-editor-onhit-effect-name form-select w-full">
                    <option value="">-- No Effect --</option>
                    ${conditionOptions}
                </select>
                <div data-cy="extra-config-container">
                    ${extraConfigHTML}
                </div>
                ${_getDurationComponentsHTML(effectData.effect, index)}
            </div>
            
            <!-- Graduated Effects Section -->
            <div class="space-y-2 pt-4 border-t border-gray-700">
                <label class="block text-sm font-medium text-gray-300">Graduated Effects on Save Failure</label>
                <div id="graduated-effects-container-${index}" class="space-y-2">${graduatedEffectsHTML}</div>
                <button type="button" data-action="add-graduated-effect" class="btn btn-secondary w-full mt-2 text-sm">Add Graduated Effect</button>
            </div>
        </div>`;
}

function getAttackActionFormHTML(action, isNew) {
    const conditionOptions = Object.entries(CONDITIONS_LIBRARY)
        .filter(([, def]) => def.category !== 'internal')
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([key, def]) => `<option value="${key}" ${action.on_hit_effect?.effect?.name === key ? 'selected' : ''}>${def.name}</option>`)
        .join('');

    // Handle both the new array format and the old single object for backward compatibility.
    const onHitEffects = action.on_hit_effects || (action.on_hit_effect ? [action.on_hit_effect] : []);

    const onHitEffectsHTML = onHitEffects.map((effect, index) => `
        <div class="accordion-item on-hit-effect-item">
            <div class="flex items-center bg-gray-800 rounded-t-md">
                <button type="button" class="accordion-header flex-grow" data-action="toggle-accordion">Effect on Hit #${index + 1}</button>
                <button data-action="remove-on-hit-effect" class="btn btn-danger p-1 text-xs mr-2">&times;</button>
            </div>
            <div class="accordion-content">${_getOnHitEffectFormHTML(effect, index)}</div>
        </div>
    `).join('');

    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Attack Action' : `Editing: ${action.name}`}</h3>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <input type="hidden" id="action-editor-form-type" value="attack">
            <div class="space-y-2">
                <input type="text" id="action-editor-name" placeholder="Action Name" class="form-input" value="${action.name || ''}">
                ${_getSharedActionFormAccordionsHTML(action)}
                <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
                <div class="accordion-item">
                    <button type="button" class="accordion-header" data-action="toggle-accordion">Attack</button>
                    <div class="accordion-content">
                        <div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <input type="number" id="action-editor-toHit" placeholder="To Hit Bonus" class="form-input" value="${action.toHit || ''}">
                            <input type="text" id="action-editor-damage" placeholder="Damage (e.g. 2d6+3)" class="form-input col-span-2" value="${action.damage || ''}">
                            <select id="action-editor-type" class="form-select">
                                <option value="">-- Damage Type --</option>
                                ${DAMAGE_TYPES.map(t => `<option value="${t}" ${action.damageType === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                            </select>
                            <div class="flex items-center gap-2">
                                <input type="checkbox" id="action-editor-ranged" class="form-checkbox" ${action.ranged ? 'checked' : ''}>
                                <label for="action-editor-ranged">Ranged</label>
                            </div>
                            <div class="flex items-center gap-2"><input type="checkbox" id="action-editor-heavy" class="form-checkbox" ${action.heavy ? 'checked' : ''}><label for="action-editor-heavy">Heavy</label></div>
                        </div>
                    </div>
                </div>
                ${_getActionPropertiesAccordionHTML(action)}
                <div id="on-hit-effects-container">
                    ${onHitEffectsHTML}
                </div>
                <button data-action="add-on-hit-effect" class="btn btn-secondary w-full mt-2 text-sm">Add On-Hit Effect</button>
            </div>
        </div>
        <div class="flex gap-4 mt-6 flex-shrink-0">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="back-to-main-editor" class="btn btn-secondary">Back</button>
        </div>
    `;
}

function getHealActionFormHTML(action, isNew) {
    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Healing Action' : `Editing: ${action.name}`}</h3>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <input type="hidden" id="action-editor-form-type" value="heal">
            <div class="space-y-2">
                <input type="text" id="action-editor-name" placeholder="Action Name" class="form-input" value="${action.name || ''}">
                ${_getSharedActionFormAccordionsHTML(action)}
                <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
                <div class="accordion-item">
                    <button type="button" class="accordion-header" data-action="toggle-accordion">Healing</button>
                    <div class="accordion-content">
                        <div class="p-3">
                            <input type="text" id="action-editor-heal" placeholder="Heal Amount (e.g. 1d8+5)" class="form-input" value="${action.heal || ''}">
                        </div>
                    </div>
                </div>
                ${_getActionPropertiesAccordionHTML(action)}
            </div>
        </div>
        <div class="flex gap-4 mt-6 flex-shrink-0">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="back-to-main-editor" class="btn btn-secondary">Back</button>
        </div>
    `;
}

function getPoolHealActionFormHTML(action, isNew) {
    const { combatant } = appState.getEditorState();
    const availablePools = Object.entries(combatant.abilities || {})
        .filter(([, value]) => typeof value === 'object' && value.pool !== undefined);

    const poolOptions = availablePools.length > 0
        ? availablePools.map(([key, value]) => {
            const displayName = ABILITIES_LIBRARY[key]?.name || key;
            return `<option value="${key}" ${action.poolName === key ? 'selected' : ''}>${displayName}</option>`;
        }).join('')
        : '<option value="">-- No resource pools defined --</option>';

    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Pool Healing Action' : `Editing: ${action.name}`}</h3>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <input type="hidden" id="action-editor-form-type" value="pool_heal">
            <div class="space-y-2">
                <input type="text" id="action-editor-name" placeholder="Action Name" class="form-input" value="${action.name || ''}">
                ${_getSharedActionFormAccordionsHTML(action)}
                <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
                <div class="accordion-item">
                    <button type="button" class="accordion-header" data-action="toggle-accordion">Pool Healing</button>
                    <div class="accordion-content">
                        <div class="p-3 grid grid-cols-2 gap-4">
                            <select id="action-editor-pool-select" class="form-select">${poolOptions}</select>
                            <input type="number" id="action-editor-pool-heal-amount" placeholder="Amount to Use" class="form-input" value="${action.amount || ''}">
                        </div>
                    </div>
                </div>
                ${_getActionPropertiesAccordionHTML(action)}
            </div>
        </div>
        <div class="flex gap-4 mt-6 flex-shrink-0">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="back-to-main-editor" class="btn btn-secondary">Back</button>
        </div>
    `;
}

function getMultiattackActionFormHTML(action, isNew) {
    const { combatant } = appState.getEditorState();
    const availableSubActions = (combatant.attacks || [])
        .filter(a => !a.multiattack && a.name !== action.name);

    const subActionCheckboxes = availableSubActions.length > 0 
        ? availableSubActions.map(sub => {
            const existing = (action.multiattack || []).find(ma => ma.name === sub.name);
            const checked = existing ? 'checked' : '';
            const count = existing ? existing.count : 1;
            const subId = `sub-action-${sub.name.replace(/\s+/g, '-')}`;
            return `
                <div class="flex items-center gap-4 p-2 bg-gray-900 rounded">
                    <input type="checkbox" id="${subId}" data-sub-action-name="${sub.name}" class="form-checkbox" ${checked}>
                    <label for="${subId}" class="flex-grow text-white">${sub.name}</label>
                    <input type="number" value="${count}" min="1" class="form-input w-20 text-center" data-sub-action-count="${sub.name}">
                </div>
            `;
        }).join('')
        : '<p class="text-gray-400 text-center py-4">No other actions have been defined for this creature. Add other attacks first.</p>';

    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Multiattack Action' : `Editing: ${action.name}`}</h3>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <input type="hidden" id="action-editor-form-type" value="multiattack">
            <div class="space-y-2">
                <input type="text" id="action-editor-name" placeholder="Action Name" class="form-input" value="${action.name || ''}">
                ${_getSharedActionFormAccordionsHTML(action)}
                <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
                <div class="accordion-item">
                    <button type="button" class="accordion-header" data-action="toggle-accordion">Multiattack Sequence</button>
                    <div class="accordion-content">
                        <div class="p-3 space-y-2" data-cy="multiattack-options">${subActionCheckboxes}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-4 mt-6 flex-shrink-0">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="back-to-main-editor" class="btn btn-secondary">Back</button>
        </div>
    `;
}

function _getTargetedEffectConditionRowHTML(condition = {}, index) {
    const conditionName = condition.name || '';
    const conditionOptions = Object.entries(CONDITIONS_LIBRARY)
        .filter(([, def]) => def.category !== 'internal')
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([key, def]) => `<option value="${key}" ${conditionName === key ? 'selected' : ''}>${def.name}</option>`)
        .join('');

    const extraConfigHTML = _getExtraConfigHTMLForEffect(condition);

    return `
        <div class="targeted-effect-condition-row bg-gray-800 p-3 rounded-md border border-gray-700">
            <select class="targeted-effect-condition-name form-select w-full">
                <option value="">-- Select Condition --</option>${conditionOptions}
            </select>
            <div data-cy="extra-config-container">${extraConfigHTML}</div>
            ${_getDurationComponentsHTML(condition, index)}
        </div>`;
}

function getTargetedEffectActionFormHTML(action, isNew) {
    // This is the initial implementation for the new streamlined UI.
    // It includes the key elements required by the failing test from Step 2.1.
    return `
        <div class="flex-shrink-0">
            <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'New Targeted Effect Action' : `Editing: ${action.name}`}</h3>
        </div>
        <div class="flex-grow overflow-y-auto p-1 -m-1">
            <input type="hidden" id="action-editor-form-type" value="targeted_effect">
            <div class="space-y-2">
                <input type="text" id="action-editor-name" placeholder="Action Name" class="form-input" value="${action.name || ''}">
                ${_getSharedActionFormAccordionsHTML(action)}
                <h4 class="action-form-section-header mt-4">Action-Specific Properties</h4>
                
                <div class="accordion-item">
                    <button type="button" class="accordion-header" data-action="toggle-accordion">Saving Throw</button>
                    <div class="accordion-content">
                        <div class="p-3 space-y-4">
                            <div class="flex items-center gap-2">
                                <input type="checkbox" id="action-editor-enable-save" class="form-checkbox" ${action.save ? 'checked' : ''}>
                                <label for="action-editor-enable-save">Enable Saving Throw</label>
                            </div>
                            <div id="save-fields-container" class="grid grid-cols-2 sm:grid-cols-3 gap-4 ${action.save ? '' : 'hidden'}">
                                <input type="number" id="action-editor-save-dc" placeholder="Save DC" class="form-input" value="${action.save?.dc || ''}">
                                <select id="action-editor-save-type" class="form-select">
                                    <option value="">-- Save Type --</option>
                                    ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(t => `<option value="${t}" ${action.save?.type === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                                </select>
                                <div class="flex items-center gap-2 col-span-2 sm:col-span-1"><input type="checkbox" id="action-editor-half" class="form-checkbox" ${action.half ? 'checked' : ''}><label for="action-editor-half">Half damage on save</label></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <button type="button" class="accordion-header" data-action="toggle-accordion">Damage</button>
                    <div class="accordion-content">
                        <div class="p-3">
                            <div class="grid grid-cols-2 gap-2">
                                <input type="text" id="action-editor-damage" placeholder="Damage (e.g. 2d6+3)" class="form-input" value="${action.damage || ''}">
                                <select id="action-editor-damage-type" class="form-select">
                                    <option value="">-- Damage Type --</option>
                                    ${DAMAGE_TYPES.map(t => `<option value="${t}" ${action.damageType === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                ${_getActionPropertiesAccordionHTML(action)}

                <div id="conditions-section">
                    <div id="targeted-effect-conditions-container" class="space-y-2">
                        ${(action.effect ? [_getTargetedEffectConditionRowHTML(action.effect, 0)] : []).join('')}
                    </div>
                    <button data-action="add-targeted-effect-condition" class="btn btn-secondary w-full mt-2 text-sm">Add Condition</button>
                </div>
                <div class="space-y-2 pt-4 border-t border-gray-700">
                    <label class="block text-sm font-medium text-gray-300">Graduated Effects on Save Failure</label>
                    <div id="graduated-effects-container-null" class="space-y-2">${(action.on_fail_by || []).map((rule, ruleIndex) => _getGraduatedEffectRuleHTML(rule, null, ruleIndex)).join('')}</div>
                    <button type="button" data-action="add-graduated-effect" class="btn btn-secondary w-full mt-2 text-sm">Add Graduated Effect</button>
                </div>
            </div>
        </div>
        <div class="flex gap-4 mt-6 flex-shrink-0">
            <button data-action="commit-action" class="btn btn-primary flex-grow">Save Action</button>
            <button data-action="back-to-main-editor" class="btn btn-secondary">Back</button>
        </div>
    `;
}

// --- Dynamic UI Rendering Handlers ---

function handleAddDurationComponent(target) {
    const scope = target.closest('.on-hit-effect-form, .accordion-content, .graduated-effect-rule, .targeted-effect-condition-row');
    const container = scope.querySelector('[id^="duration-components-container"]');
    const newRow = document.createElement('div');
    newRow.className = 'duration-component-row flex items-center gap-2 bg-gray-900 p-2 rounded';
    newRow.innerHTML = `
        <input type="text" class="duration-value form-input w-20 text-center" value="1">
        <select class="duration-unit form-select flex-grow">
            <option value="rounds">Rounds (start of turn)</option>
            <option value="turnEnds">Rounds (end of turn)</option>
            <option value="uses">Uses</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
        </select>
        <button data-action="remove-duration-component" class="btn btn-danger p-1 text-xs">&times;</button>
    `;
    container.appendChild(newRow);
    _updateRelativeToCasterVisibility(scope);
}

function handleAddOnHitEffect() {
    const container = document.getElementById('on-hit-effects-container');
    if (container) {
        const newIndex = container.children.length;
        const newItem = document.createElement('div');
        newItem.className = 'accordion-item on-hit-effect-item';
        newItem.innerHTML = `
            <div class="flex items-center bg-gray-800 rounded-t-md">
                <button type="button" class="accordion-header flex-grow" data-action="toggle-accordion">Effect on Hit #${newIndex + 1}</button>
                <button data-action="remove-on-hit-effect" class="btn btn-danger p-1 text-xs mr-2">&times;</button>
            </div>
            <div class="accordion-content">${_getOnHitEffectFormHTML({}, newIndex)}</div>
        `;
        container.appendChild(newItem);
        // Initialize Choices.js for the newly added multi-select.
        // The selector needs to be specific to the new item to avoid re-initializing existing ones.
        const newSelectSelector = `#onhit-if-target-is-wrapper-${newIndex} select`;
        _initializeMultiSelects(newSelectSelector);
    }
}

function handleAddGraduatedEffect(target) {
    const parentForm = target.closest('.on-hit-effect-form, .accordion-content, .flex-grow');
    if (!parentForm) return;
    const container = parentForm.querySelector('[id^="graduated-effects-container-"]');
    if (!container) return;
    const onHitIndex = container.id.split('-').pop();
    const newIndex = container.querySelectorAll('.graduated-effect-rule').length;
    const newRuleHTML = _getGraduatedEffectRuleHTML({}, onHitIndex, newIndex);
    container.insertAdjacentHTML('beforeend', newRuleHTML);
}

function handleAddTargetedEffectCondition() {
    const container = document.getElementById('targeted-effect-conditions-container');
    const newIndex = container.querySelectorAll('.targeted-effect-condition-row').length;
    const newRowHTML = _getTargetedEffectConditionRowHTML({}, newIndex);
    container.insertAdjacentHTML('beforeend', newRowHTML);
}

function handleRemoveGraduatedRule(target) { target.closest('.graduated-effect-rule').remove(); }
function handleAddNestedEffect(target) {
    const ruleCard = target.closest('.graduated-effect-rule');
    const container = ruleCard.querySelector('.nested-effects-container');
    const newIndex = container.children.length;
    const newRowHTML = _getNestedEffectRowHTML({}, null, null, newIndex);
    container.insertAdjacentHTML('beforeend', newRowHTML);
}
function handleRemoveNestedEffect(target) { target.closest('.nested-effect-row').remove(); }
function handleRemoveOnHitEffect(target) {
    target.closest('.on-hit-effect-item').remove();
    const remainingEffects = document.querySelectorAll('#on-hit-effects-container .on-hit-effect-item');
    remainingEffects.forEach((item, idx) => {
        item.querySelector('button.accordion-header').textContent = `Effect on Hit #${idx + 1}`;
    });
}
function handleRemoveDurationComponent(target) {
    const durationScope = target.closest('.on-hit-effect-form, .accordion-content');
    target.closest('.duration-component-row').remove();
    _updateRelativeToCasterVisibility(durationScope);
}

function getLibraryDrawerHTML() {
    return `
        <!-- Drawer Header -->
        <div class="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
            <h2 class="text-2xl font-bold text-white">Creature Library</h2>
            <button data-action="close-library-modal" class="btn btn-danger">&times;</button>
        </div>

        <!-- Drawer Body (Two-Column Layout) -->
        <!-- Filters Accordion (now part of the sticky header area) -->
        <div id="library-filters-sidebar" class="p-4 pt-0 flex-shrink-0">
            <div class="accordion-item bg-gray-900 rounded-md">
                <button type="button" class="accordion-header" data-action="toggle-accordion" data-cy="library-filters-accordion-header">Filters</button>
                <div class="accordion-content">
                    <div class="p-4 space-y-4">
                        <div class="flex flex-col items-center pt-8">
                            <div id="library-filter-cr-slider"></div>
                            <label for="library-filter-cr-slider" class="block text-center text-sm mt-2">Challenge Rating</label>
                        </div>
                        <div class="flex flex-col items-center pt-8">
                            <div id="library-filter-size-slider"></div>
                            <label for="library-filter-size-slider" class="block text-center text-sm mt-2">Size</label>
                        </div>
                        <input type="text" id="library-filter-name" placeholder="Search by name..." class="form-input w-full">
                        <div>
                            <label class="block mb-2 text-sm">Creature Type</label>
                            <div id="library-type-select-wrapper">
                                <select id="library-filter-type-multiselect" multiple></select>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 pt-2">
                            <input type="checkbox" id="library-filter-experimental" class="form-checkbox">
                            <label for="library-filter-experimental">Show Experimental</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- This div is the key. It grows to fill space and allows its children to scroll. -->
        <div class="flex-grow overflow-y-auto p-4 pt-0">
            <main id="library-grid-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></main>
        </div>
    `;
}

function renderLibraryGrid(monsters) {
    if (!monsters || monsters.length === 0) {
        return '<p class="text-gray-400 text-center col-span-full">No monsters found.</p>';
    }

    const { teamA, teamB } = appState.getTeams();
    const monsterCounts = {};
    const countMonster = (monsterName, team) => {
        // Strip numbers like "Goblin 2" -> "Goblin"
        const baseName = monsterName.replace(/ \d+$/, '');
        if (!monsterCounts[baseName]) {
            monsterCounts[baseName] = { A: 0, B: 0 };
        }
        monsterCounts[baseName][team]++;
    };
    teamA.forEach(c => countMonster(c.name, 'A'));
    teamB.forEach(c => countMonster(c.name, 'B'));

    const targetTeam = appState.libraryTargetTeam;
    const buttonClass = targetTeam === 'A' ? 'btn-primary' : 'btn-danger';

    return monsters.map(monster => {
        const size = monster.size ? monster.size.charAt(0).toUpperCase() + monster.size.slice(1) : '';
        const type = monster.type ? monster.type.charAt(0).toUpperCase() + monster.type.slice(1) : '';
        const countOnTargetTeam = monsterCounts[monster.name]?.[targetTeam] || 0;

        return `
            <div class="creature-card relative bg-gray-700 p-3 rounded-md flex flex-row items-center justify-between">
                <div class="flex-grow">
                    <p class="font-bold text-white">${monster.name}</p>
                    <p class="text-sm text-gray-300">HP: ${monster.hp}, AC: ${monster.ac}, CR: ${monster.cr}</p>
                    <p class="text-xs text-gray-400">${size} ${type}</p>
                </div>
                <div class="flex items-center gap-4 ml-4 flex-shrink-0">
                    <span data-cy="creature-count" class="font-mono text-lg w-8 text-center">${countOnTargetTeam}</span>
                    <button data-action="add-from-library" data-monster-name="${monster.name}" class="btn ${buttonClass} text-lg font-mono w-12">+</button>
                </div>
            </div>
        `;
    }).join('');
}

function _getCrAsNumber(cr) {
    if (typeof cr !== 'string') return cr;
    if (cr.includes('/')) {
        const parts = cr.split('/');
        return parseInt(parts[0], 10) / parseInt(parts[1], 10);
    }
    return parseInt(cr, 10);
}

function _initializeLibraryFilters() {
    // Type Filter
    const typeSelect = document.getElementById('library-filter-type-multiselect');
    const typeOptions = CREATURE_TYPES.map(t => ({ value: t.toLowerCase(), label: t }));
    const typeChoices = new Choices(typeSelect, {
        choices: typeOptions,
        removeItemButton: true,
        placeholder: true,
        placeholderValue: 'Filter by type...',
        fuseOptions: {
            threshold: 0.0,
            ignoreLocation: true,
        }
    });
    typeSelect.addEventListener('change', applyLibraryFilters);

    // CR Filter
    const crSlider = document.getElementById('library-filter-cr-slider');
    const allCrValues = [...new Set(MONSTER_LIBRARY_DATA.map(m => _getCrAsNumber(m.cr)))].sort((a, b) => a - b);
    const minCr = allCrValues[0];
    const maxCr = allCrValues[allCrValues.length - 1];

    // Create a non-linear range for the CR slider to handle fractional and integer steps correctly.
    const crRange = {};
    const totalCrSteps = allCrValues.length - 1;
    allCrValues.forEach((value, index) => {
        const percentage = (index / totalCrSteps) * 100;
        const key = index === 0 ? 'min' : (index === totalCrSteps ? 'max' : `${percentage}%`);
        crRange[key] = value;
    });

    noUiSlider.create(crSlider, {
        start: [minCr, maxCr],
        connect: true,
        range: crRange,
        snap: true, // Snap to the defined range points.
        tooltips: true,
        format: {
            to: value => { // Format tooltips to show fractions for CR < 1
                if (value === 0.125) return '1/8';
                if (value === 0.25) return '1/4';
                if (value === 0.5) return '1/2';
                return Math.round(value); // Show whole numbers for CR >= 1
            },
            from: value => Number(value)
        }
    });
    crSlider.noUiSlider.on('set', applyLibraryFilters);

    // Size Filter
    const sizeSlider = document.getElementById('library-filter-size-slider');
    noUiSlider.create(sizeSlider, {
        start: [sizeOrder[0], sizeOrder[sizeOrder.length - 1]],
        connect: true,
        range: { 'min': 0, 'max': sizeOrder.length - 1 },
        step: 1,
        tooltips: true,
        format: {
            to: value => {
                const size = sizeOrder[Math.round(value)];
                return size.charAt(0).toUpperCase() + size.slice(1);
            },
            from: value => sizeOrder.indexOf(value)
        }
    });
    sizeSlider.noUiSlider.on('set', applyLibraryFilters);

    // Experimental Filter & Name Filter
    document.getElementById('library-filter-experimental').addEventListener('change', applyLibraryFilters);
    document.getElementById('library-filter-name').addEventListener('input', applyLibraryFilters);
}

function applyLibraryFilters() {
    const nameFilter = document.getElementById('library-filter-name').value.toLowerCase();
    const crSlider = document.getElementById('library-filter-cr-slider');
    const sizeSlider = document.getElementById('library-filter-size-slider');
    const typeSelect = document.getElementById('library-filter-type-multiselect');
    const experimentalCheckbox = document.getElementById('library-filter-experimental');
    const gridContainer = document.getElementById('library-grid-container');

    const filteredMonsters = getFilteredMonsters(nameFilter, crSlider, sizeSlider, typeSelect, experimentalCheckbox);
    gridContainer.innerHTML = renderLibraryGrid(filteredMonsters);
}

function getFilteredMonsters(nameFilter, crSlider, sizeSlider, typeSelect, experimentalCheckbox) {

    let filteredMonsters = MONSTER_LIBRARY_DATA;

    // 1. Filter by Name
    if (nameFilter) {
        filteredMonsters = filteredMonsters.filter(monster => 
            monster.name.toLowerCase().includes(nameFilter)
        );
    }

    // 2. Filter by Type
    if (typeSelect) {
        const selectedTypes = Array.from(typeSelect.selectedOptions).map(opt => opt.value);
        if (selectedTypes.length > 0) {
            filteredMonsters = filteredMonsters.filter(monster => 
                monster.type && selectedTypes.includes(monster.type.toLowerCase())
            );
        }
    }

    // 3. Filter by CR
    if (crSlider?.noUiSlider) {
        const [minCrStr, maxCrStr] = crSlider.noUiSlider.get();
        const minCr = _getCrAsNumber(minCrStr);
        const maxCr = _getCrAsNumber(maxCrStr);
        filteredMonsters = filteredMonsters.filter(monster => {
            const monsterCr = _getCrAsNumber(monster.cr);
            return monsterCr >= minCr && monsterCr <= maxCr;
        });
    }

    // 4. Filter by Size
    if (sizeSlider?.noUiSlider) {
        const [minSizeStr, maxSizeStr] = sizeSlider.noUiSlider.get();
        const minSize = sizeOrder.indexOf(minSizeStr.toLowerCase());
        const maxSize = sizeOrder.indexOf(maxSizeStr.toLowerCase());
        filteredMonsters = filteredMonsters.filter(monster => {
            const monsterSizeIndex = sizeOrder.indexOf(monster.size);
            return monsterSizeIndex >= minSize && monsterSizeIndex <= maxSize;
        });
    }

    // 5. Filter by Experimental status
    if (experimentalCheckbox && !experimentalCheckbox.checked) {
        filteredMonsters = filteredMonsters.filter(monster => !monster.isExperimental);
    }

    return filteredMonsters;
}

function openLibraryDrawer(team) {
    appState.setLibraryTargetTeam(team);
    document.getElementById('library-drawer-overlay').classList.remove('hidden');
    const drawerContent = document.getElementById('library-drawer-content');
    const drawer = document.getElementById('library-drawer');
    drawerContent.innerHTML = getLibraryDrawerHTML(); // Render the content into the wrapper
    drawer.classList.add('active');
    _initializeLibraryFilters();
    applyLibraryFilters(); // Initial render
}

function closeLibraryDrawer() {
    document.getElementById('library-drawer-overlay').classList.add('hidden');
    document.getElementById('library-drawer').classList.remove('active');
    // Clear the target team when the modal is closed.
    appState.setLibraryTargetTeam(null);
}