# How to Add a New Logo

## Steps to Replace the Logo

1. **Prepare your logo file:**
   - Format: PNG, SVG, or JPG
   - Recommended size: 400x100 pixels (or similar aspect ratio)
   - Name it: `logo.png` (or `logo.svg`, `logo.jpg`)

2. **Place the logo file:**
   - Copy your logo file to the `public` folder in the project root
   - The path should be: `public/logo.png` (or your chosen filename)
   - **Important:** If you're replacing the existing `thinkdigital-logo.png`, you can either:
     - Delete `public/thinkdigital-logo.png` and add your new logo as `logo.png`
     - Or replace `public/thinkdigital-logo.png` directly with your new logo file (keep the same name)

3. **Update the Logo component:**
   - Open `app/components/Logo.tsx`
   - Find the line that says: `src="/thinkdigital-logo.png"`
   - Change it to: `src="/logo.png"` (or your filename, or keep `/thinkdigital-logo.png` if you replaced that file)
   - Update the `alt` text if needed

4. **Example:**
   ```tsx
   <Image
     src="/logo.png"  // Change this to your logo filename
     alt="Company Logo"  // Update this to your company name
     width={width}
     height={height}
     className={className}
     priority
     unoptimized
   />
   ```

5. **Clear Next.js cache (if logo doesn't update):**
   - Delete the `.next` folder
   - Restart your development server (`yarn dev`)

6. **Test the logo:**
   - Restart your development server (`yarn dev`)
   - Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Check that the logo appears on:
     - Login page
     - Dashboard page
     - Admin page
     - All other pages

## Current Logo Location

The logo currently uses: `/thinkdigital-logo.png` in the `public` folder.

## Quick Method (Replace existing logo)

**Easiest way:** Simply replace the file `public/thinkdigital-logo.png` with your new logo file (keeping the same filename). No code changes needed!

## Logo Sizing

The Logo component accepts `width` and `height` props:
- Default: `width={180}` and `height={40}`
- You can adjust these when using the component:
  ```tsx
  <Logo width={200} height={50} />
  ```

## Notes

- The logo appears on all pages automatically
- The logo is clickable on dashboard and admin pages (links to dashboard)
- Make sure your logo file is optimized for web (not too large file size)
- If the logo doesn't update after replacing the file, clear browser cache and restart the dev server

