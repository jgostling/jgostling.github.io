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
        // If the tooltip was moved to the body, move it back to its original container.
        if (box._originalParent) {
            box._originalParent.appendChild(box);
            // Clean up the temporary property.
            delete box._originalParent;
        }
    });
}

function _updateRelativeToCasterVisibility(scope = document) {
    const durationContainer = scope.querySelector('[id^="duration-components-container"]');
    if (!durationContainer) return;

    const relativeContainer = scope.querySelector('[data-cy="relative-to-caster-container"]');
    if (relativeContainer) {
        const allUnitSelects = durationContainer.querySelectorAll('.duration-unit');
        const shouldShow = Array.from(allUnitSelects).some(select => select.value === 'turnEnds' || select.value === 'rounds');
        relativeContainer.style.display = shouldShow ? '' : 'none';
    }
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
        case 'open-library-modal':
            openLibraryDrawer(team);
            break;
        case 'close-library-modal':
            closeLibraryDrawer();
            break;
        case 'add-from-library': {
            const monsterName = target.dataset.monsterName;
            appState.addCombatantFromLibrary(monsterName);
            renderTeams();
            applyLibraryFilters(); // Re-render the library to show the new count.
            break;
        }
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
        case 'edit-ability':
            renderAbilityConfigScreen(key);
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
            // Determine which tab was active before entering the sub-editor.
            const previousAccordionId = document.getElementById('ability-config-value') ? 'abilities' : 'actions';
            renderMainEditorInDrawer({ activeAccordionId: previousAccordionId });
            break;
        case 'add-duration-component': {
            handleAddDurationComponent(target);
            break;
        }
        case 'add-on-hit-effect': {
            handleAddOnHitEffect();
            break;
        }
        case 'add-graduated-effect': { // This now adds a whole rule card
            handleAddGraduatedEffect(target);
            break;
        }
        case 'add-targeted-effect-condition': {
            handleAddTargetedEffectCondition();
            break;
        }
        case 'remove-graduated-rule':
            handleRemoveGraduatedRule(target);
            break;
        case 'add-nested-effect': {
            handleAddNestedEffect(target);
            break;
        }
        case 'remove-nested-effect':
            handleRemoveNestedEffect(target);
            break;
        case 'remove-on-hit-effect':
            handleRemoveOnHitEffect(target);
            break;
        case 'remove-duration-component':
            handleRemoveDurationComponent(target);
            break;
        case 'toggle-accordion': {
            const clickedItem = target.closest('.accordion-item');
            const wasActive = clickedItem.classList.contains('active');

            // Try to find a broad form container first. If not found, fall back to the immediate parent.
            // This makes the logic robust for both the complex editor UI and simple unit test DOMs.
            let formContainer = target.closest('.flex-grow.overflow-y-auto');
            if (!formContainer) {
                formContainer = clickedItem.parentElement;
            }
            const allItems = formContainer.querySelectorAll('.accordion-item');
            allItems.forEach(item => item.classList.remove('active'));

            // If the clicked item was not already active, open it.
            if (!wasActive) {
                clickedItem.classList.add('active');
            }
            break;
        }
        case 'toggle-tooltip': {
            // Stop the event from bubbling up to the document's click listener,
            // which would immediately re-open the tooltip we are about to close.
            event.stopPropagation();

            const tooltipId = target.dataset.tooltipId;
            if (tooltipId) {
                const box = document.getElementById(tooltipId);
                if (!box) return;

                const wasActive = box.classList.contains('active');

                // Close all tooltips first (this also cleans them up)
                closeAllTooltips();

                // If it wasn't active before, move it to the body, open it, and position it
                if (!wasActive) {
                    const container = target.closest('.tooltip-container');
                    // Store the original parent so we can return it later.
                    box._originalParent = container;
                    document.body.appendChild(box);
                    box.classList.add('active');

                    // With position:fixed, we must manually calculate the position relative to the viewport.
                    const iconRect = target.getBoundingClientRect();
                    const boxRect = box.getBoundingClientRect(); // Get dimensions of the now-visible box
                    const viewportWidth = window.innerWidth;
                    const PADDING = 8;

                    // Position vertically: 6px above the icon
                    box.style.top = `${iconRect.top - boxRect.height - 6}px`;

                    // Position horizontally: centered on the icon, but constrained by the viewport edges
                    let left = iconRect.left + (iconRect.width / 2) - (boxRect.width / 2);
                    if (left < PADDING) left = PADDING;
                    if (left + boxRect.width > viewportWidth - PADDING) left = viewportWidth - boxRect.width - PADDING;
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

function handleDelegatedChange(event) {
    const target = event.target;

    // When the user selects a different condition in the effect editor,
    // we need to re-render the form to show/hide the resistance type selector.
    if (target.id === 'action-editor-effect-name' || target.classList.contains('action-editor-onhit-effect-name') || target.classList.contains('targeted-effect-condition-name')) {
        // Find the parent form of the select element that changed.
        const parentForm = target.closest('.on-hit-effect-form, .accordion-content, .targeted-effect-condition-row');
        if (!parentForm) return;

        // Find the container for extra config within that specific form.
        let extraConfigContainer = parentForm.querySelector('[data-cy="extra-config-container"]');
        if (!extraConfigContainer) {
            // If it doesn't exist, create it right after the select element.
            extraConfigContainer = document.createElement('div');
            extraConfigContainer.setAttribute('data-cy', 'extra-config-container');
            target.insertAdjacentElement('afterend', extraConfigContainer);
        }

        // Get the selected condition key.
        const selectedConditionKey = target.value;

        // Generate only the HTML for the extra configuration based on the selected condition.
        const extraConfigHTML = _getExtraConfigHTMLForEffect({ name: selectedConditionKey });

        // Surgically replace only the extra config HTML, leaving the rest of the form untouched.
        extraConfigContainer.innerHTML = extraConfigHTML;
    } else if (target.classList.contains('duration-unit')) {
        // When a duration unit is changed, we need to show/hide the 'relativeTo' checkbox.
        const scope = target.closest('.on-hit-effect-form, .accordion-content, .targeted-effect-condition-row');
        _updateRelativeToCasterVisibility(scope);
    } else if (target.id === 'action-editor-enable-save') {
        const saveFieldsContainer = document.getElementById('save-fields-container');
        if (saveFieldsContainer) {
            saveFieldsContainer.classList.toggle('hidden', !target.checked);
        }
    }
}

function handleDelegatedInput(event) {
    const target = event.target;

    if (target.id === 'library-filter-name') {
        applyLibraryFilters();
    }
}

function initializeApp() {
    document.body.addEventListener('click', handleDelegatedClick);
    document.body.addEventListener('change', handleDelegatedChange);
    document.body.addEventListener('input', handleDelegatedInput);

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