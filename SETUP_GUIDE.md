# Setup Guide - Bathroom Planner 3D with Authentication

## Quick Start

### 1. Install Dependencies
```bash
yarn install
```

### 2. Environment Configuration
The `.env` file has already been created with your Supabase credentials:
```
VITE_SUPABASE_URL=https://twkfqpkngdadwzhdsdcu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=http://localhost:5173
```

### 3. Database Setup
✅ Database migrations have been applied
✅ Tables created: `profiles` and `designs`
✅ Row Level Security enabled
✅ Indexes and triggers configured

### 4. Run the Application
```bash
# Development mode
yarn dev

# Production build
yarn build

# Preview production build
yarn preview
```

## What's New

### Authentication
- **Magic Link Login**: Users sign in via email (no password required)
- **Automatic Session Management**: Sessions persist across page reloads
- **Protected Routes**: Designs page requires authentication

### Cloud Storage
- **Database Storage**: Designs saved to Supabase instead of localStorage
- **Automatic Sync**: Changes sync automatically
- **Migration Tool**: Existing localStorage designs can be migrated

### Sharing
- **Share Links**: Generate unique URLs for each design
- **Public/Private**: Control design visibility
- **Duplicate Designs**: Others can duplicate shared designs to their account

## Testing the Features

### Test Authentication
1. Start the dev server: `yarn dev`
2. Navigate to http://localhost:5173
3. Click "Sign In" in the header
4. Enter your email address
5. Check your email for the magic link
6. Click the link to sign in

### Test Saving Designs
1. Sign in to your account
2. Create a bathroom design in the planner
3. Click "💾 Save Design" button
4. Design is saved to Supabase
5. Navigate to "My Designs" to see your saved designs

### Test Sharing
1. Go to "My Designs" page
2. Click the menu (⋮) on any design
3. Click "🔗 Share"
4. Copy the generated link
5. Open the link in a new private/incognito window
6. Design loads and can be viewed/duplicated

### Test Migration
1. If you have existing localStorage designs:
2. Sign in for the first time
3. Migration prompt will appear
4. Click "Migrate Now"
5. All localStorage designs will be moved to Supabase

## Architecture Overview

### Frontend
- **Vue 3** with TypeScript
- **Composition API** for reactive state
- **Vue Router** for navigation
- **Three.js** for 3D rendering

### Backend
- **Supabase** for authentication and database
- **PostgreSQL** database with RLS
- **Real-time subscriptions** (ready for future use)

### Security
- Row Level Security (RLS) policies
- Users can only access their own designs
- Shared designs accessible via token
- No sensitive data in client code

## File Structure

```
bathroom-planner-3d-vuejs/
├── src/
│   ├── lib/
│   │   └── supabase.ts              # Supabase client
│   ├── composables/
│   │   └── useAuth.ts               # Auth composable
│   ├── services/
│   │   └── designService.ts         # Design CRUD
│   ├── utils/
│   │   └── migrateLocalStorage.ts   # Migration utility
│   ├── components/ui/
│   │   ├── AuthButton.vue          # Auth UI
│   │   └── MigrationPrompt.vue     # Migration UI
│   └── pages/
│       ├── Login.vue               # Login page
│       ├── Planner.vue            # Main planner (updated)
│       ├── MyDesigns.vue          # Designs list (updated)
│       └── SharedDesign.vue       # View shared designs
├── .env                           # Environment variables
├── .env.example                   # Example env file
└── IMPLEMENTATION_SUMMARY.md      # Detailed documentation
```

## API Reference

### Authentication
```typescript
// Sign in with magic link
const { signInWithMagicLink } = useAuth()
await signInWithMagicLink('user@example.com')

// Sign out
const { signOut } = useAuth()
await signOut()

// Check auth status
const { isAuthenticated, user } = useAuth()
```

### Design Management
```typescript
import { designService } from '@/services/designService'

// Create design
const { data, error } = await designService.createDesign({
  name: 'My Design',
  items: [...],
  room_width: 300,
  room_height: 250,
})

// Get user designs
const { data, error } = await designService.getUserDesigns()

// Update design
const { data, error } = await designService.updateDesign(id, {
  name: 'Updated Name'
})

// Delete design
const { success, error } = await designService.deleteDesign(id)

// Share design
const { token, error } = await designService.generateShareToken(id)
const shareUrl = designService.getShareUrl(token)
```

## Deployment

### Environment Variables for Production
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=https://your-domain.com
```

### Build for Production
```bash
yarn build
```

This creates optimized files in the `dist/` directory.

### Deploy to Hosting
Upload `dist/` folder to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

### Configure Redirect URLs in Supabase
1. Go to Supabase Dashboard
2. Navigate to Authentication > URL Configuration
3. Add your production URL to allowed redirect URLs:
   - `https://your-domain.com/planner`
   - `https://your-domain.com/**`

## Troubleshooting

### Issue: Magic link not received
**Solution:**
- Check spam/junk folder
- Verify email is correct
- Check Supabase dashboard > Auth > Email Templates
- Ensure SMTP is configured (or using default)

### Issue: Can't save designs
**Solution:**
- Verify you're signed in (check header)
- Check browser console for errors
- Verify Supabase credentials in `.env`
- Check Supabase dashboard for API errors

### Issue: Shared link not working
**Solution:**
- Ensure design has been shared (has share token)
- Verify link is complete and correct
- Check design's `is_public` flag is true
- Test in incognito/private window

### Issue: Migration not working
**Solution:**
- Check if localStorage has designs
- Verify user is authenticated
- Check browser console for errors
- Try manual migration via component

## Support & Resources

### Supabase Dashboard
- **URL**: https://app.supabase.com
- **Project**: twkfqpkngdadwzhdsdcu

### Documentation
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [Vue 3 Docs](https://vuejs.org)

### Logs & Debugging
- **Supabase Logs**: Dashboard > Logs
- **Browser Console**: Press F12
- **Network Tab**: Check API requests

## Next Steps

After setup, you can:
1. ✅ Customize auth email templates
2. ✅ Add social auth providers (Google, GitHub)
3. ✅ Implement design thumbnails
4. ✅ Add design categories/tags
5. ✅ Create public design gallery
6. ✅ Add collaborative features
7. ✅ Implement design versioning

---

**Happy Building! 🏠✨**
