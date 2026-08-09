export function compareNumericIds(entryA: { id: string }, entryB: { id: string }): number {
    return Number(entryA.id) - Number(entryB.id);
}
