# Motion & Animation Skill

## Purpose
This skill guides Claude to incorporate purposeful animations and micro-interactions that add polish and delight to frontends, moving beyond static designs.

## Core Philosophy
Motion adds life to interfaces. Well-orchestrated animations create moments of delight and improve user experience by providing feedback, guiding attention, and smoothing transitions.

## Implementation Priorities

### 1. CSS-First Approach
Prioritize CSS-only solutions for HTML artifacts:
- More performant
- Easier to maintain
- Works without JavaScript dependencies
- Smaller file sizes

### 2. Motion Library for React
When building React components, use animation libraries:
- Framer Motion (preferred)
- React Spring
- GSAP (for complex sequences)

### 3. High-Impact Moments
Focus on impactful, orchestrated animations rather than scattered effects:
- **One well-orchestrated page load** with staggered reveals creates more delight than scattered micro-interactions
- Use `animation-delay` to create sequential reveals
- Coordinate multiple elements for cohesive motion

## Animation Patterns

### Page Load Animations
```css
.fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

.fade-in-up:nth-child(1) { animation-delay: 0.1s; }
.fade-in-up:nth-child(2) { animation-delay: 0.2s; }
.fade-in-up:nth-child(3) { animation-delay: 0.3s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Micro-interactions
- Hover states with smooth transitions
- Button click feedback
- Form input focus animations
- Loading states and spinners
- Toast notifications

### Scroll Animations
- Parallax effects
- Reveal on scroll
- Sticky elements with smooth transitions
- Progress indicators

## Best Practices

### Timing Functions
- `ease-out`: For entrances and appearing elements
- `ease-in`: For exits and disappearing elements
- `ease-in-out`: For elements moving from one state to another
- Custom cubic-bezier for distinctive motion

### Duration Guidelines
- Micro-interactions: 150-300ms
- Transitions: 300-500ms
- Page load animations: 500-800ms
- Complex sequences: 800-1200ms

### Performance Considerations
- Animate `transform` and `opacity` for best performance
- Avoid animating layout properties (width, height, top, left)
- Use `will-change` sparingly for complex animations
- Test on lower-end devices

## Anti-Patterns to Avoid
- Over-animation (everything moving at once)
- Slow animations that delay user interaction
- Animations that interfere with accessibility
- Gratuitous effects without purpose
- Inconsistent animation timing across the interface

## Accessibility

Always consider users who prefer reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Usage Instructions

When adding motion to frontends:
1. Start with one high-impact orchestrated sequence (typically page load)
2. Use CSS animations for HTML artifacts
3. Add purposeful micro-interactions on interactive elements
4. Implement motion libraries for complex React animations
5. Test with `prefers-reduced-motion` to ensure accessibility
6. Focus on smooth, polished execution rather than quantity of animations
