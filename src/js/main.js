function initOnce () {
  const grids = document.querySelectorAll('#home .grid, #works .grid')

  const masonryInstances = []
  grids.forEach(g => {
    const msnry = new Masonry(g, {
      itemSelector: '.grid-item',
      percentPosition: true
    })
    masonryInstances.push({ el: g, msnry })
  })

  // Ensure grid entrance animation runs on initial load/refresh
  function setupGridEntranceOnLoad () {
    const animatedGridsLoad = new WeakSet()
    const run = () => {
      const gridsArr = Array.from(grids)
      gridsArr.forEach(gridEl => {
        if (!window.imagesLoaded || !window.gsap) return
        imagesLoaded(gridEl, { background: false }, () => {
          if (animatedGridsLoad.has(gridEl)) return
          animatedGridsLoad.add(gridEl)
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
          gsap.set(items, {
            y: 30,
            autoAlpha: 0,
            scale: 0.97,
            filter: 'blur(2px)'
          })

          // Cinematic micro-overshoot + blur/opacity tail
          rows.forEach((row, idx) => {
            const tl = gsap.timeline({ delay: idx * 0.12 })
            tl.to(
              row.els,
              {
                y: 0,
                scale: 1.012,
                duration: 0.7,
                ease: 'cubic-bezier(0.25, 1, 0.5, 1)',
                stagger: 0.05
              },
              0
            )
            tl.to(
              row.els,
              {
                scale: 1,
                duration: 0.25,
                ease: 'power1.out',
                stagger: 0.05
              },
              0.62
            )
            tl.to(
              row.els,
              {
                filter: 'blur(0px)',
                autoAlpha: 1,
                duration: 1.1,
                ease: 'power2.out',
                stagger: 0.05
              },
              0.1
            )
          })
        })
      })
    }

    if (window.imagesLoaded && window.gsap) run()
    else window.addEventListener('load', run)
  }

  setupGridEntranceOnLoad()

  // THEME: light, dark, golden hour, blue hour
  const THEME_KEYS = ['light', 'dark', 'golden', 'blue']
  const THEME_CLASSES = THEME_KEYS.map(k => `theme-${k}`)

  function minutesSinceMidnight (d) {
    return d.getHours() * 60 + d.getMinutes()
  }

  // Heuristic fallback if precise calc unavailable
  function detectThemeHeuristic (now = new Date()) {
    const m = minutesSinceMidnight(now)
    const blueMorning = m >= 5 * 60 + 15 && m < 6 * 60
    const goldenMorning = m >= 6 * 60 && m < 7 * 60 + 30
    const goldenEvening = m >= 17 * 60 + 30 && m < 19 * 60
    const blueEvening = m >= 19 * 60 && m < 19 * 60 + 45
    if (blueMorning || blueEvening) return 'blue'
    if (goldenMorning || goldenEvening) return 'golden'
    if (m >= 20 * 60 || m < 6 * 60) return 'dark'
    return 'light'
  }

  // Precise theme using SunCalc + geolocation
  let GEO_POS = null
  function detectThemePrecise (now = new Date()) {
    try {
      if (!GEO_POS || !window.SunCalc || typeof SunCalc.getTimes !== 'function')
        return detectThemeHeuristic(now)
      const { latitude, longitude } = GEO_POS
      const times = SunCalc.getTimes(now, latitude, longitude)
      const n = now.getTime()
      const t = key =>
        times && times[key] instanceof Date ? times[key].getTime() : NaN
      const between = (a, b) => !isNaN(a) && !isNaN(b) && n >= a && n < b

      // Blue hour around civil twilight
      const blueMorning = between(t('dawn'), t('sunriseEnd'))
      const blueEvening = between(t('sunsetStart'), t('dusk'))

      // Golden hour windows
      const goldenMorning = between(t('sunriseEnd'), t('goldenHourEnd'))
      const goldenEvening = between(t('goldenHour'), t('sunsetStart'))

      if (blueMorning || blueEvening) return 'blue'
      if (goldenMorning || goldenEvening) return 'golden'

      // Day vs night
      const isDay = between(t('sunrise'), t('sunset'))
      return isDay ? 'light' : 'dark'
    } catch (_) {
      return detectThemeHeuristic(now)
    }
  }

  // Wrapper
  function detectTimeTheme (now = new Date()) {
    return detectThemePrecise(now)
  }

  function currentTheme () {
    for (const k of THEME_KEYS)
      if (document.body.classList.contains(`theme-${k}`)) return k
    return null
  }

  function updateToggleUI (theme) {
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

    const title =
      theme === 'golden'
        ? 'Golden hour theme'
        : theme === 'blue'
        ? 'Blue hour theme'
        : isLightish
        ? 'Light theme'
        : 'Dark theme'
    btn.setAttribute('title', title)
    btn.setAttribute('aria-label', title)
  }

  function setTheme (theme) {
    document.body.classList.remove(...THEME_CLASSES)
    document.body.classList.add(`theme-${theme}`)
    updateToggleUI(theme)
    // Optionally also update meta theme-color for mobile UI
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const color =
        theme === 'dark'
          ? '#0b0b0b'
          : theme === 'blue'
          ? '#0f172a'
          : theme === 'golden'
          ? '#fff7ed'
          : '#fafaf9'
      meta.setAttribute('content', color)
    }
  }

  // Initialize based on time of day (golden/blue only during their windows)
  let userOverride = false
  const initialTheme = detectTimeTheme()
  setTheme(initialTheme)

  const toggleBtn = document.getElementById('theme-toggle')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      userOverride = true
      const c = currentTheme() || initialTheme
      const next = c === 'dark' || c === 'blue' ? 'light' : 'dark'
      setTheme(next)
    })
  }

  // Periodically re-evaluate time-based theme if user hasn't overridden
  setInterval(() => {
    if (userOverride) return
    const t = detectTimeTheme()
    if (t !== currentTheme()) setTheme(t)
  }, 60000)

  // Acquire geolocation for precise sun times (updates immediately if no override)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        try {
          GEO_POS = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }
          if (!userOverride) setTheme(detectThemePrecise(new Date()))
        } catch (_) {}
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 3600000, timeout: 5000 }
    )
  }

  // GSAP plugins
  if (window.gsap) {
    gsap.registerPlugin(ScrollToPlugin)
    // Smooth horizontal scrolling between sections
    const scroller = document.getElementById('hscroll')
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const hash = link.getAttribute('href')
        const target = document.querySelector(hash)
        if (target && scroller) {
          e.preventDefault()
          gsap.to(scroller, {
            duration: 0.6,
            scrollTo: { x: target },
            ease: 'power2.out'
          })
        }

        // Guard so entrance animation plays only once per grid
        const animatedGrids = new WeakSet()

        // Wait for images to be loaded before animating
        if (window.imagesLoaded && window.gsap) {
          const gridsArr = Array.from(grids)
          gridsArr.forEach(gridEl => {
            imagesLoaded(gridEl, { background: false }, () => {
              if (animatedGrids.has(gridEl)) return // already animated once
              animatedGrids.add(gridEl)
              // Re-layout Masonry for this grid to ensure final positions
              const inst = masonryInstances.find(m => m.el === gridEl)
              if (
                inst &&
                inst.msnry &&
                typeof inst.msnry.layout === 'function'
              ) {
                inst.msnry.layout()
              }

              // Stagger by row: group items by their top position after Masonry layout
              const nodeList = gridEl.querySelectorAll('.grid-item')
              const items = Array.from(nodeList)
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
              const threshold = 10 // px tolerance for same row
              mapped.forEach(entry => {
                const last = rows[rows.length - 1]
                if (!last || Math.abs(entry.top - last.top) > threshold) {
                  rows.push({ top: entry.top, els: [entry.el] })
                } else {
                  last.els.push(entry.el)
                }
              })

              // Initial state with softer, smoother motion
              gsap.set(items, {
                y: 30,
                autoAlpha: 0,
                scale: 0.97,
                filter: 'blur(2px)'
              })

              // Animate rows with a cinematic ease and a slight blur/opacity tail
              rows.forEach((row, idx) => {
                const tl = gsap.timeline({ delay: idx * 0.12 })
                // Primary motion (position + micro-overshoot scale)
                tl.to(
                  row.els,
                  {
                    y: 0,
                    scale: 1.012,
                    duration: 0.7,
                    ease: 'cubic-bezier(0.25, 1, 0.5, 1)',
                    stagger: 0.05
                  },
                  0
                )
                // Settle from overshoot to 1.0
                tl.to(
                  row.els,
                  {
                    scale: 1,
                    duration: 0.25,
                    ease: 'power1.out',
                    stagger: 0.05
                  },
                  0.62
                )
                // Tail: blur reduces and opacity finishes just after the motion
                tl.to(
                  row.els,
                  {
                    filter: 'blur(0px)',
                    autoAlpha: 1,
                    duration: 1.1,
                    ease: 'power2.out',
                    stagger: 0.05
                  },
                  0.1
                )
              })
            })
          })
        }
      })
    })
  }

  // Active nav highlighting (bold + darker text on current section)
  ;(function () {
    const sections = Array.from(document.querySelectorAll('main section[id]'))
    const navLinks = Array.from(
      document.querySelectorAll('header nav a[href^="#"]')
    )

    function setActive (id) {
      navLinks.forEach(a => {
        const active = a.getAttribute('href') === `#${id}`

        a.classList.toggle('font-bold', active)
        a.classList.toggle('text-stone-900', active)
        a.setAttribute('aria-current', active ? 'page' : 'false')
      })
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
    const currentHash = (location.hash || '').replace('#', '')
    if (currentHash) setActive(currentHash)
    else if (sections[0]) setActive(sections[0].id)

    // On click, set active instantly for responsiveness
    navLinks.forEach(a => {
      a.addEventListener('click', () => {
        const href = a.getAttribute('href') || ''
        if (href.startsWith('#')) setActive(href.slice(1))
      })
    })
  })()

  // Subtle 3D tilt on mouse move + z-index on hover
  const maxTilt = 6 // degrees for X/Y
  const maxZ = 3 // degrees for Z
  const items = document.querySelectorAll('.grid-item')

  items.forEach(item => {
    let raf = null

    const applyTilt = (rx, ry, rz) => {
      item.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`
    }

    item.addEventListener('mousemove', e => {
      const rect = item.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2
      const ry = ((x - cx) / cx) * maxTilt // rotateY
      const rx = -((y - cy) / cy) * maxTilt // rotateX
      const rz = ((x - cx) / cx) * maxZ // subtle rotateZ (twist)

      if (!raf) {
        raf = requestAnimationFrame(() => {
          applyTilt(rx.toFixed(2), ry.toFixed(2), rz.toFixed(2))
          raf = null
        })
      }
    })

    item.addEventListener('mouseenter', () => {
      const computed = window.getComputedStyle(item)
      item.dataset.prevZ = item.style.zIndex || computed.zIndex || ''
      item.style.zIndex = '9999'
    })

    const resetTilt = () => {
      // cancel any scheduled frame to avoid re-applying a tilt after reset
      if (raf) {
        cancelAnimationFrame(raf)
        raf = null
      }
      item.style.zIndex = item.dataset.prevZ || ''
      applyTilt(0, 0, 0) // reset to original position
    }

    item.addEventListener('mouseleave', resetTilt)
    item.addEventListener('pointerleave', resetTilt)

    // Click to open modal with full resolution
    item.addEventListener('click', () => {
      const img = item.querySelector('img')
      const fullSrc = img?.dataset?.full || img?.src
      const modal = document.getElementById('modal')
      const modalImg = document.getElementById('modal-image')
      if (!modal || !modalImg || !fullSrc) return

      modalImg.src = fullSrc
      modal.classList.remove('hidden')
      if (window.gsap) {
        gsap.fromTo(
          modal,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }
        )
      }
      document.body.style.overflow = 'hidden'
    })
  })

  // Modal close handlers
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

// Render featured video
function renderFeatured () {
  const video = document.getElementById('featured-video')
  if (!video) return
  const source = video.querySelector('source')
  if (source && filmsData.featured.src) {
    source.src = filmsData.featured.src
    video.load()
  }
  if (filmsData.featured.poster) {
    video.setAttribute('poster', filmsData.featured.poster)
  }
}

// Render film cards from JSON
function renderFilmCards () {
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
                                <img class="w-full h-full object-cover" src="${
                                  f.thumb
                                }" alt="${f.title} still">
                            </div>
                            <div class="p-4 space-y-3">
                                <h3 class="text-lg font-semibold">${
                                  f.title
                                }</h3>
                                <p class="text-stone-600 text-sm">${
                                  f.description
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
function validateFilmsData (data) {
  try {
    if (!data || typeof data !== 'object') return null
    const out = { featured: { src: '', poster: '' }, items: [] }
    const f = data.featured || {}
    out.featured.src = typeof f.src === 'string' ? f.src : ''
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
async function initFilms () {
  try {
    const res = await fetch('/public/data/films.json', { cache: 'no-store' })
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

// Works dynamic rendering
async function initWorks () {
  try {
    const res = await fetch('/public/data/works.json', { cache: 'no-store' })
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
                        <img loading="lazy" decoding="async" class="w-full h-full object-cover" src="${
                          w.thumb
                        }" alt="${w.title || 'Work'}">
                      </div>
                      <div class="mt-3">
                        <p class="text-stone-600 text-sm">${
                          w.description || ''
                        }</p>
                        ${
                          w.link
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
