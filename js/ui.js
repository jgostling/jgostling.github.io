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
    const attacks = (data.attacks || []).map(a => stringifyAction(a)).join('\n');
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
            <textarea id="attacks-${prefix}" rows="6" placeholder="One action per line, properties separated by comma. e.g.&#10;name:Longsword, toHit:5, damage:1d8+3, type:slashing, heavy:true&#10;name:Fireball, spell:3, save:15/dex, damage:8d6, type:fire" class="form-input w-full font-mono text-sm">${attacks}</textarea>
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
    appState.clearEditorState();
    document.getElementById('editor-modal-overlay').classList.add('hidden');
    document.getElementById('editor-modal').classList.add('hidden');
    document.getElementById('editor-modal-content').innerHTML = ''; // Clear content for next use
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