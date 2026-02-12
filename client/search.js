import { fetchJournalList, fetchEntry } from './api.js';
import { appendMessage, scrollChatToBottom } from './chat.js';
import { loadJournalList } from './archive.js';

let allTags = new Set();
let selectedTags = new Set();
let searchQuery = '';
let searchResults = [];

/**
 * Initialize search module: set up event listeners and populate tag list
 */
export async function initSearch() {
  const searchInput = document.getElementById('search-input');
  const tagInput = document.getElementById('search-tag-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const tagList = document.getElementById('journal-entries');

  if (!searchInput) return; // Search not in DOM

  // Build tag list from entries
  await rebuildTagList();

  // Trigger initial search to show all entries
  await performSearch();

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSearch();
    });
  }

  // Search text input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    updateTagPills();
    performSearch();
  });

  // Tag combobox: show dropdown on focus
  tagInput.addEventListener('focus', () => {
    showTagDropdown();
  });

  // Tag combobox: filter tags as user types
  tagInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();
    filterTagDropdown(value);
  });

  // Tag combobox: add tag on Enter
  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value.trim().toLowerCase();
      if (value) {
        addTag(value);
        tagInput.value = '';
        hideTagDropdown();
        performSearch();
      }
    }
  });

  // Handle tag click to add
  document.addEventListener('click', (e) => {
    const tagOption = e.target.closest('[data-tag-option]');
    if (tagOption) {
      const tag = tagOption.getAttribute('data-tag-option');
      addTag(tag);
      tagInput.value = '';
      hideTagDropdown();
      performSearch();
    }
  });

  // Close dropdown when clicking outside search area
  document.addEventListener('click', (e) => {
    const isSearchArea = e.target.closest('.msj-sidebar__search');
    if (!isSearchArea) {
      hideTagDropdown();
    }
  });

  // Delegated handler: clear the search query when the query-pill remove is clicked
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove-query]');
    if (rm) {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      updateTagPills();
      performSearch();
    }
  });
}

/**
 * Build list of all available tags from journal entries
 */
async function rebuildTagList() {
  try {
    const entries = await fetchJournalList();
    allTags.clear();
    entries.forEach(entry => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach(tag => allTags.add(tag.toLowerCase()));
      }
    });
  } catch (err) {
    console.error('Failed to build tag list:', err);
  }
}

/**
 * Show tag dropdown with all available tags
 */
function showTagDropdown() {
  const dropdown = document.getElementById('search-tag-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  const filtered = Array.from(allTags).sort();

  filtered.forEach(tag => {
    const div = document.createElement('div');
    div.className = 'search-tag-option';
    div.setAttribute('data-tag-option', tag);
    div.textContent = tag;
    dropdown.appendChild(div);
  });

  dropdown.style.display = 'block';
}

/**
 * Filter tag dropdown based on input value
 */
function filterTagDropdown(query) {
  const dropdown = document.getElementById('search-tag-dropdown');
  if (!dropdown) return;

  const options = dropdown.querySelectorAll('[data-tag-option]');
  let visibleCount = 0;

  options.forEach(option => {
    const tag = option.getAttribute('data-tag-option');
    const matches = tag.includes(query) && !selectedTags.has(tag);
    option.style.display = matches ? 'block' : 'none';
    if (matches) visibleCount++;
  });

  dropdown.style.display = visibleCount > 0 ? 'block' : 'none';
}

/**
 * Hide tag dropdown
 */
function hideTagDropdown() {
  const dropdown = document.getElementById('search-tag-dropdown');
  if (dropdown) dropdown.style.display = 'none';
}

/**
 * Add tag to selected tags and update UI
 */
function addTag(tag) {
  tag = tag.toLowerCase().trim();
  if (!tag) return;
  selectedTags.add(tag);
  updateTagPills();
}

/**
 * Remove tag from selected tags
 */
function removeTag(tag) {
  selectedTags.delete(tag);
  updateTagPills();
}

/**
 * Update visual tag pills below tag input
 */
function updateTagPills() {
  const container = document.getElementById('search-tag-pills');
  if (!container) return;

  container.innerHTML = '';

  // Add search query pill if present
  if (searchQuery) {
    const queryPill = document.createElement('span');
    queryPill.className = 'query-pill';
    queryPill.innerHTML = `"${searchQuery}" <button class="pill-remove" data-remove-query="true">×</button>`;
    container.appendChild(queryPill);
  }

  // Add tag pills
  selectedTags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.innerHTML = `${tag} <button class="tag-remove" data-remove-tag="${tag}">×</button>`;
    container.appendChild(pill);
  });

  // Remove query button listener
  // query remove is handled via delegated listener attached in initSearch

  // Remove tag button listeners
  document.querySelectorAll('[data-remove-tag]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      removeTag(btn.getAttribute('data-remove-tag'));
      performSearch();
    });
  });
}

