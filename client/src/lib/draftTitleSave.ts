export function getDraftTitleSaveState(value: string, currentTitle: string) {
  const title = value.trim();
  return {
    title,
    canSave: title.length > 0 && title !== currentTitle,
  };
}
