# Responsive Design Guide

## Breakpoints (Tailwind)
- **Mobile (xs-sm)**: < 640px
- **Tablet (md-lg)**: 640px - 1024px  
- **Desktop (xl+)**: > 1024px

## Header Responsive Behavior

### Mobile (< 640px)
- Header height: `h-14` (56px)
- Logo: `text-xl`
- Menu button: Visible
- Navigation: Hidden
- Theme/Language: Hidden in header, moved to mobile menu
- Mobile menu dropdown shows:
  - Navigation links
  - Theme toggle
  - Language switcher

### Tablet (640px - 1024px) 
- Header height: `h-16` (64px)
- Logo: `text-2xl`
- Menu button: Visible
- Navigation: Hidden
- Theme/Language: Visible in header
- Icons: Responsive sizing

### Desktop (> 1024px)
- Header height: `h-16` (64px)
- Logo: `text-2xl`
- Menu button: Hidden
- Navigation: Fully visible (lg:flex)
- Theme/Language: Visible in header
- Full layout displayed

## Components

### Icons Sizing
- Mobile: `w-4 h-4`
- Tablet+: `w-5 h-5`

### Padding & Gaps
- Mobile: `px-2 gap-1` (compact)
- Tablet+: `px-4 gap-2` (spacious)

### Theme Toggle
- Visible on screens sm and above
- On mobile: Available in menu dropdown

### Language Switcher
- Visible on screens sm and above
- On mobile: Available in menu dropdown
- Responsive text sizing

## Testing
1. **Mobile**: Test at 375px width (iPhone)
2. **Tablet**: Test at 768px width (iPad)
3. **Desktop**: Test at 1920px width (Full screen)
4. Use Chrome DevTools → Toggle device toolbar for testing
