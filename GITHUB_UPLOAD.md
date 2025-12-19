# GitHub Upload Instructions

## Steps to Upload to GitHub

1. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Repository name: `youtube-transcript-pro` (or your preferred name)
   - Description: "A beautiful, modern YouTube transcript extractor with advanced features"
   - Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

2. **Connect local repository to GitHub**

   ```bash
   cd youtube-transcript-app
   
   # Add remote (replace YOUR_USERNAME with your GitHub username)
   git remote add origin https://github.com/YOUR_USERNAME/youtube-transcript-pro.git
   
   # Rename branch to main (if needed)
   git branch -M main
   
   # Push to GitHub
   git push -u origin main
   ```

3. **Alternative: Using GitHub CLI**

   ```bash
   # If you have GitHub CLI installed
   gh repo create youtube-transcript-pro --public --source=. --remote=origin --push
   ```

## After Upload

- Your repository will be live at: `https://github.com/YOUR_USERNAME/youtube-transcript-pro`
- You can deploy it to Vercel, Netlify, or any hosting service
- Share the link with others!

## Deployment Options

### Vercel (Recommended)
1. Go to https://vercel.com
2. Import your GitHub repository
3. Vercel will auto-detect Vite and deploy automatically

### Netlify
1. Go to https://netlify.com
2. Connect your GitHub repository
3. Build command: `npm run build`
4. Publish directory: `dist`

### GitHub Pages
1. Go to repository Settings > Pages
2. Source: Deploy from a branch
3. Branch: `main` / `dist` folder
4. Build command: `npm run build`
