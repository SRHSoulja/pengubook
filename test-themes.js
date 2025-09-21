// Theme System Testing Script
// Run this in browser console on localhost:3001/dashboard

console.log('🎨 Starting comprehensive theme system testing...');

// Test 1: Check if ThemeProvider is available
console.log('\n1. Testing ThemeProvider availability...');
const themeContext = window.React?.useContext || null;
if (themeContext) {
  console.log('✅ React context system available');
} else {
  console.log('❌ React context system not available');
}

// Test 2: Check predefined themes structure
console.log('\n2. Testing predefined themes...');
const expectedThemes = [
  'abstract-green',
  'classic',
  'cyber-punk',
  'aurora',
  'sunset',
  'ocean',
  'neon-city'
];

console.log(`Expected ${expectedThemes.length} predefined themes:`, expectedThemes);

// Test 3: Check DOM theme application
console.log('\n3. Testing DOM theme application...');
const root = document.documentElement;
const currentTheme = root.getAttribute('data-theme');
console.log('Current theme attribute:', currentTheme);

const customProperties = [
  '--theme-from',
  '--theme-via',
  '--theme-to',
  '--theme-accent',
  '--theme-text',
  '--theme-glass'
];

customProperties.forEach(prop => {
  const value = root.style.getPropertyValue(prop);
  console.log(`${prop}: ${value || 'not set'}`);
});

// Test 4: Check body background
console.log('\n4. Testing body background...');
const bodyBackground = document.body.style.background;
console.log('Body background:', bodyBackground || 'not set');

// Test 5: Test theme customizer availability
console.log('\n5. Testing theme customizer...');
const themeButton = document.querySelector('button:has(span:contains("🎨"))') ||
                   Array.from(document.querySelectorAll('button')).find(btn =>
                     btn.textContent.includes('Themes') || btn.innerHTML.includes('🎨'));

if (themeButton) {
  console.log('✅ Theme customizer button found');
} else {
  console.log('❌ Theme customizer button not found');
}

// Test 6: Check localStorage persistence
console.log('\n6. Testing localStorage persistence...');
const savedTheme = localStorage.getItem('pengubook-theme');
if (savedTheme) {
  try {
    const parsed = JSON.parse(savedTheme);
    console.log('✅ Saved theme found:', parsed);
  } catch (e) {
    console.log('❌ Saved theme corrupted:', savedTheme);
  }
} else {
  console.log('ℹ️ No saved theme found (using default)');
}

console.log('\n🎨 Theme system testing complete!');
console.log('Manual tests to perform:');
console.log('1. Click the Themes button (🎨)');
console.log('2. Try selecting different predefined themes');
console.log('3. Create a custom theme with color pickers');
console.log('4. Refresh page and verify theme persists');
console.log('5. Navigate to different pages and verify theme consistency');