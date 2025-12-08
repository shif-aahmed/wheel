import { useState, useEffect, useRef, useCallback } from 'react'
import { FiSettings, FiFile, FiFolder, FiSave, FiShare2, FiSearch, FiMaximize, FiChevronDown, FiGlobe, FiShuffle, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import './App.css'

function App() {
  const [names, setNames] = useState([
    'Ali', 'Beatriz', 'Charles', 'Diya', 'Eric', 'Fatima', 'Gabriel', 'Hanna'
  ])
  const [results, setResults] = useState([])
  const [activeTab, setActiveTab] = useState('entries')
  const [newName, setNewName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
  const [slowRotation, setSlowRotation] = useState(0)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [showWinner, setShowWinner] = useState(false)
  const [winner, setWinner] = useState(null)
  const wheelRef = useRef(null)
  const winnerProcessedRef = useRef(false)

  // Continuous slow rotation and update current rotation
  useEffect(() => {
    // Stop slow rotation when spinning, when winner is found, or when pop-up is shown
    if (!isSpinning && !winner) {
      const interval = setInterval(() => {
        setSlowRotation(prev => (prev + 1.5) % 360)
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isSpinning, winner])

  // Update current rotation continuously (for pointer color)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRotation(slowRotation + rotation)
    }, 16) // ~60fps
    return () => clearInterval(interval)
  }, [slowRotation, rotation])

  const addName = () => {
    if (newName.trim() && !names.includes(newName.trim())) {
      setNames([...names, newName.trim()])
      setNewName('')
    }
  }

  const removeName = (nameToRemove) => {
    setNames(names.filter(name => name !== nameToRemove))
  }

  const shuffleNames = () => {
    const shuffled = [...names].sort(() => Math.random() - 0.5)
    setNames(shuffled)
  }

  const sortNames = () => {
    const sorted = [...names].sort((a, b) => {
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    setNames(sorted)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addName()
    }
  }

  const spinWheel = useCallback(() => {
    if (isSpinning || names.length === 0) return
    
    setIsSpinning(true)
    const startRotation = currentRotation
    // Capture slowRotation at the start of spin (when button is clicked)
    const initialSlowRotation = slowRotation
    
    // Calculate random rotation (multiple full spins + random angle)
    const spins = 5 + Math.random() * 5 // 5-10 full spins
    winnerProcessedRef.current = false
    setRotation(prevRotation => {
      const randomAngle = Math.random() * 360
      const totalRotation = prevRotation + spins * 360 + randomAngle
      // Use initialSlowRotation (captured at spin start) for endRotation calculation
      const endRotation = initialSlowRotation + totalRotation
      
      // Animate currentRotation during spin to update pointer color
      const duration = 4000 // 4 seconds
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function matching CSS cubic-bezier(0.17, 0.67, 0.12, 0.99)
        const ease = (t) => {
          // Approximate cubic-bezier(0.17, 0.67, 0.12, 0.99)
          return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        
        const easedProgress = ease(progress)
        const current = startRotation + (endRotation - startRotation) * easedProgress
        setCurrentRotation(current)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsSpinning(false)
          // Only process winner once
          if (!winnerProcessedRef.current) {
            winnerProcessedRef.current = true
            // Get the actual final displayed rotation
            // The wheel displays: slowRotation + rotation
            // At completion: rotation will be set to totalRotation
            // We need both current slowRotation and rotation values
            // Use setTimeout to ensure state updates have completed
            setTimeout(() => {
              // Check ref to prevent duplicate processing
              if (!winnerProcessedRef.current) return
              
              // Set to false immediately to prevent re-entry
              winnerProcessedRef.current = false
              
              setSlowRotation(currentSlowRotation => {
                setRotation(currentRotation => {
                  // Final displayed rotation = currentSlowRotation + currentRotation
                  // currentRotation should be totalRotation at this point
                  const finalDisplayRotation = (currentSlowRotation + currentRotation) % 360
                  const sliceAngle = 360 / names.length
                  
                  // Pointer is at 0° (right side, pointing left into the wheel)
                  // When wheel rotates clockwise by R degrees, what's at pointer (0°) was originally at -R
                  // In standard coordinates: -R = 360 - R (normalized)
                  // Slices start at -90° (top) and are indexed clockwise
                  // To find which slice contains -R: convert to angle from top
                  const angleAtPointer = (360 - finalDisplayRotation) % 360
                  // Convert to angle from top (slices start at -90° which is 270° in standard)
                  // Top is at 270° in standard, so: (angleAtPointer + 90) % 360
                  const angleFromTop = (angleAtPointer + 90) % 360
                  // Now find which slice: floor(angleFromTop / sliceAngle)
                  const selectedIndex = Math.floor(angleFromTop / sliceAngle) % names.length
                  
                  const winnerName = names[selectedIndex]
                  const winnerColor = colors[selectedIndex % colors.length]
                  setWinner({ name: winnerName, color: winnerColor, index: selectedIndex })
                  // Add winner to results
                  setResults(prev => [...prev, winnerName])
                  setActiveTab('results')
                  // Wait 1 second before showing pop-up so user can see the winner on the wheel
                  setTimeout(() => {
                    setShowWinner(true)
                  }, 1000)
                  
                  return currentRotation
                })
                return currentSlowRotation
              })
            }, 0)
          }
        }
      }
      
      requestAnimationFrame(animate)
      
      return totalRotation
    })
  }, [isSpinning, names, currentRotation, slowRotation])

  const handleWheelClick = () => {
    if (!showWinner) {
      spinWheel()
    }
  }

  const handleCloseWinner = () => {
    setShowWinner(false)
    setWinner(null)
  }

  const handleRemoveWinner = () => {
    if (winner) {
      removeName(winner.name)
      setShowWinner(false)
      setWinner(null)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  const sortResults = () => {
    const sorted = [...results].sort((a, b) => {
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    setResults(sorted)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        spinWheel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [spinWheel])

  const colors = ['rgb(255, 217, 0)', 'rgb(0, 177, 0)', 'rgb(0, 195, 255)', 'rgb(255, 64, 64)'] // blue, green, yellow, red


  return (
    <div className="app">
      {/* Header Navigation Bar */}
      <header className="header">
        <div className="header-right">
          <button className="header-btn" title="Customize">
            <FiSettings className="icon" />
            <span>Customize</span>
          </button>
          <button className="header-btn" title="New">
            <FiFile className="icon" />
            <span>New</span>
          </button>
          <button className="header-btn" title="Open">
            <FiFolder className="icon" />
            <span>Open</span>
          </button>
          <button className="header-btn" title="Save">
            <FiSave className="icon" />
            <span>Save</span>
          </button>
          <button className="header-btn" title="Share">
            <FiShare2 className="icon" />
            <span>Share</span>
          </button>
          <button className="header-btn" title="Gallery">
            <FiSearch className="icon" />
            <span>Gallery</span>
          </button>
          <button className="header-btn" title="Fullscreen">
            <FiMaximize className="icon" />
          </button>
          <button className="header-btn dropdown" title="More">
            <span>More</span>
            <FiChevronDown className="icon" />
          </button>
          <button className="header-btn dropdown" title="Language">
            <FiGlobe className="icon" />
            <span>English</span>
            <FiChevronDown className="icon" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Center - Wheel */}
        <div className="wheel-container">
          <div className="wheel-wrapper" onClick={handleWheelClick} style={{ cursor: (isSpinning || showWinner) ? 'not-allowed' : 'pointer' }}>
            <svg 
              className="wheel" 
              viewBox="0 0 750 750"
              ref={wheelRef}
              style={{ transform: `rotate(${slowRotation + rotation}deg)` }}
            >
              <defs>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
                </filter>
              </defs>
              {names.map((name, index) => {
                const angle = (360 / names.length)
                const startAngle = (index * angle - 90) * (Math.PI / 180)
                const endAngle = ((index + 1) * angle - 90) * (Math.PI / 180)
                const largeArc = angle > 180 ? 1 : 0
                
                const x1 = 375 + 340 * Math.cos(startAngle)
                const y1 = 375 + 340 * Math.sin(startAngle)
                const x2 = 375 + 340 * Math.cos(endAngle)
                const y2 = 375 + 340 * Math.sin(endAngle)
                
                const path = `M 375 375 L ${x1} ${y1} A 340 340 0 ${largeArc} 1 ${x2} ${y2} Z`
                
                // Calculate middle angle for text positioning
                const midAngle = (startAngle + endAngle) / 2
                
                // Position text along the radial direction (from inner to outer)
                // Text should be horizontal along the slice length
                const innerRadius = 120
                const outerRadius = 280
                const textRadius = (innerRadius + outerRadius) / 2
                
                // Calculate text position at middle radius of slice
                const textX = 375 + textRadius * Math.cos(midAngle)
                const textY = 375 + textRadius * Math.sin(midAngle)
                
                // Rotate text to align with the slice direction (radial, from center outward)
                // Text should be horizontal along the slice length
                const textRotationDeg = (midAngle * 180 / Math.PI)
                
                return (
                  <g key={index}>
                    <path
                      d={path}
                      fill={colors[index % colors.length]}
                      stroke="black"
                      strokeWidth="0.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="18"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotationDeg} ${textX} ${textY})`}
                      style={{ 
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {name}
                    </text>
                  </g>
                )
              })}
              <circle cx="375" cy="375" r="55" fill="white" filter="url(#shadow)"/>
            </svg>
            <div className="wheel-pointer"></div>
            <div className="wheel-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="spin-text">{isSpinning ? 'Spinning...' : 'Click to spin'}</div>
              <div className="spin-text-small">or press ctrl+enter</div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Entries */}
        <div className={`right-sidebar ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
          {isSidebarHidden ? (
            <div className="sidebar-header-hidden">
              <label className="hide-checkbox">
                <input 
                  type="checkbox" 
                  checked={isSidebarHidden}
                  onChange={(e) => setIsSidebarHidden(e.target.checked)}
                />
                <span>Hide</span>
              </label>
            </div>
          ) : (
            <>
              <div className="sidebar-header">
                <div className="tabs">
                  <button 
                    className={`tab ${activeTab === 'entries' ? 'active' : ''}`}
                    onClick={() => setActiveTab('entries')}
                  >
                    Entries {names.length}
                  </button>
                  <button 
                    className={`tab ${activeTab === 'results' ? 'active' : ''}`}
                    onClick={() => setActiveTab('results')}
                  >
                    Results {results.length}
                  </button>
                </div>
                <label className="hide-checkbox">
                  <input 
                    type="checkbox" 
                    checked={isSidebarHidden}
                    onChange={(e) => setIsSidebarHidden(e.target.checked)}
                  />
                  <span>Hide</span>
                </label>
              </div>
              
              {activeTab === 'entries' ? (
                <>
                  <div className="sidebar-actions">
                    <button className="action-btn" onClick={shuffleNames} title="Shuffle">
                      <FiShuffle className="icon" />
                      <span>Shuffle</span>
                    </button>
                    <button className="action-btn" onClick={sortNames} title="Sort">
                      <span className="icon" style={{ display: 'flex', flexDirection: 'column', lineHeight: '0.5' }}>
                        <FiArrowUp style={{ fontSize: '10px' }} />
                        <FiArrowDown style={{ fontSize: '10px' }} />
                      </span>
                      <span>Sort</span>
                    </button>
                    <button className="action-btn dropdown" title="Add image">
                      <span>Add image</span>
                      <FiChevronDown className="icon" />
                    </button>
                    <label className="advanced-checkbox">
                      <input 
                        type="checkbox" 
                        checked={showAdvanced}
                        onChange={(e) => setShowAdvanced(e.target.checked)}
                      />
                      <span>Advanced</span>
                    </label>
                  </div>

                  <div className="entries-list">
                    <div className="add-name-input">
                      <input
                        type="text"
                        placeholder="Add name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <button onClick={addName}>+</button>
                    </div>
                    <div className="names-container">
                      {names.map((name, index) => (
                        <div key={index} className="name-item">
                          <span>{name}</span>
                          <button 
                            className="remove-btn"
                            onClick={() => removeName(name)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="sidebar-actions">
                    <button className="action-btn" onClick={sortResults} title="Sort">
                      <FiArrowUp className="icon" />
                      <span>Sort</span>
                    </button>
                    <button className="action-btn" onClick={clearResults} title="Clear the list">
                      <span className="icon">×</span>
                      <span>Clear the list</span>
                    </button>
                  </div>

                  <div className="entries-list">
                    <div className="names-container">
                      {results.length === 0 ? (
                        <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                          No results yet
                        </div>
                      ) : (
                        results.map((name, index) => (
                          <div key={index} className="name-item">
                            <span>{name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
              
              <div className="sidebar-footer">
                <span className="version-text">Version 387</span>
                <a href="#" className="changelog-link">Changelog</a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Winner Pop-up */}
      {showWinner && winner && (
        <div className="winner-overlay" onClick={handleCloseWinner}>
          <div className="winner-popup" onClick={(e) => e.stopPropagation()}>
            <div className="winner-header" style={{ backgroundColor: winner.color }}>
              <h2>We have a winner!</h2>
              <button className="winner-close-btn" onClick={handleCloseWinner}>×</button>
            </div>
            <div className="winner-content">
              <div className="winner-name">{winner.name}</div>
              <div className="winner-buttons">
                <button className="winner-btn close-btn" onClick={handleCloseWinner}>Close</button>
                <button className="winner-btn remove-btn" onClick={handleRemoveWinner}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
