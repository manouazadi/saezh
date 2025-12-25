function initOnce() {
  const grids = document.querySelectorAll('#home .grid, #works .grid')

  const masonryInstances = []
  grids.forEach(g => {
    const msnry = new Masonry(g, {
      itemSelector: '.grid-item',
      percentPosition: true
    })
    masonryInstances.push({ el: g, msnry })
  })

  // Shared guard for one-time entrance animation per grid
  const animatedGrids = new WeakSet()

  // Single reusable entrance animation for a grid
  function animateGridEntrance(gridEl) {
    if (!window.imagesLoaded || !window.gsap) return
    imagesLoaded(gridEl, { background: false }, () => {
      if (animatedGrids.has(gridEl)) return
      animatedGrids.add(gridEl)
      const inst = masonryInstances.find(m => m.el === gridEl)
      if (inst && inst.msnry && typeof inst.msnry.layout === 'function') {
        inst.msnry.layout()
      }
      const items = Array.from(gridEl.querySelectorAll('.grid-item'))
      if (!items.length) return
      const gridRect = gridEl.getBoundingClientRect()
      const mapped = items
        .map(el => {
          const r = el.getBoundingClientRect()
          return {
            el,
            top: Math.round(r.top - gridRect.top),
            left: Math.round(r.left - gridRect.left)
          }
        })
        .sort((a, b) => a.top - b.top || a.left - b.left)

      const rows = []
      const threshold = 10
      mapped.forEach(entry => {
        const last = rows[rows.length - 1]
        if (!last || Math.abs(entry.top - last.top) > threshold) {
          rows.push({ top: entry.top, els: [entry.el] })
        } else {
          last.els.push(entry.el)
        }
      })

      // Initial state
      gsap.set(items, { y: ANIM.initialY, autoAlpha: 0, scale: ANIM.initialScale, filter: 'blur(2px)' })

      // Cinematic micro-overshoot + blur/opacity tail
      rows.forEach((row, idx) => {
        const tl = gsap.timeline({ delay: idx * ANIM.rowDelay })
        tl.to(row.els, { y: 0, scale: ANIM.overshoot, duration: ANIM.primaryDur, ease: EASE.outQuart, stagger: ANIM.itemStagger }, 0)
        tl.to(row.els, { scale: 1, duration: ANIM.settleDur, ease: EASE.settle, stagger: ANIM.itemStagger }, ANIM.settleOffset)
        tl.to(row.els, { filter: 'blur(0px)', autoAlpha: 1, duration: ANIM.tailDur, ease: EASE.tail, stagger: ANIM.itemStagger }, ANIM.tailOffset)
      })
    })
  }

  // Trigger entrance once per grid on demand (unified call)
  function triggerEntranceAllGrids() {
    Array.from(grids).forEach(animateGridEntrance)
  }
  triggerEntranceAllGrids()

  // Expose for debugging / dynamic injections
  window.triggerEntranceAllGrids = triggerEntranceAllGrids


  // Constants
  const ANIM = { rowDelay: 0.12, itemStagger: 0.05, initialY: 30, initialScale: 0.97, overshoot: 1.012, primaryDur: 0.7, settleDur: 0.25, tailDur: 1.1, tailOffset: 0.1, settleOffset: 0.62 }
  const EASE = { outQuart: 'cubic-bezier(0.25, 1, 0.5, 1)', tail: 'power2.out', settle: 'power1.out' }
  const THEME_RECHECK_MS = 60000

  // Theme module
  const Theme = {
    KEYS: ['light', 'dark', 'golden', 'blue'],
    CLASSES: ['theme-light', 'theme-dark', 'theme-golden', 'theme-blue'],
    geo: null,
    minutesSinceMidnight(d) { return d.getHours() * 60 + d.getMinutes() },
    detectHeuristic(now = new Date()) {
      const m = this.minutesSinceMidnight(now)
      const blueMorning = m >= 5 * 60 + 15 && m < 6 * 60
      const goldenMorning = m >= 6 * 60 && m < 7 * 60 + 30
      const goldenEvening = m >= 17 * 60 + 30 && m < 19 * 60
      const blueEvening = m >= 19 * 60 && m < 19 * 60 + 45
      if (blueMorning || blueEvening) return 'blue'
      if (goldenMorning || goldenEvening) return 'golden'
      if (m >= 20 * 60 || m < 6 * 60) return 'dark'
      return 'light'
    },
    detectPrecise(now = new Date()) {
      try {
        if (!this.geo || !window.SunCalc || typeof SunCalc.getTimes !== 'function')
          return this.detectHeuristic(now)
        const { latitude, longitude } = this.geo
        const times = SunCalc.getTimes(now, latitude, longitude)
        const n = now.getTime()
        const t = key => times && times[key] instanceof Date ? times[key].getTime() : NaN
        const between = (a, b) => !isNaN(a) && !isNaN(b) && n >= a && n < b
        const blueMorning = between(t('dawn'), t('sunriseEnd'))
        const blueEvening = between(t('sunsetStart'), t('dusk'))
        const goldenMorning = between(t('sunriseEnd'), t('goldenHourEnd'))
        const goldenEvening = between(t('goldenHour'), t('sunsetStart'))
        if (blueMorning || blueEvening) return 'blue'
        if (goldenMorning || goldenEvening) return 'golden'
        const isDay = between(t('sunrise'), t('sunset'))
        return isDay ? 'light' : 'dark'
      } catch (_) { return this.detectHeuristic(now) }
    },
    detect(now = new Date()) { return this.detectPrecise(now) },
    current() { for (const k of this.KEYS) if (document.body.classList.contains(`theme-${k}`)) return k; return null },
    updateToggleUI(theme) {
      const btn = document.getElementById('theme-toggle')
      if (!btn) return
      const sun = btn.querySelector('.icon-sun')
      const moon = btn.querySelector('.icon-moon')
      const gh = btn.querySelector('.gh-badge')
      const bh = btn.querySelector('.bh-badge')
      const isLightish = theme === 'light' || theme === 'golden'
      if (sun) sun.style.display = isLightish ? 'block' : 'none'
      if (moon) moon.style.display = isLightish ? 'none' : 'block'
      if (gh) gh.classList.toggle('hidden', theme !== 'golden')
      if (bh) bh.classList.toggle('hidden', theme !== 'blue')
      const title = theme === 'golden' ? 'Golden hour theme' : theme === 'blue' ? 'Blue hour theme' : isLightish ? 'Light theme' : 'Dark theme'
      btn.setAttribute('title', title)
      btn.setAttribute('aria-label', title)
    },
    set(theme) {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-golden', 'theme-blue')
      document.body.classList.add(`theme-${theme}`)
      this.updateToggleUI(theme)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) {
        const color = theme === 'dark' ? '#0b0b0b' : theme === 'blue' ? '#0f172a' : theme === 'golden' ? '#fff7ed' : '#fafaf9'
        meta.setAttribute('content', color)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEBUG: Theme testing controls
  // Set these to true to force a specific theme for testing
  // ─────────────────────────────────────────────────────────────────────────────
  const DEBUG_THEME = {
    enabled: false,        // Set to true to enable debug theme forcing
    forceBlue: false,      // Force blue hour theme
    forceGolden: false     // Force golden hour theme
  }

  // Expose debug controls to window for console access
  window.themeDebug = {
    enable() { DEBUG_THEME.enabled = true; console.log('Theme debug enabled') },
    disable() { DEBUG_THEME.enabled = false; userOverride = false; Theme.set(Theme.detect()); console.log('Theme debug disabled, reverted to auto') },
    setBlue() { DEBUG_THEME.enabled = true; DEBUG_THEME.forceBlue = true; DEBUG_THEME.forceGolden = false; Theme.set('blue'); console.log('Forced: blue') },
    setGolden() { DEBUG_THEME.enabled = true; DEBUG_THEME.forceGolden = true; DEBUG_THEME.forceBlue = false; Theme.set('golden'); console.log('Forced: golden') },
    setLight() { DEBUG_THEME.enabled = true; DEBUG_THEME.forceBlue = false; DEBUG_THEME.forceGolden = false; Theme.set('light'); console.log('Forced: light') },
    setDark() { DEBUG_THEME.enabled = true; DEBUG_THEME.forceBlue = false; DEBUG_THEME.forceGolden = false; Theme.set('dark'); console.log('Forced: dark') },
    status() { console.log('DEBUG_THEME:', DEBUG_THEME, '| current:', Theme.current()) }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // Initialize based on time of day (golden/blue only during their windows)
  let userOverride = false

  // Determine initial theme (respect debug settings)
  function getEffectiveTheme() {
    if (DEBUG_THEME.enabled) {
      if (DEBUG_THEME.forceBlue) return 'blue'
      if (DEBUG_THEME.forceGolden) return 'golden'
    }
    return Theme.detect()
  }

  const initialTheme = getEffectiveTheme()
  Theme.set(initialTheme)

  const toggleBtn = document.getElementById('theme-toggle')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      userOverride = true
      DEBUG_THEME.enabled = false // clicking toggle disables debug forcing
      const c = Theme.current() || initialTheme
      const next = c === 'dark' || c === 'blue' ? 'light' : 'dark'
      Theme.set(next)
    })
  }

  // Periodically re-evaluate time-based theme if user hasn't overridden
  setInterval(() => {
    if (userOverride || DEBUG_THEME.enabled) return
    const t = Theme.detect()
    if (t !== Theme.current()) Theme.set(t)
  }, THEME_RECHECK_MS)

  // Acquire geolocation for precise sun times (updates immediately if no override)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        try {
          Theme.geo = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          if (!userOverride) Theme.set(Theme.detect(new Date()))
        } catch (_) { }
      },
      () => { },
      { enableHighAccuracy: false, maximumAge: 3600000, timeout: 5000 }
    )
  }

  // Helper: when changing sections, always reset vertical scroll to the top
  function resetPageScrollToTop() {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return
    try {
      window.scrollTo({ top: 0, behavior: 'auto' })
    } catch (_) {
      // Fallback for older browsers that don't support options object
      window.scrollTo(0, 0)
    }
  }

  // GSAP plugins
  if (window.gsap) {
    gsap.registerPlugin(ScrollToPlugin)
    // Smooth horizontal scrolling between sections from the top nav
    const scroller = document.getElementById('hscroll')
    document.querySelectorAll('header nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const hash = link.getAttribute('href')
        const target = hash && hash !== '#' ? document.querySelector(hash) : null
        if (target && scroller) {
          e.preventDefault()
          history.pushState(null, null, hash)
          gsap.to(scroller, {
            duration: 0.6,
            scrollTo: { x: target },
            ease: 'power2.out'
          })

          // Ensure entrance animation is applied (once per grid)
          triggerEntranceAllGrids()
        }
      })
    })
  }

  // Active nav highlighting (bold + darker text on current section)
  ; (function () {
    const sections = Array.from(document.querySelectorAll('main section[id]'))
    const navLinks = Array.from(
      document.querySelectorAll('header nav a[href^="#"]')
    )

    function setActive(id) {
      navLinks.forEach(a => {
        const active = a.getAttribute('href') === `#${id}`

        a.classList.toggle('font-bold', active)
        a.classList.toggle('text-stone-900', active)
        a.setAttribute('aria-current', active ? 'page' : 'false')
      })

      // Update URL hash without adding to history (scrolling behavior)
      if (history.replaceState) {
        history.replaceState(null, null, `#${id}`)
      }

      // Whenever the active section changes (via nav click or swipe),
      // reset vertical scroll so the new section starts from the top.
      resetPageScrollToTop()
    }

    const scrollerEl = document.getElementById('hscroll')
    if (scrollerEl && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        entries => {
          let best = null
          for (const e of entries) {
            if (
              e.isIntersecting &&
              (!best || e.intersectionRatio > best.intersectionRatio)
            )
              best = e
          }
          if (best && best.target && best.target.id) {
            setActive(best.target.id)
          }
        },
        { root: scrollerEl, threshold: 0.6 }
      )

      sections.forEach(sec => io.observe(sec))
    }

    // Also update immediately based on hash or default to the first section
    // And ensure we actually scroll to it if it is a deep link
    const currentHash = (location.hash || '').replace('#', '')
    if (currentHash) {
      setActive(currentHash)
      const target = document.getElementById(currentHash)
      if (target && scrollerEl && window.gsap) {
        // Immediate scroll to target for deep linking
        gsap.set(scrollerEl, { scrollTo: { x: target } })
        triggerEntranceAllGrids()
      }
    } else if (sections[0]) {
      setActive(sections[0].id)
    }

    // On click, set active instantly for responsiveness
    navLinks.forEach(a => {
      a.addEventListener('click', () => {
        const href = a.getAttribute('href') || ''
        if (href.startsWith('#')) setActive(href.slice(1))
      })
    })
  })()

  // Modal close handlers (set up once)
  setupModalHandlers()
}

