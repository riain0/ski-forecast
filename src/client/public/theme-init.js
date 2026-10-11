// Applies a saved Day/Night theme before first paint to avoid a flash of the wrong theme.
try {
  var theme = JSON.parse(localStorage.getItem('upslope:prefs:v1') || '{}').theme;
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch (e) {
  /* storage unavailable */
}
