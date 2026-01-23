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

**Option 1: Using dotenv-cli (Recommended)**
```bash
# Install dotenv-cli if not already installed
npm install -g dotenv-cli

# Run migration with .env variables mapped to PostgreSQL env vars
dotenv -e .env -- sh -c 'PGHOST=$DB_HOST PGPORT=$DB_PORT PGUSER=$DB_USER PGDATABASE=$DB_NAME PGPASSWORD=$DB_PASSWORD psql -f migration.sql'
```

**Option 2: Explicit variable extraction (no code execution)**
```bash
# Safely extract each variable using grep and cut
export PGHOST=$(grep '^DB_HOST=' .env | cut -d '=' -f2-)
export PGPORT=$(grep '^DB_PORT=' .env | cut -d '=' -f2-)
export PGUSER=$(grep '^DB_USER=' .env | cut -d '=' -f2-)
export PGDATABASE=$(grep '^DB_NAME=' .env | cut -d '=' -f2-)
export PGPASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)

# Run migration
psql -f migration.sql
```

### Secure Credentials Options
1. **Environment variables** - Set `PGPASSWORD`, `PGHOST`, etc.
2. **`.env` file** - Keep local only (gitignored)
3. **`~/.pgpass` file** - PostgreSQL native credential file
4. **CI/CD secrets** - Use platform secrets management
