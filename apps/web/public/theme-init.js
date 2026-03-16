// Apply persisted theme before Angular bootstraps to avoid first-paint flicker.
(function applyStoredTheme() {
  try {
    var theme = localStorage.getItem('feldpost_theme');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (_error) {
    // localStorage may be unavailable in some privacy modes.
  }
})();
