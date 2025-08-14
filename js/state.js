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

    reset() {
        this.teamA = [];
        this.teamB = [];
        this.clearEditorState();
    }
}

// Export a single instance to be used throughout the app
const appState = new AppState();