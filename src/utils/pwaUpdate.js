// Force update script pour PWA
(function() {
  // Vérifier si c'est une PWA installée
  if (window.matchMedia('(display-mode: standalone)').matches) {
    
    // Forcer le rechargement sans cache toutes les 30 secondes si nécessaire
    let lastCheck = localStorage.getItem('lastVersionCheck') || 0;
    const currentTime = Date.now();
    
    // Vérifier toutes les 5 minutes
    if (currentTime - lastCheck > 5 * 60 * 1000) {
      localStorage.setItem('lastVersionCheck', currentTime);
      
      // Vérifier si une nouvelle version est disponible
      fetch(window.location.href + '?v=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).then(() => {
        // Si la requête réussit, recharger sans cache
        window.location.reload(true);
      }).catch(() => {
      });
    }
  }
})();
