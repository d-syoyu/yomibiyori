# Backgrounds Skill

## Purpose
This skill guides Claude to create atmospheric backgrounds with depth and visual interest, moving beyond flat solid colors that characterize generic AI-generated designs.

## Core Philosophy
Backgrounds create atmosphere and depth. Instead of defaulting to solid colors (especially white or light purple gradients), use layered techniques to establish visual hierarchy and contextual mood.

## Background Techniques

### 1. Layered CSS Gradients
Create depth through multiple overlapping gradients:

```css
.background {
  background:
    linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%),
    linear-gradient(225deg, rgba(0,0,0,0.05) 0%, transparent 50%),
    linear-gradient(to bottom, #1a1a2e, #16213e);
}
```

**Benefits:**
- No external dependencies
- Lightweight and performant
- Infinite design possibilities
- Works on all devices

### 2. Geometric Patterns
Use CSS or SVG patterns for texture:

```css
.pattern-background {
  background-color: #1a1a2e;
  background-image: 
    repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px);
}
```

**Pattern Types:**
- Dots and grids
- Diagonal lines
- Hexagons or other shapes
- Noise textures
- Subtle geometric repeating patterns

### 3. Contextual Effects
Match backgrounds to the overall aesthetic and content:

**For dark themes:**
- Deep gradients with subtle lighter accents
- Ambient glow effects around key elements
- Starfield or particle effects for tech/space themes

**For light themes:**
- Soft, atmospheric gradients
- Paper-like textures
- Organic patterns and natural tones

**For thematic designs:**
- Parchment textures for historical/RPG themes
- Grid overlays for technical/cyberpunk themes
- Watercolor effects for creative/artistic themes

### 4. CSS Backdrop Effects
For overlays and cards:

```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## Implementation Guidelines

### Creating Atmospheric Depth

**Layer Strategy:**
1. Base layer: Primary background color or gradient
2. Middle layer: Pattern or texture
3. Top layer: Subtle lighting effects or vignettes

**Example:**
```css
.atmospheric-bg {
  background: 
    /* Vignette effect */
    radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%),
    /* Noise texture */
    url('data:image/svg+xml,...'),
    /* Base gradient */
    linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460);
}
```

### Color Principles
- Avoid pure white (#ffffff) and pure black (#000000)
- Use color shifts in gradients (e.g., blue to purple, not blue to lighter blue)
- Consider contrast with foreground content
- Match the overall theme and brand

### Performance Optimization
- Use CSS gradients over large background images when possible
- Optimize SVG patterns
- Consider using `background-attachment: fixed` sparingly (can impact performance)
- Test on mobile devices

## Anti-Patterns to Avoid
- Flat solid white backgrounds
- Generic purple-to-pink gradients
- Overly busy patterns that compete with content
- Low contrast that makes text hard to read
- Heavy background images that slow page load

## Contextual Matching

Match background treatment to content type:
- **Landing pages**: Bold, atmospheric gradients
- **Dashboards**: Subtle, professional textures
- **Documentation**: Clean with minimal distraction
- **Creative portfolios**: Distinctive artistic backgrounds
- **E-commerce**: Product-focused with supportive backgrounds

## Usage Instructions

When designing backgrounds:
1. Never default to solid white or generic gradients
2. Start with layered CSS gradients for depth
3. Add geometric patterns or textures for visual interest
4. Ensure backgrounds support rather than compete with content
5. Test readability and contrast
6. Match background treatment to the overall theme and context
7. Optimize for performance across devices
