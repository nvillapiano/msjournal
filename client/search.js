import { fetchJournalList, fetchEntry } from './api.js';
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
  const tagList = document.getElementById('journal-entries');

  if (!searchInput) return; // Search not in DOM

  // Build tag list from entries
  await rebuildTagList();

  // Search text input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
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
  selectedTags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.innerHTML = `${tag} <button class="tag-remove" data-remove-tag="${tag}">×</button>`;
    container.appendChild(pill);
  });

  // Remove button listeners
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
  }
}

/**
 * Display search results in the journal list
 */
function displaySearchResults() {
  const container = document.getElementById('journal-entries');
  if (!container) return;

  if (searchResults.length === 0) {
    container.innerHTML = '<p class="search-no-results">No entries found</p>';
    return;
  }

  container.innerHTML = '';
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
          chatWindow.innerHTML = `
            <div class="entry-detail">
              <h2>${result.id}</h2>
              <div class="entry-metadata">
                <span>${dateStr}</span>
                ${tagsHtml ? `<div class="entry-tags">${tagsHtml}</div>` : ''}
              </div>
              <div class="entry-body">${fullEntry.body ? fullEntry.body.replace(/\n/g, '<br>') : ''}</div>
            </div>
          `;
        }
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
  loadJournalList();
}
