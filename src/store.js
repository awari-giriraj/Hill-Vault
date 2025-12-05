import { create } from 'zustand';

const useStore = create((set) => ({
  isAuthenticated: false,
  isLocked: false,
  theme: 'light',
  currentView: 'dashboard',
  selectedCategory: 'all',
  entries: [],
  selectedEntry: null,
  tags: [],
  searchQuery: '',
  filterTags: [],
  
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLocked: (value) => set({ isLocked: value }),
  setTheme: (theme) => {
    document.body.className = theme;
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    document.body.className = newTheme;
    return { theme: newTheme };
  }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setEntries: (entries) => set({ entries }),
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  setTags: (tags) => set({ tags }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterTags: (tags) => set({ filterTags: tags }),
  
  addEntry: (entry) => set((state) => ({ 
    entries: [entry, ...state.entries] 
  })),
  
  updateEntry: (updatedEntry) => set((state) => ({
    entries: state.entries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
    // Don't auto-update selectedEntry - let components manage it explicitly
  })),
  
  removeEntry: (id) => set((state) => ({
    entries: state.entries.filter(e => e.id !== id),
    selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry
  })),
  
  reset: () => set({
    isAuthenticated: false,
    isLocked: false,
    currentView: 'dashboard',
    selectedCategory: 'all',
    entries: [],
    selectedEntry: null,
    tags: [],
    searchQuery: '',
    filterTags: []
  })
}));

export default useStore;
