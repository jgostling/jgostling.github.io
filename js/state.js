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
    }

    getTeams() {
        return { teamA: this.teamA, teamB: this.teamB };
    }

    getEditorState() {
        return this.editorState;
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
        this.editorState = { combatant: null, team: team, isEditing: false };
    }

    setTeam(team, combatants) {
        if (!Array.isArray(combatants)) {
            alert("Failed to load team: The provided file is not a valid team format.");
            console.error("Invalid data format for loading team: not an array.", combatants);
            return;
        }
        // Validate and enrich each combatant from the loaded file.
        const processedCombatants = combatants.map(c => {
            if (!c.name || !c.hp || !c.ac) return null;
            // Ensure maxHp is set, which is done on creation but might be missing from a file.
            c.maxHp = c.maxHp || c.hp;
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

    clearEditorState() {
        this.editorState = { combatant: null, team: null, isEditing: false };
    }

    reset() {
        this.teamA = [];
        this.teamB = [];
        this.clearEditorState();
    }
}

// Export a single instance to be used throughout the app
const appState = new AppState();