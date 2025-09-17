// js/main.js

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

function closeAllTooltips() {
    document.querySelectorAll('.tooltip-box.active').forEach(box => {
        box.classList.remove('active');
        // Clean up any inline styles that were added for positioning
        box.style.top = '';
        box.style.left = '';
        box.style.right = '';
        box.style.transform = '';
    });
}

function handleDelegatedClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const { action, team, id, direction, tab, index, key, type } = target.dataset;

    switch (action) {
        case 'run-simulations':
            runBatchSimulations();
            break;
        case 'reset-all':
            resetAll();
            break;
        case 'switch-tab':
            switchEditorTab(tab);
            break;
        case 'commit':
            handleCommit();
            break;
        case 'cancel-edit':
            closeEditorDrawer();
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
            openEditorDrawer(team, null);
            break;
        case 'configure-selected-ability':
            configureSelectedAbility();
            break;
        case 'cancel-ability-config':
            renderMainEditorInDrawer(); // This was already correct, but confirming.
            break;
        case 'commit-ability':
            commitAbility(key);
            break;
        case 'remove-ability':
            removeAbilityFromEditor(key);
            break;
        case 'open-action-editor':
            renderActionEditorInDrawer();
            break;
        case 'edit-action':
            renderActionEditorInDrawer(index);
            break;
        case 'select-action-type':
            selectActionType(type);
            break;
        case 'remove-action':
            removeActionFromEditor(index);
            break;
        case 'cancel-action-edit':
            cancelActionEditor(); // This is for the sub-editor's cancel button.
            break;
        case 'commit-action':
            commitAction();
            break;
        case 'back-to-main-editor':
            renderMainEditorInDrawer();
            break;
        case 'toggle-accordion': {
            const clickedItem = target.closest('.accordion-item');
            const wasActive = clickedItem.classList.contains('active');

            // This logic allows only one accordion to be open at a time within a given modal.
            // It finds all siblings and closes them.
            const allItems = clickedItem.parentElement.querySelectorAll('.accordion-item');
            allItems.forEach(item => item.classList.remove('active'));

            // If the clicked item was not already active, open it.
            if (!wasActive) {
                clickedItem.classList.add('active');
            }
            break;
        }
        case 'toggle-tooltip': {
            const container = target.closest('.tooltip-container');
            if (container) {
                const box = container.querySelector('.tooltip-box');
                const wasActive = box.classList.contains('active');

                // Close all tooltips first (this also cleans them up)
                closeAllTooltips();

                // If it wasn't active before, open it and position it
                if (!wasActive) {
                    box.classList.add('active');

                    // With position:fixed, we must manually calculate the position relative to the viewport.
                    const iconRect = target.getBoundingClientRect();
                    const boxRect = box.getBoundingClientRect(); // Get dimensions of the now-visible box
                    const viewportWidth = window.innerWidth;
                    const PADDING = 8;

                    // Position vertically: 6px above the icon
                    box.style.top = `${iconRect.top - boxRect.height - 6}px`;

                    // Position horizontally: centered on the icon, but constrained by the viewport
                    let left = iconRect.left + (iconRect.width / 2) - (boxRect.width / 2);
                    if (left < PADDING) {
                        left = PADDING;
                    } else if (left + boxRect.width > viewportWidth - PADDING) {
                        left = viewportWidth - boxRect.width - PADDING;
                    }
                    box.style.left = `${left}px`;
                }
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
    document.body.addEventListener('click', handleDelegatedClick);

    // Create and configure hidden file inputs for testability and functionality.
    ['A', 'B'].forEach(team => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        input.setAttribute('data-cy', `load-team-input-${team}`);
        document.body.appendChild(input);

        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const combatants = JSON.parse(event.target.result);
                    appState.setTeam(team, combatants);
                    renderTeams();
                } catch (err) {
                    alert('Error parsing JSON file. Please ensure it is correctly formatted.');
                    console.error('JSON parsing error:', err);
                }
            };
            reader.readAsText(file);
            // Reset the input value to allow loading the same file again
            e.target.value = '';
        });
    })

    // Add a global click listener to close tooltips when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-action="toggle-tooltip"]')) {
            closeAllTooltips();
        }
    });

    renderTeams();
}

window.addEventListener('load', initializeApp);