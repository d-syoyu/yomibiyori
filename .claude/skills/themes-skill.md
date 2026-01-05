# Themes Skill

## Purpose
This skill guides Claude to design with cohesive, well-defined aesthetic themes that create distinctive visual identities, leveraging Claude's rich understanding of popular design themes and aesthetics.

## Core Concept
Claude has strong understanding of various design themes and aesthetics. By prompting for specific themes, we can communicate the exact aesthetic vision for a frontend without manually specifying every design detail.

## Theme Categories

### Fantasy/RPG Aesthetic
- Fantasy-inspired color palettes with rich, dramatic tones
- Ornate borders and decorative frame elements
- Parchment textures, leather-bound styling, and weathered materials
- Epic, adventurous atmosphere with dramatic lighting
- Medieval-inspired serif typography with embellished headers

### Modern/Minimalist
- Clean lines and ample white space
- Monochromatic or limited color palettes
- Sans-serif typography with strong hierarchy
- Focus on functionality and clarity
- Subtle shadows and depth cues

### Cyberpunk/Futuristic
- Neon accents on dark backgrounds
- Glitch effects and digital artifacts
- Monospace and technical fonts
- High contrast and bold colors
- Grid patterns and geometric elements

### Nature/Organic
- Earth tones and natural color palettes
- Flowing, curved shapes
- Textured backgrounds reminiscent of natural materials
- Handwritten or organic typography
- Soft shadows and gentle transitions

## Implementation Guidelines

### Color & Theme Consistency
- Commit to a cohesive aesthetic throughout the entire design
- Use CSS variables for color consistency
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes
- Draw inspiration from IDE themes and cultural aesthetics

### Theme Selection Strategy
1. Understand the project context and target audience
2. Choose a theme that aligns with the content and purpose
3. Apply the theme consistently across all design elements
4. Avoid mixing conflicting aesthetic approaches

### CSS Variable Structure
```css
:root {
  --primary-color: #...;
  --secondary-color: #...;
  --accent-color: #...;
  --background-color: #...;
  --text-color: #...;
}
```

## Anti-Patterns to Avoid
- Generic purple gradients on white backgrounds
- Timid, evenly-distributed color palettes
- Lack of commitment to a specific aesthetic direction
- Mixing incompatible themes (e.g., cyberpunk + pastoral)

## Usage Instructions

When building themed frontends:
1. Identify the appropriate theme for the project context
2. Establish CSS variables for theme consistency
3. Apply theme principles across typography, color, layout, and interactive elements
4. Ensure all design decisions support the chosen theme
5. Be bold and distinctive rather than safe and generic
