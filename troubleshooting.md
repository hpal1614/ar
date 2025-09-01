# AR Application Troubleshooting Guide

## Common Issues and Solutions

### 1. Camera Not Working
- **Issue**: Camera permission denied or not available
- **Solutions**:
  - Make sure you're accessing the app via HTTPS (not HTTP)
  - Grant camera permissions when prompted
  - Check browser settings to ensure camera access is allowed
  - Try a different browser (Chrome/Edge recommended for WebAR)

### 2. Target Image Not Detected
- **Issue**: The AR experience doesn't start when pointing at the postcard
- **Solutions**:
  - Ensure good lighting conditions
  - Hold the device steady and at an appropriate distance (30-60cm)
  - Make sure the entire postcard is visible in the camera view
  - The postcard should be flat and not bent
  - Print the postcard at a reasonable size (at least A5/half letter size)

### 3. 3D Model Not Loading
- **Issue**: Burj Khalifa model doesn't appear or shows as fallback cone
- **Solutions**:
  - Check browser console for errors (F12 → Console tab)
  - Ensure stable internet connection (model is 23MB)
  - Wait for the model to fully load (may take 10-30 seconds on slower connections)
  - Try refreshing the page

### 4. Labels Not Clickable
- **Issue**: Tapping on labels doesn't open links
- **Solutions**:
  - Make sure to tap directly on the label text
  - Try tapping slightly above or below the label
  - On mobile devices, ensure you're using a single tap (not long press)
  - Check if pop-up blocker is preventing links from opening

### 5. Performance Issues
- **Issue**: Choppy animation or low frame rate
- **Solutions**:
  - Close other browser tabs and applications
  - Ensure device has sufficient processing power
  - Try reducing the browser window size
  - Disable other browser extensions that might interfere

## Debug Mode

To enable debug mode and see diagnostic information:
1. Add `?debug=true` to the URL (e.g., `http://yoursite.com/index.html?debug=true`)
2. Press Ctrl+D to toggle the debug panel
3. Check the debug panel for system compatibility issues

## Browser Compatibility

### Recommended Browsers:
- Chrome (Android/Desktop) - Version 80+
- Edge (Android/Desktop) - Version 80+
- Safari (iOS) - Version 14.5+

### Not Supported:
- Internet Explorer
- Firefox on iOS
- Most browsers on iOS except Safari (due to iOS restrictions)

## Testing Your Setup

1. **Test Camera Access**: Visit https://webrtc.github.io/samples/src/content/getusermedia/gum/
2. **Test WebGL Support**: Visit https://get.webgl.org/
3. **Test AR Support**: Visit https://immersive-web.github.io/webxr-samples/

## Contact Support

If you continue to experience issues:
1. Take a screenshot of any error messages
2. Note your device model and browser version
3. Check the browser console for errors (F12 → Console)
4. Visit the project repository for updates and issue reporting