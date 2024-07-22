export function mergeWithCustomizer(objValue: any, srcValue: any): any {
  if (Array.isArray(objValue) || Array.isArray(srcValue)) {
    // we want arrays to be replaced, not merged
    return srcValue;
  }
}
