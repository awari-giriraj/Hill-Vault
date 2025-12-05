# Auto-Save to Drafts - Behavior Documentation

## Overview
HillVault now includes intelligent auto-save functionality that prevents data loss while keeping your workspace organized.

## How It Works

### Auto-Save Behavior
1. **Automatic Draft Creation**
   - When you start typing in a new entry, changes are automatically saved to "Drafts" after 2 seconds of inactivity
   - Entry is created with title "Untitled Draft" if you haven't entered a title
   - All auto-saved entries go to the "Drafts" category regardless of the selected category dropdown

2. **Visual Indicator**
   - Orange indicator appears: "● Unsaved changes (auto-saving to drafts...)"
   - Indicator fades in smoothly when changes are detected
   - Disappears after successful manual save

3. **Debounced Saving**
   - Auto-save waits 2 seconds after you stop typing
   - Prevents excessive database writes
   - Ensures smooth editing experience

### Manual Save Behavior
1. **Saving from New Entry**
   - Click "Save" button to save entry to the selected category
   - Entry is created in the category you chose from dropdown
   - Never creates a draft (goes directly to selected category)

2. **Saving from Draft**
   - Open a draft from the "Drafts" category
   - Change the category dropdown to desired category (Ideas, Notes, etc.)
   - Click "Save" to move the draft to the selected category
   - Draft is removed from "Drafts" and appears in the new category

3. **Cancel with Unsaved Changes**
   - If you click "Cancel" with unsaved changes, you get a prompt:
     - "You have unsaved changes. Save as draft before closing?"
   - Click "OK" to save to drafts
   - Click "Cancel" to discard changes

## Category Filtering

### All Items View
- Shows entries from ALL categories EXCEPT "Drafts"
- Only displays entries that have been explicitly saved
- Clean view of your finalized content

### Drafts Category
- Shows ONLY auto-saved and unsaved entries
- Acts as a temporary workspace for work-in-progress
- Entries remain here until you manually save them to another category

### Specific Categories (Ideas, Notes, Tasks, Journal)
- Shows only entries explicitly saved to that category
- Does not include drafts

## Workflow Examples

### Example 1: Quick Note
1. Click "New Entry"
2. Start typing content
3. Wait 2 seconds → Auto-saved to Drafts
4. Navigate away → Content is safe in Drafts
5. Later: Open from Drafts, select category, click Save → Moves to category

### Example 2: Immediate Save
1. Click "New Entry"
2. Enter title and content
3. Select category (e.g., "Ideas")
4. Click "Save" → Goes directly to Ideas (no draft created)

### Example 3: Promoting Draft
1. Go to "Drafts" category
2. Open an auto-saved draft
3. Edit and refine content
4. Change category dropdown to "Notes"
5. Click "Save" → Entry moves from Drafts to Notes

### Example 4: Cancel Decision
1. Click "New Entry"
2. Start typing (auto-saved to Drafts after 2 seconds)
3. Click "Cancel"
4. Prompt: "Save as draft before closing?"
   - Yes → Stays in Drafts
   - No → Content remains in Drafts from auto-save

## Technical Implementation

### Database Changes
- Modified `get-entries` handler in `electron/main.js`
- When `category` is `null` (All Items), adds condition: `e.category != 'drafts'`
- Ensures drafts are excluded from All Items view

### Editor Changes
- `handleAutoSave()`: Always saves with `category: 'drafts'`
- `handleSave()`: Uses selected category from dropdown
- Added `draftIdRef` to track draft ID across re-renders
- Clear draft reference after manual save

### State Management
- `hasUnsavedChanges`: Boolean flag for change tracking
- `autoSaveTimerRef`: Debounce timer (2 seconds)
- `draftIdRef`: Tracks current draft ID to prevent duplicates

## Benefits

1. **Never Lose Work**: All changes auto-saved after 2 seconds
2. **Organized Workspace**: Drafts separated from finalized entries
3. **Clean Views**: "All Items" shows only completed work
4. **Flexible Workflow**: Save directly or via drafts
5. **User Control**: Explicit save required to publish to categories

## UI Indicators

```
Toolbar when unsaved:
[Category ▼] [Save] [Cancel] [● Unsaved changes (auto-saving to drafts...)]

Toolbar when saved:
[Category ▼] [Save] [Cancel]
```

## Color Scheme
- Auto-save indicator: Amber/Orange (#f59e0b)
- Dark mode indicator: Light Amber (#fbbf24)
- Smooth fade-in animation (0.3s)

## Future Enhancements
- [ ] Draft age indicator (e.g., "Saved 2 minutes ago")
- [ ] Bulk draft management (Delete all, Move all)
- [ ] Draft count badge in sidebar
- [ ] Recovery from unexpected crashes (already handled by auto-save)

---

**Last Updated**: November 9, 2025
**Version**: 1.0.0
