// js/state.js

class AppState {
    constructor() {
        this.teamA = [];
        this.teamB = [];
        this.editorState = {
            combatant: null, // The combatant object being edited, or null for a new one
            team: null,      // 'A' or 'B'
            isEditing: false // true if updating, false if adding
        };
        this.actionEditorState = {
            action: null, // The action object being edited
            index: -1,    // The index of the action in the combatant's attacks array. -1 for new.
            isNew: true
        };
        this.libraryTargetTeam = null; // 'A' or 'B', the team to add a creature to from the library.
    }

    getTeams() {
        return { teamA: this.teamA, teamB: this.teamB };
    }

    getEditorState() {
        return this.editorState;
    }

    getActionEditorState() {
        return this.actionEditorState;
    }

    getLibraryTargetTeam() {
        return this.libraryTargetTeam;
    }

    setLibraryTargetTeam(team) {
        this.libraryTargetTeam = team;
    }

    addCombatantFromLibrary(monsterName) {
        const team = this.getLibraryTargetTeam();
        if (!team) {
            console.error("Cannot add from library: No target team selected.");
            return;
        }

        const monsterTemplate = MONSTER_LIBRARY_DATA.find(m => m.name === monsterName);
        if (!monsterTemplate) {
            console.error(`Monster with name "${monsterName}" not found in library.`);
            return;
        }

        const newCombatant = deepCopy(monsterTemplate);
        newCombatant.id = `c${Date.now()}${Math.random()}`;
        newCombatant.team = team;

        // Handle numbered names for duplicates
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        const sameNameCombatants = teamArr.filter(c => c.name.startsWith(newCombatant.name));
        if (sameNameCombatants.length > 0) {
            newCombatant.name = `${newCombatant.name} ${sameNameCombatants.length + 1}`;
        }

        this.addCombatant(team, newCombatant);
    }

    openEditorForUpdate(team, id) {
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        const combatant = teamArr.find(c => c.id === id);
        if (combatant) {
            this.editorState = {
                combatant: deepCopy(combatant),
                team: team,
                isEditing: true
            };
        }
    }

    openEditorForAdd(team) {
        this.editorState = {
            combatant: {
                // Provide a blank template to hold data while the editor is open
                attacks: [],
                abilities: {},
                saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                spell_slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
            },
            team: team,
            isEditing: false
        };
    }

    openActionEditorForNew() {
        this.actionEditorState = {
            action: { name: '', action: 'action' }, // A default blank action object
            index: -1,
            isNew: true
        };
    }

    openActionEditorForUpdate(index) {
        const combatant = this.editorState.combatant;
        if (combatant && combatant.attacks[index]) {
            this.actionEditorState = {
                action: deepCopy(combatant.attacks[index]),
                index: parseInt(index),
                isNew: false
            };
        }
    }

    setTeam(team, combatants) {
        if (!Array.isArray(combatants)) {
            alert("Failed to load team: The provided file is not a valid team format.");
            console.error("Invalid data format for loading team: not an array.", combatants);
            return;
        }
        // Validate and enrich each combatant from the loaded file.
        const processedCombatants = combatants.map((c, index) => {
            if (!c.name || !c.hp || !c.ac) return null;
            // Regenerate ID on load to guarantee uniqueness across teams and sessions,
            // preventing event bus and logic errors from duplicate IDs.
            c.id = `c${Date.now()}${Math.random()}${index}`;
            // Ensure maxHp is set, which is done on creation but might be missing from a file.
            c.maxHp = c.maxHp || c.hp;
            c.role = c.role || 'frontline';
            // Recalculate threat for loaded combatants to ensure it's up-to-date with current logic.
            c.threat = calculateThreat(c);
            // Enforce the correct team assignment on load, overriding any value in the file.
            c.team = team;
            return c;
        }).filter(Boolean); // Filter out any combatants that failed validation.

        if (team === 'A') {
            this.teamA = processedCombatants;
        } else {
            this.teamB = processedCombatants;
        }
    }

    addCombatant(team, combatant) {
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        teamArr.push(combatant);
    }

    updateCombatant(team, updatedCombatant) {
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        const index = teamArr.findIndex(c => c.id === updatedCombatant.id);
        if (index !== -1) {
            teamArr[index] = updatedCombatant;
        }
    }

    removeCombatant(team, id) {
        if (team === 'A') {
            this.teamA = this.teamA.filter(c => c.id !== id);
        } else {
            this.teamB = this.teamB.filter(c => c.id !== id);
        }
    }

    moveCombatant(team, id, direction) {
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        const index = teamArr.findIndex(c => c.id === id);
        if (index === -1) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= teamArr.length) return;
        [teamArr[index], teamArr[newIndex]] = [teamArr[newIndex], teamArr[index]];
    }

    copyCombatant(team, id) {
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        const originalIndex = teamArr.findIndex(c => c.id === id);
        if (originalIndex === -1) return;

        const originalCombatant = teamArr[originalIndex];
        const newCombatant = deepCopy(originalCombatant);

        // Assign a new unique ID
        newCombatant.id = `c${Date.now()}${Math.random()}`;

        // Handle name duplication by finding the base name and appending the next available number
        const baseNameMatch = originalCombatant.name.match(/^(.*?)(\s+\d+)?$/);
        const baseName = baseNameMatch ? baseNameMatch[1] : originalCombatant.name;

        const sameBaseNameCombatants = teamArr.filter(c => c.name.startsWith(baseName));
        const existingNumbers = sameBaseNameCombatants.map(c => {
            const nameMatch = c.name.match(/\s+(\d+)$/);
            return nameMatch ? parseInt(nameMatch[1]) : 1;
        });

        const nextNumber = Math.max(0, ...existingNumbers) + 1;
        newCombatant.name = `${baseName} ${nextNumber}`;

        // If the original was the only one and had no number, rename it to "Name 1"
        if (sameBaseNameCombatants.length === 1 && !/\s+\d+$/.test(originalCombatant.name)) {
            originalCombatant.name = `${baseName} 1`;
        }

        // Insert the new combatant right after the original for better UX
        teamArr.splice(originalIndex + 1, 0, newCombatant);
    }

    clearEditorState() {
        this.editorState = { combatant: null, team: null, isEditing: false };
    }

    clearActionEditorState() {
        this.actionEditorState = { action: null, index: -1, isNew: true };
    }

    reset() {
        this.teamA = [];
        this.teamB = [];
        this.clearEditorState();
        this.clearActionEditorState();
        this.libraryTargetTeam = null;
    }
}

// Export a single instance to be used throughout the app
var appState = new AppState();