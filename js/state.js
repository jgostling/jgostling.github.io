// js/state.js

class AppState {
    constructor() {
        this.teamA = [];
        this.teamB = [];
        this.editingCombatant = { A: null, B: null };
    }

    getTeams() {
        return { teamA: this.teamA, teamB: this.teamB };
    }

    getEditingCombatant(team) {
        return this.editingCombatant[team];
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

    setEditingCombatant(team, id) {
        const teamArr = team === 'A' ? this.teamA : this.teamB;
        const combatant = teamArr.find(c => c.id === id);
        if (combatant) {
            this.editingCombatant[team] = deepCopy(combatant);
        }
    }

    clearEditingCombatant(team) {
        this.editingCombatant[team] = null;
    }

    reset() {
        this.teamA = [];
        this.teamB = [];
        this.editingCombatant = { A: null, B: null };
    }
}

// Export a single instance to be used throughout the app
const appState = new AppState();