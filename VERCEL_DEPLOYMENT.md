# Vercel Deployment Guide

## Quick Deploy

### Option 1: One-Click Deploy
Click the button below to deploy instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/simplifaisoul/youtube-transcript-pro)

### Option 2: Manual Deploy

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended)

2. **Import Project**
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Choose `youtube-transcript-pro` from your GitHub

3. **Configure Project**
   - Vercel will auto-detect:
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - No additional configuration needed!

4. **Deploy**
   - Click "Deploy"
   - Wait ~2 minutes
   - Your app is live! 🎉

## Configuration

The project includes `vercel.json` with optimal settings:

- ✅ SPA routing (all routes → index.html)
- ✅ Asset caching (1 year for static assets)
- ✅ Auto-detected Vite framework

## Environment Variables

No environment variables required! The app uses free public APIs.

## Custom Domain

After deployment:

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatic!

## Troubleshooting

### Build Fails

- Check Node.js version (should be 18+)
- Ensure all dependencies are in `package.json`
- Check build logs in Vercel dashboard

### 404 Errors on Routes

- Already handled by `vercel.json` rewrites
- All routes redirect to `index.html` for SPA

### API Errors

- Check browser console for CORS issues
- APIs are public and free, no auth needed
- If one API fails, the app tries fallbacks automatically

## Support

If you encounter issues:
1. Check Vercel build logs
2. Check browser console
3. Open an issue on GitHub

---

**Ready to deploy?** Click the button above or follow the manual steps!
