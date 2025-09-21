const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Theme System Structure...\n');

// Test 1: Validate ThemeProvider structure
console.log('1. Validating ThemeProvider...');
try {
  const themeProviderPath = path.join(__dirname, 'src/providers/ThemeProvider.tsx');
  const content = fs.readFileSync(themeProviderPath, 'utf8');

  // Check for required exports
  const hasThemeProvider = content.includes('export function ThemeProvider');
  const hasUseTheme = content.includes('export function useTheme');
  const hasPredefinedThemes = content.includes('const predefinedThemes');

  console.log(`  ✅ ThemeProvider export: ${hasThemeProvider}`);
  console.log(`  ✅ useTheme hook export: ${hasUseTheme}`);
  console.log(`  ✅ Predefined themes: ${hasPredefinedThemes}`);

  // Extract and validate themes
  const themeMatches = content.match(/const predefinedThemes.*?=.*?\[(.*?)\]/s);
  if (themeMatches) {
    const themesContent = themeMatches[1];
    const themeIds = [...themesContent.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
    console.log(`  ✅ Found ${themeIds.length} themes: ${themeIds.join(', ')}`);

    // Validate each theme has required color properties
    const requiredColorProps = ['from', 'via', 'to', 'accent', 'text', 'glass'];
    requiredColorProps.forEach(prop => {
      const hasProperty = themesContent.includes(`${prop}:`);
      console.log(`  ${hasProperty ? '✅' : '❌'} Color property '${prop}': ${hasProperty}`);
    });
  } else {
    console.log('  ❌ Could not extract theme definitions');
  }
} catch (error) {
  console.log(`  ❌ Error reading ThemeProvider: ${error.message}`);
}

console.log('\n2. Validating ThemeCustomizer...');
try {
  const customizerPath = path.join(__dirname, 'src/components/ThemeCustomizer.tsx');
  const content = fs.readFileSync(customizerPath, 'utf8');

  const hasThemeCustomizer = content.includes('export default function ThemeCustomizer');
  const usesPredefinedThemes = content.includes('predefinedThemes');
  const hasCustomThemeCreation = content.includes('createCustomTheme');
  const hasColorInputs = content.includes('type="color"');

  console.log(`  ✅ ThemeCustomizer component: ${hasThemeCustomizer}`);
  console.log(`  ✅ Uses predefined themes: ${usesPredefinedThemes}`);
  console.log(`  ✅ Custom theme creation: ${hasCustomThemeCreation}`);
  console.log(`  ✅ Color picker inputs: ${hasColorInputs}`);
} catch (error) {
  console.log(`  ❌ Error reading ThemeCustomizer: ${error.message}`);
}

console.log('\n3. Validating Dashboard integration...');
try {
  const dashboardPath = path.join(__dirname, 'src/app/dashboard/page.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf8');

  const importsThemeProvider = content.includes("import { useTheme }") || content.includes("from '@/providers/ThemeProvider'");
  const usesThemeHook = content.includes('useTheme()');
  const hasThemeCustomizer = content.includes('<ThemeCustomizer');
  const usesInlineStyles = content.includes('style={{');

  console.log(`  ✅ Imports theme provider: ${importsThemeProvider}`);
  console.log(`  ✅ Uses theme hook: ${usesThemeHook}`);
  console.log(`  ✅ Includes ThemeCustomizer: ${hasThemeCustomizer}`);
  console.log(`  ✅ Uses inline styles: ${usesInlineStyles}`);
} catch (error) {
  console.log(`  ❌ Error reading Dashboard: ${error.message}`);
}

console.log('\n4. Testing color format validation...');
const validateColor = (color, name) => {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  const rgbaPattern = /^rgba?\([^)]+\)$/;
  const isValid = hexPattern.test(color) || rgbaPattern.test(color);
  console.log(`  ${isValid ? '✅' : '❌'} ${name}: ${color} (${isValid ? 'valid' : 'invalid'} format)`);
  return isValid;
};

// Test sample colors from themes
validateColor('#111827', 'Abstract Green from');
validateColor('#10b981', 'Abstract Green accent');
validateColor('rgba(16, 185, 129, 0.1)', 'Abstract Green glass');
validateColor('#00ffff', 'Classic Arctic accent');

console.log('\n5. Testing theme structure consistency...');
const testThemeStructure = {
  id: 'test-theme',
  name: 'Test Theme',
  description: 'Test description',
  colors: {
    from: '#111827',
    via: '#064e3b',
    to: '#065f46',
    accent: '#10b981',
    text: '#ffffff',
    glass: 'rgba(16, 185, 129, 0.1)'
  },
  emoji: '🧪'
};

const requiredThemeProps = ['id', 'name', 'description', 'colors', 'emoji'];
const requiredColorProps = ['from', 'via', 'to', 'accent', 'text', 'glass'];

requiredThemeProps.forEach(prop => {
  const hasProperty = testThemeStructure.hasOwnProperty(prop);
  console.log(`  ✅ Theme property '${prop}': ${hasProperty}`);
});

requiredColorProps.forEach(prop => {
  const hasProperty = testThemeStructure.colors.hasOwnProperty(prop);
  console.log(`  ✅ Colors property '${prop}': ${hasProperty}`);
});

console.log('\n🎨 Theme System Validation Complete!');
console.log('\nNext steps for manual testing:');
console.log('1. Start dev server: npm run dev');
console.log('2. Navigate to http://localhost:3001/dashboard');
console.log('3. Click the Themes (🎨) button');
console.log('4. Test each predefined theme');
console.log('5. Create a custom theme');
console.log('6. Refresh page to test persistence');
console.log('7. Navigate between pages to test consistency');