// Enhanced 3D tilt configuration
const TILT = {
  maxRotateX: 12,    // degrees - tilt forward/back
  maxRotateY: 15,    // degrees - tilt left/right
  maxRotateZ: 4,     // degrees - subtle twist
  maxTranslateZ: 30, // pixels - lift towards viewer
  scale: 1.03        // slight scale up on hover
}

// Track which items already have listeners to avoid duplicates
const initializedItems = new WeakSet()

// Apply 3D tilt and click handlers to grid items
function setupGridItemEffects(container) {
  if (!container) container = document
  const items = container.querySelectorAll('.grid-item')

  items.forEach(item => {
    // Skip if already initialized
    if (initializedItems.has(item)) return
    initializedItems.add(item)

    let raf = null
    let isHovering = false

    const applyTransform = (rx, ry, rz, tz, scale) => {
      item.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) translateZ(${tz}px) scale(${scale})`
    }

    item.addEventListener('mousemove', e => {
      if (!isHovering) return

      const rect = item.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2

      // Normalized position from center (-1 to 1)
      const normX = (x - cx) / cx
      const normY = (y - cy) / cy

      // Calculate rotations based on mouse position
      const ry = normX * TILT.maxRotateY           // tilt left/right
      const rx = -normY * TILT.maxRotateX          // tilt forward/back (inverted)
      const rz = normX * TILT.maxRotateZ           // subtle twist

      // Distance from center affects depth (closer to center = more lift)
      const distFromCenter = Math.sqrt(normX * normX + normY * normY)
      const tz = TILT.maxTranslateZ * (1 - distFromCenter * 0.5)

      if (!raf) {
        raf = requestAnimationFrame(() => {
          applyTransform(rx.toFixed(2), ry.toFixed(2), rz.toFixed(2), tz.toFixed(1), TILT.scale)
          raf = null
        })
      }
    })

    item.addEventListener('mouseenter', () => {
      isHovering = true
      const computed = window.getComputedStyle(item)
      item.dataset.prevZ = item.style.zIndex || computed.zIndex || ''
      item.style.zIndex = '9999'
      // Initial lift on enter
      applyTransform(0, 0, 0, TILT.maxTranslateZ * 0.5, TILT.scale)
    })

    const resetTilt = () => {
      isHovering = false
      // cancel any scheduled frame to avoid re-applying a tilt after reset
      if (raf) {
        cancelAnimationFrame(raf)
        raf = null
      }
      item.style.zIndex = item.dataset.prevZ || ''
      applyTransform(0, 0, 0, 0, 1) // reset to flat position
    }

    item.addEventListener('mouseleave', resetTilt)
    item.addEventListener('pointerleave', resetTilt)

    // Click to open modal with full resolution
    item.addEventListener('click', () => {
      const img = item.querySelector('img')
      const fullSrc = img?.dataset?.full || img?.src
      openImageModal(fullSrc)
    })
  })
}

// Open image in modal
function openImageModal(src) {
  const modal = document.getElementById('modal')
  const modalImg = document.getElementById('modal-image')
  if (!modal || !modalImg || !src) return

  modalImg.src = src
  modal.classList.remove('hidden')
  if (window.gsap) {
    gsap.fromTo(
      modal,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }
    )
  }
  document.body.style.overflow = 'hidden'
}

// Set up modal close handlers (call once)
// Set up modal close handlers (call once)
let modalHandlersSet = false
function setupModalHandlers() {
  if (modalHandlersSet) return
  modalHandlersSet = true

  const modal = document.getElementById('modal')
  const modalClose = document.getElementById('modal-close')
  if (modal && modalClose) {
    const closeModal = () => {
      const finalize = () => {
        modal.classList.add('hidden')
        document.body.style.overflow = ''
        const modalImg = document.getElementById('modal-image')
        if (modalImg) modalImg.src = ''
      }
      if (window.gsap) {
        gsap.to(modal, {
          autoAlpha: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: finalize
        })
      } else {
        finalize()
      }
    }
    modalClose.addEventListener('click', closeModal)
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal()
    })
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden'))
        closeModal()
    })
  }
}

// Global data shim
let filmsData = { featured: {}, items: [] }

// Render featured video using vlitejs
function renderFeatured() {
  const container = document.getElementById('featured-video-container')
  if (!container) return

  // Wait for video-player module to load and expose initFeaturedPlayer
  const tryInit = () => {
    if (typeof window.initFeaturedPlayer === 'function') {
      window.initFeaturedPlayer({
        src: filmsData.featured.src || '',
        youtube: filmsData.featured.youtube || '',
        poster: filmsData.featured.poster || ''
      })
    } else {
      // Retry after a short delay if module not loaded yet
      setTimeout(tryInit, 100)
    }
  }
  tryInit()
}

// Render film cards from JSON
function renderFilmCards() {
  const grid = document.querySelector('#films .grid-films')
  if (!grid || !Array.isArray(filmsData.items)) return
  grid.innerHTML = filmsData.items
    .map(f => {
      const color = f.castColor || 'stone'
      // Map color to tailwind classes
      const bg = `bg-${color}-50`
      const border = `border-${color}-400`
      const title = `text-${color}-800`
      const text = `text-${color}-900`
      return `
                        <article class="bg-white rounded-lg overflow-hidden border border-stone-200 shadow-sm">
                            <div class="w-full bg-stone-100 aspect-video">
                                <img class="w-full h-full object-cover" src="${f.thumb
        }" alt="${f.title} still">
                            </div>
                            <div class="p-4 space-y-3">
                                <h3 class="text-lg font-semibold">${f.title
        }</h3>
                                <p class="text-stone-600 text-sm">${f.description
        }</p>
                                <div class="${bg} border-l-4 ${border} p-3 rounded">
                                    <div class="text-sm font-medium ${title}">Cast</div>
                                    <ul class="text-sm ${text} list-disc ml-4">
                                        ${(f.cast || [])
          .map(c => `<li>${c}</li>`)
          .join('')}
                                    </ul>
                                </div>
                            </div>
                        </article>`
    })
    .join('')
}

// Validate and sanitize filmsData loaded from JSON
function validateFilmsData(data) {
  try {
    if (!data || typeof data !== 'object') return null
    const out = { featured: { src: '', youtube: '', poster: '' }, items: [] }
    const f = data.featured || {}
    out.featured.src = typeof f.src === 'string' ? f.src : ''
    out.featured.youtube = typeof f.youtube === 'string' ? f.youtube : ''
    out.featured.poster = typeof f.poster === 'string' ? f.poster : ''
    if (Array.isArray(data.items)) {
      out.items = data.items
        .filter(it => it && typeof it === 'object')
        .map(it => ({
          title: typeof it.title === 'string' ? it.title : 'Untitled',
          thumb: typeof it.thumb === 'string' ? it.thumb : '',
          description: typeof it.description === 'string' ? it.description : '',
          castColor: typeof it.castColor === 'string' ? it.castColor : 'stone',
          cast: Array.isArray(it.cast)
            ? it.cast.filter(x => typeof x === 'string')
            : []
        }))
    }
    return out
  } catch (_) {
    return null
  }
}

// Try to fetch films data from external JSON
async function initFilms() {
  try {
    const res = await fetch('/data/films.json', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      const validated = validateFilmsData(json)
      if (validated) filmsData = validated
    }
  } catch (e) {
    /* keep inline fallback */
  }
  renderFeatured()
  renderFilmCards()
}

// initialize films after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFilms)
} else {
  initFilms()
}

// Run once on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnce)
} else {
  initOnce()
}

// Photos dynamic rendering
let photosData = { photos: [] }

async function loadPhotos() {
  try {
    const res = await fetch('/data/photos.json', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load photos')
    const json = await res.json()
    photosData = json
    return json
  } catch (e) {
    console.warn('Could not load photos.json:', e)
    return null
  }
}

function renderPhotos() {
  const grid = document.getElementById('photos-grid')
  if (!grid || !Array.isArray(photosData.photos)) return

  grid.innerHTML = photosData.photos
    .map(
      photo => `
        <div class="grid-item p-2">
          <img loading="lazy" decoding="async" class="rounded-lg shadow-md" src="${photo.src}" alt="${photo.alt || 'Photo'}">
        </div>
      `
    )
    .join('')
}

async function initPhotos() {
  await loadPhotos()
  renderPhotos()
  // Re-initialize Masonry after photos are loaded
  const grid = document.getElementById('photos-grid')
  if (grid && window.Masonry) {
    const msnry = new Masonry(grid, {
      itemSelector: '.grid-item',
      percentPosition: true
    })
    // Layout after images load and set up effects
    if (window.imagesLoaded) {
      imagesLoaded(grid, () => {
        msnry.layout()
        setupGridItemEffects(grid)
      })
    } else {
      setupGridItemEffects(grid)
    }
  } else {
    setupGridItemEffects(grid)
  }
}

// Auto-refresh photos every 15 minutes
function startPhotosAutoRefresh() {
  setInterval(async () => {
    const oldCount = photosData.photos?.length || 0
    await loadPhotos()
    const newCount = photosData.photos?.length || 0
    // Only re-render if count changed
    if (newCount !== oldCount) {
      renderPhotos()
      const grid = document.getElementById('photos-grid')
      if (grid && window.Masonry) {
        const msnry = new Masonry(grid, {
          itemSelector: '.grid-item',
          percentPosition: true
        })
        if (window.imagesLoaded) {
          imagesLoaded(grid, () => {
            msnry.layout()
            setupGridItemEffects(grid)
          })
        } else {
          setupGridItemEffects(grid)
        }
      } else {
        setupGridItemEffects(grid)
      }
    }
  }, 15 * 60 * 1000) // 15 minutes
}

// Initialize photos on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPhotos()
    startPhotosAutoRefresh()
  })
} else {
  initPhotos()
  startPhotosAutoRefresh()
}

// Works dynamic rendering
async function initWorks() {
  try {
    const res = await fetch('/data/works.json', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load works')
    const json = await res.json()
    const grid = document.querySelector('#works .grid')
    if (!grid) return
    const items = Array.isArray(json.items) ? json.items : []
    grid.innerHTML = items
      .map(
        w => `
                    <article class="grid-item p-2">
                      <div class="rounded-lg overflow-hidden aspect-square">
                        <img loading="lazy" decoding="async" class="w-full h-full object-cover" src="${w.thumb
          }" alt="${w.title || 'Work'}">
                      </div>
                      <div class="mt-3">
                        <p class="text-stone-600 text-sm">${w.description || ''
          }</p>
                        ${w.link
            ? `<a href="${w.link}" class="text-stone-900 hover:underline text-sm font-medium mt-2 inline-block">View work →</a>`
            : ''
          }
                      </div>
                    </article>
                  `
      )
      .join('')
  } catch (_) {
    /* keep static fallback if any */
  }
}