/**
 * Perform search with current query and selected tags
 */
async function performSearch() {
  try {
    const tagString = Array.from(selectedTags).join(',');
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (tagString) params.append('tags', tagString);

    const res = await fetch(`/api/journal/search?${params.toString()}`);
    if (!res.ok) throw new Error('Search request failed');

    searchResults = await res.json();
    displaySearchResults();
  } catch (err) {
    console.error('Search error:', err);
    const container = document.getElementById('journal-entries');
    if (container) {
      container.innerHTML = '<p class="search-error">Search failed. Please try again.</p>';
    }
  }
}

/**
 * Display search results in the journal list
 */
function displaySearchResults() {
  const container = document.getElementById('journal-entries');
  if (!container) return;

  console.log('displaySearchResults called with', searchResults.length, 'results');

  if (searchResults.length === 0) {
    console.log('No results - removing has-content class');
    container.classList.remove('has-content');
    container.innerHTML = '<p class="search-no-results">No entries found</p>';
    return;
  }

  console.log('Adding has-content class');
  container.classList.add('has-content');

  // Add result count header
  const resultCount = searchResults.length;
  const plural = resultCount === 1 ? 'entry' : 'entries';
  container.innerHTML = `<div class="search-result-count">${resultCount} ${plural} found</div>`;

  searchResults.forEach(result => {
    const entry = document.createElement('div');
    entry.className = 'msj-entry';
    
    // Highlight search query in excerpt
    let displayExcerpt = result.excerpt;
    if (searchQuery) {
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      displayExcerpt = result.excerpt.replace(regex, '<mark>$1</mark>');
    }

    const dateStr = result.date ? new Date(result.date).toLocaleDateString() : '';
    const tagsHtml = result.tags
      ? result.tags.map(t => `<span class="result-tag">${t}</span>`).join('')
      : '';

    entry.innerHTML = `
      <div class="entry-header">
        <strong>${result.id}</strong>
        <span class="entry-date">${dateStr}</span>
      </div>
      ${result.summary ? `<p class="entry-summary">${result.summary}</p>` : ''}
      ${displayExcerpt ? `<p class="entry-excerpt">${displayExcerpt}</p>` : ''}
      <div class="entry-tags">${tagsHtml}</div>
    `;

    entry.addEventListener('click', async () => {
      const fullEntry = await fetchEntry(result.id);
      if (fullEntry) {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
          chatWindow.innerHTML = '';

          const body = fullEntry.body || '';
          const segments = body.split(/\n-{3,}\n/).map(s => s.trim()).filter(Boolean);

          for (const seg of segments) {
            const youMatch = seg.match(/\*\*You:\*\*\s*([\s\S]*?)(?=(\n\*\*Agent:\*\*)|$)/i);
            const agentMatch = seg.match(/\*\*Agent:\*\*\s*([\s\S]*)/i);
            if (youMatch) appendMessage(youMatch[1].trim(), 'user');
            if (agentMatch) appendMessage(agentMatch[1].trim(), 'agent');
            if (!youMatch && !agentMatch) appendMessage(seg, 'agent');
          }

          scrollChatToBottom();
        }
        // mark active in the list
        const prev = document.getElementById('journal-entries').querySelector('.msj-entry--active');
        if (prev) prev.classList.remove('msj-entry--active');
        entry.classList.add('msj-entry--active');
      }
    });

    container.appendChild(entry);
  });
}

/**
 * Reset search and return to full list
 */
export function clearSearch() {
  searchQuery = '';
  selectedTags.clear();
  const searchInput = document.getElementById('search-input');
  const tagInput = document.getElementById('search-tag-input');
  if (searchInput) searchInput.value = '';
  if (tagInput) tagInput.value = '';
  updateTagPills();
  performSearch();
}
