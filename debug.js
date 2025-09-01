// AR Application Debug Helper
export function initDebugger() {
  const debugInfo = {
    browser: navigator.userAgent,
    webGL: checkWebGL(),
    camera: false,
    https: window.location.protocol === 'https:',
    deviceOrientation: 'DeviceOrientationEvent' in window,
    mediaDevices: 'mediaDevices' in navigator,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  };

  // Check WebGL support
  function checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch(e) {
      return false;
    }
  }

  // Check camera permissions
  async function checkCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      debugInfo.camera = true;
      return true;
    } catch(e) {
      console.error('Camera access error:', e);
      debugInfo.cameraError = e.message;
      return false;
    }
  }

  // Create debug panel
  function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-info-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      cursor: move;
    `;

    // Make panel draggable
    let isDragging = false;
    let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    panel.addEventListener('mousedown', dragStart);
    panel.addEventListener('touchstart', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
      if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
      } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
      }

      if (e.target === panel) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();

        if (e.type === "touchmove") {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;

        panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    return panel;
  }

  // Update debug info display
  function updateDebugDisplay(panel) {
    const statusIcon = (status) => status ? '✅' : '❌';
    
    panel.innerHTML = `
      <h4 style="margin: 0 0 10px 0;">AR Debug Info</h4>
      <div>WebGL: ${statusIcon(debugInfo.webGL)}</div>
      <div>HTTPS: ${statusIcon(debugInfo.https)}</div>
      <div>Camera API: ${statusIcon(debugInfo.mediaDevices)}</div>
      <div>Camera Access: ${statusIcon(debugInfo.camera)} ${debugInfo.cameraError || ''}</div>
      <div>Device Orientation: ${statusIcon(debugInfo.deviceOrientation)}</div>
      <hr style="margin: 10px 0;">
      <div style="font-size: 10px;">Browser: ${debugInfo.browser.substring(0, 50)}...</div>
      <hr style="margin: 10px 0;">
      <button id="close-debug" style="
        background: #ff3366;
        border: none;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
      ">Close Debug Panel</button>
    `;

    // Add close functionality
    const closeBtn = panel.querySelector('#close-debug');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.style.display = 'none';
      });
    }
  }

  // Initialize debug panel
  const panel = createDebugPanel();
  document.body.appendChild(panel);

  // Check camera and update display
  checkCamera().then(() => {
    updateDebugDisplay(panel);
  });

  // Add keyboard shortcut to toggle debug panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' && e.ctrlKey) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });

  return debugInfo;
}

// Performance monitor
export function createPerformanceMonitor() {
  const monitor = document.createElement('div');
  monitor.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0,0,0,0.7);
    color: #0f0;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    border-radius: 4px;
    z-index: 10000;
  `;

  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
      
      monitor.textContent = `FPS: ${fps}`;
    }
    
    requestAnimationFrame(updateFPS);
  }

  document.body.appendChild(monitor);
  updateFPS();

  return monitor;
}