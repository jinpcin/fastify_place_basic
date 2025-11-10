/**
 *  obj 에서 특정 키워드로 시작하거나 일치하는 항목 찾기.
 */
export function findKeyInObject(obj: any, keyToFind: string): any {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }

  // 현재 레벨에서 키가 특정 문자열로 시작하면 반환
  for (let key in obj) {
    if (obj.hasOwnProperty(key) && key.startsWith(keyToFind)) {
      return obj[key];
    }
  }

  // 중첩된 객체들을 재귀적으로 탐색
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findKeyInObject(obj[key], keyToFind);
      if (result !== undefined) {
        return result;
      }
    }
  }

  // 키를 찾지 못했을 경우
  return undefined;
}
