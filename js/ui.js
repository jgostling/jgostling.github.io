// js/ui.js

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
    const abilities = (data.abilities ? Object.entries(data.abilities).map(([k,v]) => v === true ? k : `${k}:${v}`).join(', ') : '');

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
                <input type="text" id="type-${prefix}" placeholder="Type (e.g. fiend)" class="form-input" value="${type}">
                <input type="number" id="hp-${prefix}" placeholder="HP" class="form-input" value="${hp}">
                <input type="number" id="ac-${prefix}" placeholder="AC" class="form-input" value="${ac}">
                <select id="size-${prefix}" class="form-select">${sizeOrder.map(s => `<option value="${s}" ${s === size ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select>
                <select id="role-${prefix}" class="form-select"><option value="frontline" ${role === 'frontline' ? 'selected' : ''}>Frontline</option><option value="backline" ${role === 'backline' ? 'selected' : ''}>Backline</option></select>
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
            <textarea id="abilities-${prefix}" rows="4" placeholder="Comma separated keywords. e.g.&#10;pack_tactics, divine_smite" class="form-input w-full font-mono text-sm">${abilities}</textarea>
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
}

function closeEditorModal() {
    closeActionEditorModal(); // Ensure sub-modal is closed before closing the main one
    appState.clearEditorState();
    document.getElementById('editor-modal-overlay').classList.add('hidden');
    document.getElementById('editor-modal').classList.add('hidden');
    document.getElementById('editor-modal-content').innerHTML = ''; // Clear content for next use
}

function openActionEditorModal(index = null) {
    if (index !== null) {
        appState.openActionEditorForUpdate(index);
    } else {
        appState.openActionEditorForNew();
    }

    const { action, isNew } = appState.getActionEditorState();
    const formHTML = getActionEditorFormHTML(action, isNew);

    document.getElementById('action-editor-modal-content').innerHTML = formHTML;
    document.getElementById('action-editor-modal-overlay').classList.remove('hidden');
    document.getElementById('action-editor-modal').classList.remove('hidden');
}

function getActionEditorFormHTML(action, isNew) {
    const saveTypes = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const actionTypes = ['action', 'bonus_action', 'reaction'];
    const usePeriods = ['combat', 'round', 'turn'];
    const targetingTypes = ['any', 'self', 'other'];

    return `
        <h3 class="font-semibold text-lg mb-4 text-white">${isNew ? 'Add New Action' : `Editing: ${action.name}`}</h3>
        
        <div class="space-y-2">
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
                        <div class="flex items-center gap-2"><input type="checkbox" id="action-editor-half" class="form-checkbox" ${action.half ? 'checked' : ''}><label for="action-editor-half">Half damage on save</label></div>
                    </div>
                </div>
            </div>

            <!-- Healing Properties -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">Healing</button>
                <div class="accordion-content">
                    <div class="p-3">
                        <input type="text" id="action-editor-heal" placeholder="Heal Amount (e.g. 1d8+5)" class="form-input" value="${action.heal || ''}">
                    </div>
                </div>
            </div>

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

            <!-- Usage Limit Properties -->
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

            <!-- General Spell/Effect Properties -->
            <div class="accordion-item">
                <button type="button" class="accordion-header" data-action="toggle-accordion">General</button>
                <div class="accordion-content">
                    <div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input type="number" id="action-editor-spellLevel" placeholder="Spell Level (0-9)" class="form-input" value="${action.spellLevel || ''}">
                        <input type="number" id="action-editor-targets" placeholder="# of Targets" class="form-input" value="${action.targets || ''}">
                        <select id="action-editor-targeting" class="form-select">
                            ${targetingTypes.map(t => `<option value="${t}" ${action.targeting === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                        </select>
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
    const abilities = c.abilities ? Object.keys(c.abilities).join(', ') : 'None';
    return `
        <div class="bg-gray-700 p-3 rounded-md flex justify-between items-center">
            <div>
                <p class="font-bold text-white">${c.name} <span class="text-xs text-gray-400">(${roleDisplay}, ${c.size})</span></p>
                <p class="text-sm text-gray-300">HP: ${c.hp}, AC: ${c.ac}, Init: ${c.initiative_mod >= 0 ? '+' : ''}${c.initiative_mod}, Threat: ${c.threat || 1}</p>
                <p class="text-xs text-gray-400">Abilities: ${abilities}</p>
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