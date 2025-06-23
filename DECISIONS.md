# Territory Management System - What I Built & Why

## The Gist

Built a territory management system MVP that gets revenue ops out of spreadsheet hell. The main insight: territories should be auto-assigned based on geography, but sales rep assignment is what actually needs management.

## What I Built

**Core Territory System:**
- Auto-assign territories based on deal origin location (West Coast for LA deals, etc.)
  - It's hard coded city checks for the sake of the demo purposes
- Sales rep assignment UI - this is what rev ops actually wants to manage
- Territory performance dashboard with sorting and filtering
- Seeded database with realistic geographic territory assignments

**API Endpoints:**
- `PATCH /api/deals/[id]/sales-rep` - assign deals to reps (the main workflow)
- `GET /api/territories` - territory performance analytics  
- `GET /api/sales-reps` - available sales reps for assignment (hard-coded list)
- `POST /api/seed` - seeds database with geographic territories

**Frontend:**
- Responsive layout: Pipeline Overview + Performance Metrics side-by-side
- Territory dashboard shows performance comparison across territories  
- Deal list with sales rep reassignment (individual deal management)
- Real-time updates when assignments change

## Scope Cuts (Time doesn't stop!)

### Geographic Intelligence → Simple Geo Mapping
**Cut**: Fancy ZIP code parsing and boundary detection  
**Built**: Simple city → territory mapping in seed data  
**Why**: LA goes to West Coast, NYC goes to East Coast. Done. The algorithm can get fancy later.

### Map Visualization → Table Dashboard  
**Cut**: Interactive maps with pretty colors  
**Built**: Sortable table with key metrics  
**Why**: Rev ops people live in spreadsheets. Tables work better than maps for operational decisions.

### Bulk Assignment → Individual Updates
**Cut**: Select 50 deals and reassign them all  
**Built**: One-click rep assignment per deal  
**Why**: Bulk operations need complex UI state management. Individual assignment covers 90% of use cases.

### Advanced Analytics → Core Metrics
**Cut**: Forecasting, trends, complex filters  
**Built**: Deal counts, pipeline value, rep workloads  
**Why**: Basic metrics solve the immediate pain. Analytics can evolve based on usage patterns.

## Database Seeding Strategy

Updated the seed with realistic territory assignments:
- **West Coast**: LA, Seattle, SF deals
- **East Coast**: NYC, Boston, Miami deals  
- **Midwest**: Chicago, Denver deals
- **International**: London, Shanghai, etc. deals

All deals get auto-assigned territories, but sales rep assignment remains flexible.

## Hard-Coded Values (For Demo Speed)

**Sales Reps**: Hard-coded list in `/api/sales-reps` because creating a full sales rep table/CRUD would eat up too much time. The list includes existing reps from deals plus a few extras for assignment flexibility.

**Territory Mapping**: Simple city string matching in the seed file. "Los Angeles" → "West Coast", etc. A real system would use proper geographic APIs or ZIP code lookups.

**Territory List**: Eight predefined territories in `TERRITORIES` constant. In production, this would be configurable.

## Component Overlap Analysis

The original prompt mentioned an "Interactive Territory Dashboard" which might seem like it overlaps with our current setup. Here's how I separated concerns:

**Territory Dashboard**: High-level analytics and performance comparison
- Shows territory-level metrics (deal counts, pipeline value, rep counts)  
- Helps with strategic decisions ("Which territories are underperforming?")
- Read-only performance data

**Deal List with Rep Assignment**: Operational deal management
- Shows individual deals with reassignment capability
- Helps with tactical decisions ("Who should handle this specific deal?")
- Active deal assignment workflow

This separation matches real-world usage where managers need both strategic overview (dashboard) and operational tools (deal assignment).

## What's Next

If I had more time, I'd prioritize:
1. **Geographic service** - Auto-assign territories for new deals based on city
2. **Rep workload balancing** - Show deal distribution across reps
3. **Bulk reassignment** - For major territory reorganizations
4. **Territory performance trends** - Month-over-month comparisons

## Tech Decisions

**Database**: Added territory field as nullable for backward compatibility  
**API Design**: RESTful with proper validation using Zod schemas  
**Frontend**: Kept existing component patterns, just added territory features  
**Testing**: Node.js environment for API tests, mocked database calls

The system works, solves the real problem, and sets up the foundation for more sophisticated features later.