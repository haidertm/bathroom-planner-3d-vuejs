# Bathroom Planner 3D - TODO & Roadmap!!!

## 📏 **Measurement System (Highest Priority)**
- [ ] **Real-time dimension display during drag**
- [ ] **Room clearance calculations**
- [ ] **Minimum space requirements warnings**
- [ ] **Distance between objects**

## 👁️ **Visual Feedback Improvements**
- [ ] **Better collision detection indicators**
- [ ] **Object placement guides**
- [ ] **Room boundary visualization**
- [ ] **Clearance zone indicators**

## ⚡ **Performance & Collision**
- [ ] **Memory management improvements**
- [ ] **Better collision detection**
- [ ] **Prevent objects from getting stuck in wall corners**
- [ ] **Improved collision boundaries**
- [ ] **Performance optimization for real-time collision checking**
- [ ] **Physics-based collision response**

## 🏗️ **Core Features**
- [ ] **L-shaped room support**
- [ ] **Simplified room setup wizard**
- [ ] **Enhanced movement system** (wall-snapped vs free-moving objects)
- [ ] **Improved rotation for freely moveable objects**
- [ ] **Better lighting system**

## 📱 **User Experience**
- [ ] **Mobile touch interface improvements**
- [ ] **Enhanced camera controls** (preset angles, smooth transitions)
- [ ] **Save/Load functionality**
- [ ] **Export capabilities** (PDF plans, high-quality renders)

---

## 🗄️ **Database Commands**

Database connection requires environment variables. Never commit credentials to version control.

### Test Database Connection
```bash
# Set credentials via environment variables
export PGHOST=your-host
export PGPORT=5432
export PGUSER=your-user
export PGDATABASE=your-database
export PGPASSWORD=your-password  # Or use ~/.pgpass for security

# Test connection
psql -c 'SELECT 1;'
```

### Run Migrations
```bash
# Load credentials from .env file
source <(grep -E '^DB_' .env | sed 's/^DB_HOST/export PGHOST/' | sed 's/^DB_PORT/export PGPORT/' | sed 's/^DB_USER/export PGUSER/' | sed 's/^DB_NAME/export PGDATABASE/' | sed 's/^DB_PASSWORD/export PGPASSWORD/')

# Run migration
psql -f migration.sql
```

### Secure Credentials Options
1. **Environment variables** - Set `PGPASSWORD`, `PGHOST`, etc.
2. **`.env` file** - Keep local only (gitignored)
3. **`~/.pgpass` file** - PostgreSQL native credential file
4. **CI/CD secrets** - Use platform secrets management
