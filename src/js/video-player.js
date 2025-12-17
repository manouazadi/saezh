import Vlitejs from 'vlitejs'
import VlitejsYoutube from 'vlitejs/providers/youtube'
import 'vlitejs/vlite.css'

// Register YouTube provider
Vlitejs.registerProvider('youtube', VlitejsYoutube)

let playerInstance = null

/**
 * Initialize the featured video player
 * @param {Object} config - Configuration object
 * @param {string} config.src - Direct video URL (mp4, etc.)
 * @param {string} config.youtube - YouTube video ID or URL
 * @param {string} config.poster - Poster image URL
 */
export function initFeaturedPlayer(config = {}) {
  const container = document.getElementById('featured-video-container')
  if (!container) return

  // Destroy existing player if any
  if (playerInstance) {
    playerInstance.destroy()
    playerInstance = null
  }

  // Clear container
  container.innerHTML = ''

  // Determine if YouTube or native video
  const isYouTube = !!config.youtube
  
  if (isYouTube) {
    // Extract video ID from YouTube URL if full URL provided
    const videoId = extractYouTubeId(config.youtube)
    
    // Create YouTube div
    const ytDiv = document.createElement('div')
    ytDiv.id = 'featured-video'
    ytDiv.dataset.youtubeId = videoId
    container.appendChild(ytDiv)

    playerInstance = new Vlitejs('#featured-video', {
      provider: 'youtube',
      options: {
        autoplay: false,
        controls: true,
        playPause: true,
        progressBar: true,
        time: true,
        volume: true,
        fullscreen: true,
        poster: config.poster || '',
        bigPlay: true,
        playsinline: true,
        loop: false,
        muted: false
      }
    })
  } else if (config.src) {
    // Create native video element
    const video = document.createElement('video')
    video.id = 'featured-video'
    video.className = 'w-full h-full object-cover'
    video.setAttribute('playsinline', '')
    if (config.poster) video.setAttribute('poster', config.poster)
    
    const source = document.createElement('source')
    source.src = config.src
    source.type = 'video/mp4'
    video.appendChild(source)
    container.appendChild(video)

    playerInstance = new Vlitejs('#featured-video', {
      options: {
        autoplay: false,
        controls: true,
        playPause: true,
        progressBar: true,
        time: true,
        volume: true,
        fullscreen: true,
        bigPlay: true,
        playsinline: true,
        loop: false,
        muted: false
      }
    })
  } else {
    // No video source - show placeholder
    container.innerHTML = `
      <div class="w-full h-full flex items-center justify-center bg-stone-300 text-stone-600">
        <span>No video available</span>
      </div>
    `
  }
}

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} input - YouTube URL or video ID
 * @returns {string} - Video ID
 */
function extractYouTubeId(input) {
  if (!input) return ''
  
  // Already just an ID (11 characters, alphanumeric with dashes/underscores)
  if (/^[\w-]{11}$/.test(input)) return input
  
  // Try to extract from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/v\/([^&\s?]+)/
  ]
  
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1]
  }
  
  return input
}

// Expose to window for use in main.js
window.initFeaturedPlayer = initFeaturedPlayer

