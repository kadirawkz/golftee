export const COURSE_IMAGES: Record<string, any> = {
  'assets/images/courses/royal_colombo.png': require('../assets/images/courses/royal_colombo.png'),
  'assets/images/courses/victoria_digana.png': require('../assets/images/courses/victoria_digana.png'),
  'assets/images/courses/nuwara_eliya.png': require('../assets/images/courses/nuwara_eliya.png'),
  'assets/images/courses/hambantota.png': require('../assets/images/courses/hambantota.png'),
  'assets/images/courses/trincomalee.png': require('../assets/images/courses/trincomalee.png'),
  'assets/images/courses/koggala.png': require('../assets/images/courses/koggala.png'),
  'assets/images/courses/diyathalawa.png': require('../assets/images/courses/diyathalawa.png'),
  'assets/images/courses/anuradhapura.png': require('../assets/images/courses/anuradhapura.png'),
};

export function getCourseImage(path: string) {
  return COURSE_IMAGES[path] || { uri: path };
}
