/**
 * useGsapAnimations — shared GSAP helpers for the employee portal.
 * All animations are SSR-safe (only run on the client).
 */
import { onMounted, type Ref } from 'vue'

export function useGsapAnimations() {
  const animatePageEnter = (containerRef: Ref<HTMLElement | null>) => {
    if (!import.meta.client) return
    onMounted(async () => {
      const { gsap } = await import('gsap')
      if (!containerRef.value) return
      const children = containerRef.value.querySelectorAll('[data-animate]')
      gsap.fromTo(
        children,
        { opacity: 0, y: 18, filter: 'blur(4px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.5,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'filter',
        }
      )
    })
  }

  const animateCards = async (selector: string | HTMLElement | NodeList, delay = 0) => {
    if (!import.meta.client) return
    const { gsap } = await import('gsap')
    gsap.fromTo(
      selector,
      { opacity: 0, y: 20, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        stagger: 0.06,
        delay,
        ease: 'power2.out',
      }
    )
  }

  const animateCountUp = async (el: HTMLElement, from: number, to: number) => {
    if (!import.meta.client) return
    const { gsap } = await import('gsap')
    const obj = { val: from }
    gsap.to(obj, {
      val: to,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate() {
        el.textContent = Math.round(obj.val).toString()
      },
    })
  }

  const animateSlideInLeft = async (el: HTMLElement | null, delay = 0) => {
    if (!import.meta.client || !el) return
    const { gsap } = await import('gsap')
    gsap.fromTo(
      el,
      { opacity: 0, x: -24 },
      { opacity: 1, x: 0, duration: 0.4, delay, ease: 'power2.out' }
    )
  }

  const animateFadeIn = async (el: HTMLElement | null, delay = 0) => {
    if (!import.meta.client || !el) return
    const { gsap } = await import('gsap')
    gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, delay, ease: 'power1.out' }
    )
  }

  const animateStaggerRows = async (selector: string, parent?: HTMLElement) => {
    if (!import.meta.client) return
    const { gsap } = await import('gsap')
    const ctx = parent ?? document
    const els = ctx.querySelectorAll(selector)
    gsap.fromTo(
      els,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
    )
  }

  return {
    animatePageEnter,
    animateCards,
    animateCountUp,
    animateSlideInLeft,
    animateFadeIn,
    animateStaggerRows,
  }
}
