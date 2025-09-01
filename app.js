import { MindARThree } from "mindar";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Create a scanning UI that appears before AR starts
  createScanningUI();
  
  // Initialize MindAR with better camera settings
  const mindarThree = new MindARThree({
    container: document.querySelector("#ar-container"),
    imageTargetSrc: "./assets/target/postcard.mind",
    uiScanning: false, // We'll handle our own scanning UI
    uiLoading: true,   // Show loading indicator
    maxTrack: 1        // Only track one image for better stability
  });
  
  const { renderer, scene, camera } = mindarThree;
  
  // Main anchor for the target image
  const anchor = mindarThree.addAnchor(0);
  
  // Store clickable meshes
  const clickableMeshes = [];
  
  // Debug mode for testing - adds a grid to visualize coordinate space
  const DEBUG_MODE = window.location.search.includes('debug=true'); // Enable with ?debug=true in URL
  if (DEBUG_MODE) {
    const gridHelper = new THREE.GridHelper(2, 20);
    anchor.group.add(gridHelper);
    
    // Import and initialize debugger
    import('./debug.js').then(module => {
      module.initDebugger();
      module.createPerformanceMonitor();
    });
  }
  
  // IMPROVED: Anchor points based on normalized postcard coordinates
  // Values from -0.5 to 0.5 on both axes, with (0,0) at center
  const anchorPoints = [
    new THREE.Vector3(0.25, 0.2, 0),   // In the 'U' of DUBAI
    new THREE.Vector3(0.05, -0.3, 0),  // Near the red location pin
    new THREE.Vector3(-0.3, 0.15, 0)   // In the 'D' of DUBAI
  ];
  
  // Label positions adjusted for better visibility
  const labelPositions = [
    new THREE.Vector3(0.2, 0.4, 0),    // Top-right but within safe margins
    new THREE.Vector3(0.0, -0.45, 0),  // Below the pin but within view
    new THREE.Vector3(-0.3, 0.35, 0)   // Above 'D' but within safe margins
  ];
  
  // Set text for labels
  const labelTexts = [
    "Visit Our Website",
    "Explore Dubai",
    "Explore Maps byDisrupt"
  ];
  
  // Set URLs for labels
  const labelUrls = [
    "https://www.bydisrupt.com/",
    "https://en.wikipedia.org/wiki/Dubai",
    "https://www.bydisrupt.com/map-bydisrupt"
  ];
  
  // ADDED: Load the Burj Khalifa 3D model from a URL
  const loadBurjKhalifaModel = async () => {
    const loader = new GLTFLoader();
    
    // Create loading progress indicator
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 20px;
      background: rgba(0,0,0,0.5);
      border-radius: 10px;
      overflow: hidden;
      z-index: 1000;
      display: none;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: #1a73e8;
      width: 0%;
      transition: width 0.3s ease;
    `;
    
    progressBar.appendChild(progressFill);
    document.body.appendChild(progressBar);
    
    try {
      console.log('Loading Burj Khalifa model...');
      progressBar.style.display = 'block';
      
      // Load the actual model from the target folder with progress tracking
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          './assets/target/burj_khalifa.glb',
          (gltf) => resolve(gltf),
          (progress) => {
            const percentComplete = (progress.loaded / progress.total) * 100;
            progressFill.style.width = percentComplete + '%';
            console.log('Loading progress:', Math.round(percentComplete) + '%');
          },
          (error) => reject(error)
        );
      });
      
      const model = gltf.scene;
      
      // Hide progress bar after loading
      progressBar.style.display = 'none';
      document.body.removeChild(progressBar);
      
      // Create a group to hold the model
      const burjGroup = new THREE.Group();
      
      // Scale the model to be appropriately sized (much smaller)
      model.scale.set(0.02, 0.02, 0.02); // Reasonable size for AR
      
      // FIXED: Make building always point UP (world up direction) regardless of postcard orientation
      // Instead of rotating relative to postcard, we'll adjust this in the render loop
      model.rotation.x = 0;      // Reset rotations - we'll handle orientation in render loop
      model.rotation.y = 0;
      model.rotation.z = 0;
      
      // Ensure materials render properly in AR with better lighting
      model.traverse((child) => {
        if (child.isMesh) {
          // Make sure materials are visible
          if (child.material) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
            
            // Add ambient lighting to materials to see architectural details
            if (child.material.emissive) {
              child.material.emissive.setHex(0x404040); // Subtle glow
            }
            
            // Ensure materials respond to light properly
            if (child.material.metalness !== undefined) {
              child.material.metalness = 0.3;  // Some metallic reflection
              child.material.roughness = 0.7;  // Not too shiny
            }
            
            // For basic materials, add some ambient color
            if (child.material.type === 'MeshBasicMaterial') {
              child.material.color.multiplyScalar(1.2); // Brighten the material
            }
          }
        }
      });
      
      // Add lights to the model group to illuminate architectural details
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
      burjGroup.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1); // Light from above and side
      burjGroup.add(directionalLight);
      
      // Add another light from the opposite side to reduce shadows
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLight.position.set(-1, 0.5, -1);
      burjGroup.add(fillLight);
      
      burjGroup.add(model);
      console.log('Burj Khalifa model loaded successfully');
      return burjGroup;
      
    } catch (error) {
      console.error('Error loading Burj Khalifa model:', error);
      
      // Fallback to a simple model if loading fails
      const fallbackGroup = new THREE.Group();
      
      // Simple cone as fallback - make it huge and upright too
      const coneGeometry = new THREE.ConeGeometry(0.15, 1.0, 8);  // Much larger cone
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: false
      });
      
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      // Position cone so bottom touches the postcard
      cone.position.y = 0.5; // Half the height to put bottom at Y=0
      fallbackGroup.add(cone);
      
      // Add a sphere on top
      const sphereGeometry = new THREE.SphereGeometry(0.05, 8, 8);  // Larger sphere
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: false
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.y = 1.0; // At the top of the cone
      fallbackGroup.add(sphere);
      
      console.log('Using fallback Burj Khalifa model - check if burj_khalifa.glb exists in assets/target/');
      return fallbackGroup;
    }
  };
  
  // Create animation marker
  const createAnchorMarker = (position, color = 0xff0000) => {
    // Create pulsing effect container
    const markerGroup = new THREE.Group();
    markerGroup.position.copy(position);
    
    // Main marker sphere
    const geometry = new THREE.SphereGeometry(0.015, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.9
    });
    const marker = new THREE.Mesh(geometry, material);
    markerGroup.add(marker);
    
    // Pulsing outer sphere
    const pulseGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5
    });
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    markerGroup.add(pulse);
    
    // Add animation data to the marker group
    markerGroup.userData.animationData = {
      time: Math.random() * Math.PI * 2, // Random start time for variety
      pulse: pulse
    };
    
    anchor.group.add(markerGroup);
    return markerGroup;
  };
  
  // IMPROVED: Create label with better styling and make ONLY the label clickable
  const createLabel = (text, anchorPoint, labelPosition, url) => {
    // Create animated marker at the anchor point
    const marker = createAnchorMarker(anchorPoint, 0xff3366);
    
    // Create canvas for text with higher resolution
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;
    
    // Draw background with rounded corners and gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(40, 40, 40, 0.85)");
    gradient.addColorStop(1, "rgba(20, 20, 20, 0.95)");
    ctx.fillStyle = gradient;
    
    // Rounded rectangle
    const cornerRadius = 15;
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(canvas.width - cornerRadius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    ctx.lineTo(canvas.width, canvas.height - cornerRadius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    ctx.lineTo(cornerRadius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.fill();
    
    // Add border
    ctx.strokeStyle = "#ff3366";
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Add text with shadow for better readability
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and material with better filtering
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true 
    });
    
    // Create the label with appropriate aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    const width = 0.4; // Reduced size for better visibility
    const height = width / aspectRatio;
    
    // SIMPLE FIX: Make the label geometry larger for easier tapping, but keep visual the same
    const labelAspectRatio = canvas.width / canvas.height;
    const visualWidth = 0.4; // Visual size stays the same
    const visualHeight = visualWidth / labelAspectRatio;
    
    // Make the actual clickable geometry 40% larger for easier tapping
    const tapWidth = visualWidth * 1.4;
    const tapHeight = visualHeight * 1.4;
    
    const labelGeometry = new THREE.PlaneGeometry(tapWidth, tapHeight);
    const visibleLabel = new THREE.Mesh(labelGeometry, material);
    visibleLabel.position.copy(labelPosition);
    visibleLabel.position.z = 0.01; // Small z offset to be in front of arrow
    
    // Add data to the visible label
    visibleLabel.userData = {
      url: url,
      originalScale: new THREE.Vector3(1, 1, 1),
      isHovered: false,
      isClickable: true // Flag to identify clickable objects
    };
    
    // Add the visible label to the anchor
    anchor.group.add(visibleLabel);
    
    // IMPORTANT: Add the visible label to clickable meshes
    clickableMeshes.push(visibleLabel);
    
    // Create connecting line
    const lineMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff3366,
      transparent: true,
      opacity: 0.7
    });
    
    // Create a cylinder instead of a line for better visibility
    const distance = new THREE.Vector3().subVectors(labelPosition, anchorPoint).length();
    const direction = new THREE.Vector3().subVectors(labelPosition, anchorPoint).normalize();
    const arrow = new THREE.ArrowHelper(direction, anchorPoint, distance, 0xff3366, 0.03, 0.02);
    
    anchor.group.add(arrow);
    
    return { label: visibleLabel, marker };
  };
  
  // Create all labels with connecting lines
  const labelObjects = [];
  for (let i = 0; i < anchorPoints.length; i++) {
    const labelObj = createLabel(
      labelTexts[i],
      anchorPoints[i],
      labelPositions[i],
      labelUrls[i]
    );
    labelObjects.push(labelObj);
  }
  
  // ADDED: Load and add Burj Khalifa model to the center of the postcard
  let burjModel = null;
  try {
    burjModel = await loadBurjKhalifaModel();
    
    // Position at exact center, slightly above postcard for better visibility
    burjModel.position.set(0, 0, 0.05); // Small Z offset so it's clearly above the postcard
    
    // Store original values for stability
    burjModel.userData.originalPosition = new THREE.Vector3(0, 0, 0.05);
    burjModel.userData.baseRotation = 0; // For spinning animation
    
    // Add to anchor group
    anchor.group.add(burjModel);
    
    // Add rotation animation (only spinning around its own vertical axis)
    burjModel.userData.animation = {
      rotationSpeed: 0.01  // Good rotation speed to see architectural details
    };
    
    console.log('Burj Khalifa model added - will always point toward sky');
  } catch (error) {
    console.error('Failed to load Burj Khalifa model:', error);
  }
  
  // IMPROVED: Add window resize handler with debouncing
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    }, 200);
  });
  
  // SIMPLIFIED: Better interaction handling
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  
  // Debug log function
  const logDebug = (message) => {
    if (DEBUG_MODE) {
      console.log(message);
    }
  };
  
  // Simplified URL handler
  const handleLabelClick = (url) => {
    logDebug("Opening URL: " + url);
    
    try {
      // Simple and reliable method
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      logDebug("Error opening URL: " + e.message);
      // Fallback
      window.location.href = url;
    }
  };
  
  // Simplified click/tap handler
  const handleClick = (event) => {
    event.preventDefault();
    
    // Get coordinates
    let clientX, clientY;
    
    if (event.type === 'touchend' && event.changedTouches) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else if (event.type === 'click') {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return;
    }
    
    // Convert to normalized device coordinates
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to find intersections
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes);
    
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      
      if (clickedObject.userData.url && clickedObject.userData.isClickable) {
        // Subtle tap feedback animation
        clickedObject.scale.set(1.05, 1.05, 1.05);
        setTimeout(() => {
          clickedObject.scale.set(0.98, 0.98, 0.98);
          setTimeout(() => {
            clickedObject.scale.set(1, 1, 1);
          }, 100);
        }, 100);
        
        // Open URL
        handleLabelClick(clickedObject.userData.url);
        
        logDebug("Clicked label: " + clickedObject.userData.url);
      }
    }
  };
  
  // Get container and set up simplified event listeners
  const arContainer = document.querySelector("#ar-container");
  
  // Add both touch and click events (browser will use appropriate one)
  arContainer.addEventListener("click", handleClick, { passive: false });
  arContainer.addEventListener("touchend", handleClick, { passive: false });
  
  // Create debug panel if needed
  if (DEBUG_MODE) {
    const debugPanel = document.createElement("div");
    debugPanel.style.position = "absolute";
    debugPanel.style.top = "10px";
    debugPanel.style.right = "10px";
    debugPanel.style.width = "250px";
    debugPanel.style.maxHeight = "30%";
    debugPanel.style.backgroundColor = "rgba(0,0,0,0.7)";
    debugPanel.style.color = "white";
    debugPanel.style.padding = "10px";
    debugPanel.style.fontFamily = "monospace";
    debugPanel.style.fontSize = "12px";
    debugPanel.style.zIndex = "1000";
    debugPanel.style.overflowY = "auto";
    debugPanel.style.borderRadius = "5px";
    debugPanel.innerHTML = "<div>Debug Messages:</div>";
    debugPanel.id = "debug-panel";
    arContainer.appendChild(debugPanel);
  }

  // MODIFIED: Scanning UI without white border, only blue elements
  function createScanningUI() {
    const scanningUI = document.createElement('div');
    scanningUI.id = 'scanning-ui';
    scanningUI.style.position = 'absolute';
    scanningUI.style.top = '0';
    scanningUI.style.left = '0';
    scanningUI.style.width = '100%';
    scanningUI.style.height = '100%';
    scanningUI.style.display = 'flex';
    scanningUI.style.flexDirection = 'column';
    scanningUI.style.justifyContent = 'center';
    scanningUI.style.alignItems = 'center';
    scanningUI.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    scanningUI.style.zIndex = '1000';
    
    // MODIFIED: Frame without white border
    const scanFrame = document.createElement('div');
    scanFrame.style.width = '90%';
    scanFrame.style.maxWidth = '600px';
    scanFrame.style.aspectRatio = '1/1';
    scanFrame.style.position = 'relative';
    // Removed the white border
    scanFrame.style.borderRadius = '20px';
    scanFrame.style.boxShadow = '0 0 0 rgba(26, 115, 232, 0.7)';
    scanFrame.style.animation = 'pulse 2s infinite';
    
    // Add scanning corners for visual effect - kept only the blue corners
    const corners = [];
    for (let i = 0; i < 4; i++) {
      const corner = document.createElement('div');
      corner.style.position = 'absolute';
      corner.style.width = '40px';
      corner.style.height = '40px';
      corner.style.borderColor = '#1a73e8';
      corner.style.borderWidth = '5px';
      
      switch(i) {
        case 0: // Top-left
          corner.style.top = '-5px';
          corner.style.left = '-5px';
          corner.style.borderTop = '5px solid #1a73e8';
          corner.style.borderLeft = '5px solid #1a73e8';
          break;
        case 1: // Top-right
          corner.style.top = '-5px';
          corner.style.right = '-5px';
          corner.style.borderTop = '5px solid #1a73e8';
          corner.style.borderRight = '5px solid #1a73e8';
          break;
        case 2: // Bottom-left
          corner.style.bottom = '-5px';
          corner.style.left = '-5px';
          corner.style.borderBottom = '5px solid #1a73e8';
          corner.style.borderLeft = '5px solid #1a73e8';
          break;
        case 3: // Bottom-right
          corner.style.bottom = '-5px';
          corner.style.right = '-5px';
          corner.style.borderBottom = '5px solid #1a73e8';
          corner.style.borderRight = '5px solid #1a73e8';
          break;
      }
      
      scanFrame.appendChild(corner);
      corners.push(corner);
    }
    
    // Add instruction text
    const instructionText = document.createElement('div');
    instructionText.textContent = 'Point camera at a Dubai postcard';
    instructionText.style.color = 'white';
    instructionText.style.fontSize = '24px';
    instructionText.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    instructionText.style.marginTop = '20px';
    instructionText.style.textAlign = 'center';
    instructionText.style.maxWidth = '90%';
    instructionText.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
    
    // Add scan line animation
    const scanLine = document.createElement('div');
    scanLine.style.position = 'absolute';
    scanLine.style.left = '0';
    scanLine.style.top = '10%';
    scanLine.style.width = '100%';
    scanLine.style.height = '4px';
    scanLine.style.backgroundColor = 'rgba(26, 115, 232, 0.8)';
    scanLine.style.animation = 'scanline 2s ease-in-out infinite';
    scanFrame.appendChild(scanLine);
    
    // Add CSS animation
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.7);
        }
        70% {
          box-shadow: 0 0 0 20px rgba(26, 115, 232, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(26, 115, 232, 0);
        }
      }
      
      @keyframes scanline {
        0% {
          top: 10%;
        }
        50% {
          top: 90%;
        }
        100% {
          top: 10%;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add all elements to the UI
    scanningUI.appendChild(scanFrame);
    scanningUI.appendChild(instructionText);
    
    const arContainer = document.querySelector("#ar-container");
    arContainer.appendChild(scanningUI);
    
    return scanningUI;
  }
  
  // Create an instruction element that appears after detection
  const createInstructionsElement = () => {
    const instructionsEl = document.createElement("div");
    instructionsEl.id = "ar-instructions";
    instructionsEl.style.position = "absolute";
    instructionsEl.style.bottom = "20px";
    instructionsEl.style.left = "0";
    instructionsEl.style.right = "0";
    instructionsEl.style.textAlign = "center";
    instructionsEl.style.color = "white";
    instructionsEl.style.backgroundColor = "rgba(0,0,0,0.7)";
    instructionsEl.style.padding = "12px";
    instructionsEl.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    instructionsEl.style.fontSize = "16px";
    instructionsEl.style.zIndex = "999";
    instructionsEl.style.borderRadius = "8px";
    instructionsEl.style.margin = "0 auto";
    instructionsEl.style.maxWidth = "90%";
    instructionsEl.style.width = "400px";
    instructionsEl.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
    instructionsEl.innerHTML = "Tap on a label to learn more<br>Check out the Burj Khalifa model!";
    
    // Start with instructions hidden
    instructionsEl.style.opacity = "0";
    instructionsEl.style.transition = "opacity 0.5s ease-out";
    
    // Add the element to the container
    arContainer.appendChild(instructionsEl);
    
    return instructionsEl;
  };
  
  const instructionsEl = createInstructionsElement();
  
  // Start AR experience
  try {
    // Reference to the scanning UI
    const scanningUI = document.getElementById('scanning-ui');
    
    // Listen for target found event
    anchor.onTargetFound = () => {
      // Hide scanning UI with fade animation
      scanningUI.style.opacity = "0";
      scanningUI.style.transition = "opacity 0.5s ease-out";
      setTimeout(() => {
        scanningUI.style.display = "none";
      }, 500);
      
      // ADDED: Animate Burj Khalifa to appear when target is found
      if (burjModel) {
        // Set initial scale to very small
        burjModel.scale.set(0.01, 0.01, 0.01);
          
        // Create simple grow animation
        const duration = 1000;
        const startTime = Date.now();
        const targetScale = 1.0;
          
        const growAnimation = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
            
          // Simple ease-out formula
          const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            
          // Set scale based on progress
          burjModel.scale.set(
            targetScale * easeOutProgress,
            targetScale * easeOutProgress,
            targetScale * easeOutProgress
          );
            
          // Reset position to original
          if (burjModel.userData.originalPosition) {
            burjModel.position.copy(burjModel.userData.originalPosition);
          }
            
          // Continue animation if not complete
          if (progress < 1) {
            requestAnimationFrame(growAnimation);
          }
        };
          
        // Start growth animation
        growAnimation();
      }
      
      // Show instructions
      setTimeout(() => {
        instructionsEl.style.opacity = "1";
        
        // Hide instructions after some time
        setTimeout(() => {
          instructionsEl.style.opacity = "0";
          
          // Remove from DOM after fade out
          setTimeout(() => {
            if (instructionsEl.parentNode) {
              instructionsEl.parentNode.removeChild(instructionsEl);
            }
          }, 500);
        }, 5000); // Show instructions for 5 seconds
      }, 1000); // Wait 1 second before showing instructions
    };
    
    // Handle target lost event
    anchor.onTargetLost = () => {
      // Show scanning UI again
      scanningUI.style.display = "flex";
      setTimeout(() => {
        scanningUI.style.opacity = "1";
      }, 10);
    };
    
    // Animation loop
    const clock = new THREE.Clock();
    
    // Start tracking and rendering
    await mindarThree.start();
    
    // Animation loop
    renderer.setAnimationLoop(() => {
      // Update time
      const elapsedTime = clock.getElapsedTime();
      
      // Animate marker pulses
      labelObjects.forEach(obj => {
        if (obj.marker && obj.marker.userData.animationData) {
          const data = obj.marker.userData.animationData;
          
          // Update animation time with unique offset
          data.time += 0.02;
          
          // Pulse scale
          const scale = 1 + 0.3 * Math.sin(data.time * 2);
          data.pulse.scale.set(scale, scale, scale);
          
          // Pulse opacity
          data.pulse.material.opacity = 0.5 * (0.5 + 0.5 * Math.sin(data.time * 2));
        }
      });
      
      // FIXED: Building rotation - clean and stable
      if (burjModel && burjModel.userData.animation) {
        // STEP 1: Keep building anchored to postcard center
        if (burjModel.userData.originalPosition) {
          burjModel.position.copy(burjModel.userData.originalPosition);
        }
        
        // STEP 2: Set building to point up from postcard (perpendicular to postcard surface)
        // This makes the building stand upright relative to the postcard
        burjModel.rotation.x = Math.PI / 2; // Point up from postcard surface
        burjModel.rotation.z = 0; // No tilt
        
        // STEP 3: ONLY spin around the building's local up axis (Y-axis after the X rotation)
        // This creates clean spinning without wobbling
        burjModel.userData.baseRotation += burjModel.userData.animation.rotationSpeed;
        burjModel.rotation.y = burjModel.userData.baseRotation;
      }
      
      // Render the scene
      renderer.render(scene, camera);
    });
  } catch (error) {
    console.error("AR initialization error:", error);
    
    // Show error message to user
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "absolute";
    errorDiv.style.top = "50%";
    errorDiv.style.left = "50%";
    errorDiv.style.transform = "translate(-50%, -50%)";
    errorDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    errorDiv.style.color = "white";
    errorDiv.style.padding = "20px";
    errorDiv.style.borderRadius = "10px";
    errorDiv.style.textAlign = "center";
    errorDiv.style.zIndex = "2000";
    errorDiv.style.maxWidth = "80%";
    errorDiv.innerHTML = `
      <h3 style="margin-top:0">AR Initialization Failed</h3>
      <p>We couldn't start the AR experience.</p>
      <p>Please ensure:</p>
      <ul style="text-align:left">
        <li>Your device supports WebAR</li>
        <li>You've granted camera permissions</li>
        <li>You're using a modern browser</li>
      </ul>
      <button id="retry-button" style="padding:10px 20px; background:#1a73e8; border:none; color:white; border-radius:5px; margin-top:10px; cursor:pointer">Retry</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Allow user to retry
    document.getElementById("retry-button").addEventListener("click", () => {
      window.location.reload();
    });
  }

  // Clean up function to stop AR when page is unloaded
  window.addEventListener("beforeunload", () => {
    if (mindarThree) {
      mindarThree.stop();
    }
  });
});
