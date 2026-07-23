/**
 * Determines the optimal image fit mode CSS classes based on clothing item category.
 * For Shoes and Accessories, uses object-contain with padding to prevent cropping.
 * For Tops, Bottoms, and Outerwear, uses object-cover.
 * @param {string} category 
 * @param {string} paddingClass Optional padding class for contain mode
 * @returns {string} Tailwind CSS class string
 */
export function getItemImageFitClass(category = '', paddingClass = 'p-3') {
  const cat = (category || '').toLowerCase();
  if (['shoes', 'accessories'].includes(cat)) {
    return `object-contain ${paddingClass}`;
  }
  return 'object-cover';
}
