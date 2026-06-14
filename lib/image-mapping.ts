export const COURSE_IMAGES: Record<string, any> = {
  'assets/images/courses/royal_colombo.webp': require('../assets/images/courses/royal_colombo.webp'),
  'assets/images/courses/victoria_digana.webp': require('../assets/images/courses/victoria_digana.webp'),
  'assets/images/courses/nuwara_eliya.webp': require('../assets/images/courses/nuwara_eliya.webp'),
  'assets/images/courses/hambantota.webp': require('../assets/images/courses/hambantota.webp'),
  'assets/images/courses/trincomalee.webp': require('../assets/images/courses/trincomalee.webp'),
  'assets/images/courses/koggala.webp': require('../assets/images/courses/koggala.webp'),
  'assets/images/courses/diyathalawa.webp': require('../assets/images/courses/diyathalawa.webp'),
  'assets/images/courses/anuradhapura.webp': require('../assets/images/courses/anuradhapura.webp'),
};

export function getCourseImage(path: string) {
  return COURSE_IMAGES[path] || { uri: path };
}
