# Floating Viewers Widget - Features & Improvements

## ✅ Latest Updates

### 1. **Fixed Sticky Preview** 
- The Live Preview panel now stays visible while you scroll through settings
- Updated `top` positioning from `16px` to `64px` to account for the Shopify admin header
- Added helpful description text below the heading

### 2. **Z-Index Control (NEW!)** ⭐
- Added a new slider in the Design section: **Z-index (stacking order)**
- Range: 1 to 99,999 (default: 9,999)
- Step: 100 for easy adjustment
- **Use case**: If your cart drawer or other overlays cover the widget, increase the z-index to make it appear on top
- The setting is saved to metafields and applied on the storefront

### 3. **Visual Product Picker (NEW!)** ⭐
- Replaced the manual "Exclude product handles" text input with a visual product selector
- Click **"Choose products to exclude"** button to open the Shopify product picker
- Select multiple products at once
- See a list of excluded products with their handles
- Remove individual products with the ✕ button
- Both product handles AND product IDs are saved (for better accuracy)

### 4. **UX Polish Improvements** ⭐
- **Reset to Defaults** button in the page header (destructive action with confirmation)
- **Validation feedback**: Shows a warning if minimum count > maximum count
- **Better help text**: 
  - Enable widget checkbox now explains it controls the entire store
  - Update interval field suggests minimum 1000ms
  - Z-index explains stacking order with cart drawer example
- **Live preview description**: "This preview updates in real-time as you change settings"
- Improved input constraints (min values on number fields)

## Full Feature List

### Admin UI
- ✅ Beautiful Polaris design system components
- ✅ Side-by-side layout: Settings on left, Live Preview on right
- ✅ Sticky preview that follows scroll
- ✅ Real-time preview updates
- ✅ Quick preset buttons (Bold Pill, Glassy, Minimal)
- ✅ Emoji picker grid (16 popular emojis)
- ✅ Visual product picker for exclusions
- ✅ Reset to defaults button
- ✅ Input validation and warnings

### Widget Behavior
- ✅ Enable/disable toggle
- ✅ Custom message template with `{{count}}` placeholder
- ✅ Position control (4 corners)
- ✅ Random count range (min/max)
- ✅ Update interval configuration
- ✅ Mobile visibility toggle

### Design Options
- ✅ Background & text colors (hex input with # prefix)
- ✅ 3 style variants (Pill, Card, Glass)
- ✅ Border radius slider (0-50px)
- ✅ Font size slider (10-24px)
- ✅ Padding X & Y sliders (0-64px each)
- ✅ Opacity slider (0-100%)
- ✅ Drop shadow toggle
- ✅ Backdrop blur toggle (glass effect)
- ✅ Border width & color
- ✅ **Z-index control (1-99,999)** ⭐

### Icon Options
- ✅ Emoji with visual picker grid
- ✅ Custom image URL
- ✅ None (text only)

### Visibility Rules
- ✅ Show/hide on page types (Home, Product, Collection, Cart)
- ✅ **Visual product picker for exclusions** ⭐
- ✅ Exclude by product tags (comma-separated)

## How to Use

### Setting the Z-Index
1. Go to the **Design** section
2. Find the **Z-index (stacking order)** slider at the bottom
3. Default is 9,999 - increase if the widget appears behind cart drawers or modals
4. Common values:
   - 9,999: Default (above most content)
   - 50,000: Above most overlays
   - 99,999: Maximum (above everything)

### Excluding Products Visually
1. Go to the **Visibility** section
2. Click **"Choose products to exclude"**
3. Search and select products from the Shopify picker
4. Selected products appear as chips below the button
5. Click the ✕ on any chip to remove it from exclusions
6. Save settings to apply

### Enabling the Widget on Your Store
1. Save your settings in the admin
2. Go to **Online Store > Themes > Customize**
3. Navigate to **Theme Settings > App embeds** (bottom left)
4. Enable **"Floating Viewers (Embed)"**
5. Save your theme

## Technical Details

### Settings Storage
- All settings stored in Shop metafields: `floating_proof.widget_settings`
- Type: JSON
- No external database required

### Storefront Implementation
- Theme app extension (automatically injected)
- Vanilla JavaScript (no dependencies)
- Reads settings from metafields
- Respects all visibility and exclusion rules
- Applies z-index from settings

### Performance
- Lightweight widget (~5KB JavaScript)
- No external API calls
- Efficient DOM updates
- Mobile-optimized

## Browser Support
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design

## Next Steps (Optional Ideas)
- Add animation options (slide, fade, bounce)
- Add custom position offsets (distance from edges)
- Add color picker component (visual color selection)
- Add A/B testing support
- Add analytics tracking
