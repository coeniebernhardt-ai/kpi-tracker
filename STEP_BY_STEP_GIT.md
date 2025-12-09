# Step-by-Step Git Guide: Adding Logo to Repository

## Current Project
- **Location**: `c:\Users\coenie\kpi-tracker`
- **Logo File**: `public\thinkdigital-logo.png` (exists locally ✅)

## Step-by-Step Instructions

### Step 1: Verify You're in the Correct Repository
Open terminal in Cursor and run:
```powershell
cd c:\Users\coenie\kpi-tracker
git remote -v
```

You should see:
```
origin  https://github.com/coeniebernhardt-ai/kpi-tracker.git (fetch)
origin  https://github.com/coeniebernhardt-ai/kpi-tracker.git (push)
```

### Step 2: Check Current Status
```powershell
git status
```

This shows:
- Uncommitted changes
- Untracked files
- Files ready to commit

### Step 3: Check if Logo File is Tracked
```powershell
git ls-files public/thinkdigital-logo.png
```

**If this shows the file path** → File is tracked ✅  
**If this shows nothing** → File is NOT tracked ❌

### Step 4: Add Logo File to Git
If the file is NOT tracked, add it:
```powershell
git add public/thinkdigital-logo.png
```

Or force add if it's being ignored:
```powershell
git add -f public/thinkdigital-logo.png
```

### Step 5: Verify File is Staged
```powershell
git status public/thinkdigital-logo.png
```

You should see:
```
A  public/thinkdigital-logo.png
```
(The "A" means "Added")

### Step 6: Commit the Logo File
```powershell
git commit -m "Add company logo file (thinkdigital-logo.png)"
```

### Step 7: Push to GitHub
```powershell
git push origin main
```

### Step 8: Verify on GitHub
1. Go to: https://github.com/coeniebernhardt-ai/kpi-tracker
2. Navigate to: `public/` folder
3. Look for: `thinkdigital-logo.png`
4. If you see it → Success! ✅
5. If you don't see it → The push didn't work

## Troubleshooting

### If `git add` doesn't work:
The file might be in `.gitignore`. Check:
```powershell
git check-ignore -v public/thinkdigital-logo.png
```

If it shows a pattern, the file is being ignored. Use:
```powershell
git add -f public/thinkdigital-logo.png
```

### If file is too large:
GitHub has a 100MB file limit. Check file size:
```powershell
(Get-Item public\thinkdigital-logo.png).Length / 1MB
```

If > 100MB, you need to compress the image or use Git LFS.

### If push is rejected:
```powershell
git pull origin main
git push origin main
```

## Quick All-in-One Command
If you want to do everything at once:
```powershell
cd c:\Users\coenie\kpi-tracker
git add -f public/thinkdigital-logo.png
git commit -m "Add company logo file"
git push origin main
```

## Verify Everything is Committed
After pushing, verify:
```powershell
git log --oneline -1
git ls-files public/thinkdigital-logo.png
```

Both should show the logo file is now in the repository.

