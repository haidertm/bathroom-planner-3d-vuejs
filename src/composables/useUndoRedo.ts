import { ref, computed } from 'vue'

export function useUndoRedo() {
  const history = ref([])
  const currentIndex = ref(-1)
  const maxHistorySize = 50

  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)

  const saveToHistory = (state) => {
    // Remove any future history if we're not at the end
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // Add new state
    history.value.push(JSON.parse(JSON.stringify(state)))
    currentIndex.value = history.value.length - 1

    // Limit history size
    if (history.value.length > maxHistorySize) {
      history.value = history.value.slice(1)
      currentIndex.value = history.value.length - 1
    }
  }

  const undo = () => {
    if (canUndo.value) {
      currentIndex.value--
      return JSON.parse(JSON.stringify(history.value[currentIndex.value]))
    }
    return null
  }

  const redo = () => {
    if (canRedo.value) {
      currentIndex.value++
      return JSON.parse(JSON.stringify(history.value[currentIndex.value]))
    }
    return null
  }

  const clearHistory = () => {
    history.value = []
    currentIndex.value = -1
  }

  return {
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  }
}
