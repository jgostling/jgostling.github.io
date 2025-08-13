// js/ui.js

function getEditorHTML(team) {
    const combatant = appState.getEditingCombatant(team) || {};
    const isEditing = !!combatant.id;
    const prefix = team.toLowerCase();
    
    const name = combatant.name || '';
    const hp = combatant.hp || '';
    const ac = combatant.ac || '';
    const size = combatant.size || 'medium';
    const type = combatant.type || '';
    const init_mod = combatant.initiative_mod || 0;
    const saves = combatant.saves || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const spell_slots = combatant.spell_slots || { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 };
    const attacks = (combatant.attacks || []).map(a => stringifyAction(a)).join('\n');
    const abilities = (combatant.abilities ? Object.entries(combatant.abilities).map(([k,v]) => v === true ? k : `${k}:${v}`).join(', ') : '');

    return `
        <h3 class="font-semibold text-lg mb-2 text-white">${isEditing ? `Editing ${name}` : 'Add Combatant'}</h3>
        <input type="hidden" id="id-${prefix}" value="${combatant.id || ''}">
        
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
            <textarea id="attacks-${prefix}" rows="6" placeholder="One action per line, properties separated by comma. e.g.&#10;name:Longsword, toHit:5, damage:1d8+3, type:slashing, heavy:true&#10;name:Fireball, spell:3, save:15/dex, damage:8d6, type:fire" class="form-input w-full font-mono text-sm">${attacks}</textarea>
        </div>

        <div id="tab-${prefix}-abilities" class="tab-content">
            <textarea id="abilities-${prefix}" rows="4" placeholder="Comma separated keywords. e.g.&#10;pack_tactics, divine_smite" class="form-input w-full font-mono text-sm">${abilities}</textarea>
        </div>

        <div class="flex gap-4 mt-4">
            <button data-action="commit" data-team="${team}" class="btn ${team === 'A' ? 'btn-primary' : 'btn-danger'} flex-grow">${isEditing ? 'Update Combatant' : 'Add to Team'}</button>
            ${isEditing ? `<button data-action="cancel-edit" data-team="${team}" class="btn btn-secondary">Cancel</button>` : ''}
        </div>
    `;
}

function switchTab(prefix, tabName) {
    document.querySelectorAll(`#editor-${prefix} .tab`).forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`#editor-${prefix} .tab-content`).forEach(c => c.classList.remove('active'));
    document.querySelector(`#editor-${prefix} button[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${prefix}-${tabName}`).classList.add('active');
}

function renderEditor(team) {
    document.getElementById(`editor-${team.toLowerCase()}`).innerHTML = getEditorHTML(team);
}

function handleCommit(team) {
    const prefix = team.toLowerCase();
    const id = document.getElementById(`id-${prefix}`).value;

    if (id) {
        const updatedCombatant = readCombatantFromForm(team, id);
        appState.updateCombatant(team, updatedCombatant);
        appState.clearEditingCombatant(team);
        renderEditor(team); // Re-render editor to clear it and show 'Add' form
    } else {
        const count = parseInt(document.getElementById(`count-${prefix}`).value) || 1;
        for (let i = 0; i < count; i++) {
            const newCombatant = readCombatantFromForm(team);
            if (count > 1) newCombatant.name += ` ${i + 1}`;
            appState.addCombatant(team, newCombatant);
        }
    }
    renderTeams();
}

function editCombatant(team, id) {
    appState.setEditingCombatant(team, id);
    renderEditor(team);
}

function cancelEdit(team) {
    appState.clearEditingCombatant(team);
    renderEditor(team);
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
    const abilities = c.abilities ? Object.keys(c.abilities).join(', ') : 'None';
    return `
        <div class="bg-gray-700 p-3 rounded-md flex justify-between items-center">
            <div>
                <p class="font-bold text-white">${c.name} <span class="text-xs text-gray-400">(${c.size})</span></p>
                <p class="text-sm text-gray-300">HP: ${c.hp}, AC: ${c.ac}, Init: ${c.initiative_mod >= 0 ? '+' : ''}${c.initiative_mod}</p>
                <p class="text-xs text-gray-400">Abilities: ${abilities}</p>
            </div>
            <div class="flex gap-1">
                <button data-action="move-combatant" data-team="${team}" data-id="${c.id}" data-direction="-1" class="btn btn-secondary p-1 text-xs">▲</button>
                <button data-action="move-combatant" data-team="${team}" data-id="${c.id}" data-direction="1" class="btn btn-secondary p-1 text-xs">▼</button>
                <button data-action="edit-combatant" data-team="${team}" data-id="${c.id}" class="btn btn-secondary p-1 text-xs">Edit</button>
                <button data-action="remove-combatant" data-team="${team}" data-id="${c.id}" class="btn btn-danger p-1 text-xs">&times;</button>
            </div>
        </div>`;
}