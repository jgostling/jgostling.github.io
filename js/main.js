// js/main.js

const sizeOrder = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

function runBatchSimulations() {
    const runButton = document.getElementById('run-button');
    runButton.disabled = true;
    runButton.textContent = 'Simulating...';
    
    setTimeout(() => {
        const count = parseInt(document.getElementById('simulation-count').value) || 1;
        const logEl = document.getElementById('simulation-log');
        const summaryEl = document.getElementById('simulation-summary');
        
        logEl.innerHTML = '';
        summaryEl.innerHTML = '<p>Running simulations...</p>';

        const { teamA, teamB } = appState.getTeams();

        if (teamA.length === 0 || teamB.length === 0) {
            alert("Both teams must have at least one combatant.");
            runButton.disabled = false;
            runButton.textContent = 'Run Simulations';
            return;
        }

        let winsA = 0, winsB = 0, draws = 0;
        for (let i = 0; i < count; i++) {
            const winner = runSingleSimulation(teamA, teamB, i === count - 1);
            if (winner === 'A') winsA++;
            else if (winner === 'B') winsB++;
            else draws++;
        }

        logEl.scrollTop = 0;

        summaryEl.innerHTML = `
            <p class="flex justify-between"><span class="font-bold text-blue-400">Team A Wins:</span> <span>${winsA} (${((winsA / count) * 100).toFixed(1)}%)</span></p>
            <p class="flex justify-between"><span class="font-bold text-red-400">Team B Wins:</span> <span>${winsB} (${((winsB / count) * 100).toFixed(1)}%)</span></p>
            <p class="flex justify-between"><span class="font-bold text-gray-400">Draws:</span> <span>${draws} (${((draws / count) * 100).toFixed(1)}%)</span></p>
        `;

        runButton.disabled = false;
        runButton.textContent = 'Run Simulations';
    }, 10);
}

function resetAll() {
    if (confirm("Are you sure you want to clear all teams and logs?")) {
        appState.reset();
        document.getElementById('simulation-log').innerHTML = '<p class="text-gray-500">Log appears here.</p>';
        document.getElementById('simulation-summary').innerHTML = '<p>Summary appears here.</p>';
        renderTeams();
    }
}

function handleDelegatedClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const { action, team, id, direction, tab, index, key } = target.dataset;

    switch (action) {
        case 'switch-tab':
            switchTab(team, tab);
            break;
        case 'commit':
            handleCommit();
            break;
        case 'cancel-edit':
            cancelEdit();
            break;
        case 'move-combatant':
            moveCombatant(team, id, parseInt(direction));
            break;
        case 'edit-combatant':
            editCombatant(team, id);
            break;
        case 'copy-combatant':
            copyCombatant(team, id);
            break;
        case 'remove-combatant':
            removeCombatant(team, id);
            break;
        case 'open-add-editor':
            openEditorModal(team);
            break;
        case 'configure-selected-ability':
            configureSelectedAbility();
            break;
        case 'cancel-ability-config':
            closeAbilityEditorModal();
            break;
        case 'commit-ability':
            commitAbility(key);
            break;
        case 'remove-ability':
            removeAbilityFromEditor(key);
            break;
        case 'open-action-editor':
            openActionEditorModal();
            break;
        case 'edit-action':
            openActionEditorModal(index);
            break;
        case 'remove-action':
            removeActionFromEditor(index);
            break;
        case 'cancel-action-edit':
            closeActionEditorModal();
            break;
        case 'commit-action':
            commitAction();
            break;
        case 'toggle-accordion': {
            const clickedItem = target.closest('.accordion-item');
            const wasActive = clickedItem.classList.contains('active');

            // Close all accordion items within the same modal
            const allItems = document.querySelectorAll('#action-editor-modal .accordion-item');
            allItems.forEach(item => item.classList.remove('active'));

            // If the clicked item was not already active, open it.
            // This ensures only one is open at a time.
            if (!wasActive) {
                clickedItem.classList.add('active');
            }
            break;
        }
        case 'save-team':
            saveTeam(team);
            break;
        case 'load-team':
            loadTeam(team);
            break;
    }
}

function initializeApp() {
    document.getElementById('run-button').addEventListener('click', runBatchSimulations);
    document.getElementById('reset-button').addEventListener('click', resetAll);
    document.body.addEventListener('click', handleDelegatedClick);

    renderTeams();
}

window.addEventListener('load', initializeApp);