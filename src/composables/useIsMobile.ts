import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable for reactive mobile detection with window resize handling.
 * Provides a single source of truth for mobile state across components.
 *
 * @param breakpoint - The width breakpoint in pixels (default: 768)
 * @returns A reactive ref that updates on window resize
 */
export function useIsMobile(breakpoint: number = 768) {
  const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false)

  const checkIsMobile = () => {
    isMobile.value = window.innerWidth <= breakpoint
  }

  onMounted(() => {
    // Initial check in case SSR value differs
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkIsMobile)
  })

  return isMobile
}
